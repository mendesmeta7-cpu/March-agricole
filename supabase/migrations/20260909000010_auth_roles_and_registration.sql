-- Migration 10: Sécurisation des Rôles, Prévention de l'Escalade et Bootstrapping Entreprise
-- Date: 2026-09-09

-- 1. Trigger de vérification à la création de profil (Empêche l'auto-attribution du rôle admin)
CREATE OR REPLACE FUNCTION public.check_profile_creation_role()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_role VARCHAR;
BEGIN
    IF NEW.role = 'admin' THEN
        IF auth.uid() IS NOT NULL THEN
            SELECT role INTO v_actor_role FROM public.profiles WHERE id = auth.uid();
            IF v_actor_role IS NULL OR v_actor_role <> 'admin' THEN
                RAISE EXCEPTION 'Action interdite : auto-attribution du rôle administrateur non autorisée.';
            END IF;
        ELSIF COALESCE(auth.role(), '') = 'authenticated' THEN
            RAISE EXCEPTION 'Action interdite : auto-attribution du rôle administrateur non autorisée.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_profile_creation_role ON public.profiles;
CREATE TRIGGER trg_check_profile_creation_role
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_creation_role();

-- 2. Trigger de protection contre l'escalade de privilèges (Empêche la modification frauduleuse du rôle)
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_role VARCHAR;
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF auth.uid() IS NOT NULL THEN
            SELECT role INTO v_actor_role FROM public.profiles WHERE id = auth.uid();
            IF v_actor_role IS NULL OR v_actor_role <> 'admin' THEN
                RAISE EXCEPTION 'Action interdite : modification non autorisée du rôle utilisateur.';
            END IF;
        ELSIF COALESCE(auth.role(), '') = 'authenticated' THEN
            RAISE EXCEPTION 'Action interdite : modification non autorisée du rôle utilisateur.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 3. Trigger d'assignation automatique du créateur comme Owner dans company_members (BR-COMP-05)
CREATE OR REPLACE FUNCTION public.handle_new_company_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (company_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_new_company_created ON public.companies;
CREATE TRIGGER trg_handle_new_company_created
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_company_created();

-- 4. Ajustement de la politique RLS sur company_members pour intégrer le créateur de l'entreprise
DROP POLICY IF EXISTS "company_members_manage" ON public.company_members;
CREATE POLICY "company_members_manage" ON public.company_members
    FOR ALL USING (
        public.is_company_admin_or_owner(company_id) 
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.companies c 
            WHERE c.id = company_members.company_id 
              AND c.created_by = auth.uid()
        )
    );

-- 5. Trigger d'initialisation automatique post-signup depuis auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_role VARCHAR;
    v_full_name VARCHAR;
    v_phone VARCHAR;
    v_country_id UUID;
    v_province_id UUID;
    v_city VARCHAR;
    v_company_name VARCHAR;
    v_company_slug VARCHAR;
    v_company_description TEXT;
    v_company_address TEXT;
    v_company_logo_url TEXT;
    v_business_name VARCHAR;
    v_reseller_type VARCHAR;
    v_delivery_address TEXT;
    v_new_company_id UUID;
BEGIN
    v_role := (NEW.raw_user_meta_data->>'role');
    v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Utilisateur');
    v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

    -- Sécurité : auto-attribution admin strictement interdite
    IF v_role = 'admin' OR v_role IS NULL OR v_role NOT IN ('company', 'reseller') THEN
        v_role := 'reseller'; -- Rôle par défaut
    END IF;

    -- Insertion ou mise à jour dans profiles
    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (NEW.id, v_role, v_full_name, v_phone)
    ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

    -- Si rôle company
    IF v_role = 'company' AND (NEW.raw_user_meta_data->>'company_name') IS NOT NULL THEN
        v_company_name := TRIM(NEW.raw_user_meta_data->>'company_name');
        v_company_slug := COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'company_slug'), ''),
            LOWER(REGEXP_REPLACE(v_company_name, '[^a-zA-Z0-9]+', '-', 'g'))
        ) || '-' || SUBSTRING(NEW.id::text, 1, 6);
        v_company_description := NULLIF(TRIM(NEW.raw_user_meta_data->>'company_description'), '');
        v_company_address := NULLIF(TRIM(NEW.raw_user_meta_data->>'company_address'), '');
        v_company_logo_url := NULLIF(TRIM(NEW.raw_user_meta_data->>'company_logo_url'), '');
        
        BEGIN
            v_country_id := (NEW.raw_user_meta_data->>'country_id')::UUID;
            v_province_id := (NEW.raw_user_meta_data->>'province_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_country_id := NULL;
            v_province_id := NULL;
        END;

        v_city := NULLIF(TRIM(NEW.raw_user_meta_data->>'city'), '');

        IF v_country_id IS NOT NULL AND v_province_id IS NOT NULL THEN
            INSERT INTO public.companies (
                name, slug, description, address, phone, email,
                country_id, province_id, city, logo_url, created_by
            ) VALUES (
                v_company_name, v_company_slug, v_company_description, v_company_address, v_phone, NEW.email,
                v_country_id, v_province_id, v_city, v_company_logo_url, NEW.id
            ) RETURNING id INTO v_new_company_id;
        END IF;

    -- Si rôle reseller
    ELSIF v_role = 'reseller' AND (NEW.raw_user_meta_data->>'country_id') IS NOT NULL THEN
        BEGIN
            v_country_id := (NEW.raw_user_meta_data->>'country_id')::UUID;
            v_province_id := (NEW.raw_user_meta_data->>'province_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_country_id := NULL;
            v_province_id := NULL;
        END;

        v_city := NULLIF(TRIM(NEW.raw_user_meta_data->>'city'), '');
        v_business_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'business_name'), ''), v_full_name);
        v_reseller_type := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'reseller_type'), ''), 'wholesaler');
        IF v_reseller_type NOT IN ('wholesaler', 'semi_wholesaler', 'retailer', 'processor') THEN
            v_reseller_type := 'wholesaler';
        END IF;
        v_delivery_address := NULLIF(TRIM(NEW.raw_user_meta_data->>'delivery_address'), '');

        IF v_country_id IS NOT NULL AND v_province_id IS NOT NULL THEN
            INSERT INTO public.resellers (
                id, business_name, country_id, province_id, city, delivery_address, reseller_type
            ) VALUES (
                NEW.id, v_business_name, v_country_id, v_province_id, v_city, v_delivery_address, v_reseller_type
            ) ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
