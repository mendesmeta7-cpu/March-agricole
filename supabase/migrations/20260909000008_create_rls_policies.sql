-- Migration 8: Politiques de Sécurité Row Level Security (RLS)
-- Date: 2026-09-09

-- 1. Activation de RLS sur toutes les tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Politiques pour les référentiels géographiques (Lecture publique/authentifiée)
CREATE POLICY "countries_select_all" ON public.countries
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "provinces_select_all" ON public.provinces
    FOR SELECT USING (TRUE);

CREATE POLICY "cities_select_all" ON public.cities
    FOR SELECT USING (TRUE);

-- 3. Politiques profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.current_user_role() = 'admin');

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 4. Politiques companies
CREATE POLICY "companies_select_active" ON public.companies
    FOR SELECT USING (
        is_active = TRUE 
        OR public.is_company_member(id) 
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "companies_insert_auth" ON public.companies
    FOR INSERT WITH CHECK (
        auth.uid() = created_by 
        AND (public.current_user_role() IN ('company', 'admin'))
    );

CREATE POLICY "companies_update_owner_or_admin" ON public.companies
    FOR UPDATE USING (
        public.is_company_admin_or_owner(id) 
        OR public.current_user_role() = 'admin'
    );

-- 5. Politiques company_members
CREATE POLICY "company_members_select" ON public.company_members
    FOR SELECT USING (
        public.is_company_member(company_id) 
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "company_members_manage" ON public.company_members
    FOR ALL USING (
        public.is_company_admin_or_owner(company_id) 
        OR public.current_user_role() = 'admin'
    );

-- 6. Politiques resellers
CREATE POLICY "resellers_select" ON public.resellers
    FOR SELECT USING (
        auth.uid() = id 
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.reseller_id = resellers.id 
              AND public.is_company_member(o.company_id)
        )
    );

CREATE POLICY "resellers_insert_own" ON public.resellers
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "resellers_update_own" ON public.resellers
    FOR UPDATE USING (auth.uid() = id);

-- 7. Politiques products (Catalogue)
CREATE POLICY "products_select_active" ON public.products
    FOR SELECT USING (is_active = TRUE OR public.current_user_role() = 'admin');

CREATE POLICY "products_admin_manage" ON public.products
    FOR ALL USING (public.current_user_role() = 'admin');

-- 8. Politiques company_products
CREATE POLICY "company_products_select" ON public.company_products
    FOR SELECT USING (
        is_active = TRUE 
        OR public.is_company_member(company_id) 
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "company_products_manage" ON public.company_products
    FOR ALL USING (
        public.is_company_member(company_id) 
        OR public.current_user_role() = 'admin'
    );

-- 9. Politiques productions
CREATE POLICY "productions_select" ON public.productions
    FOR SELECT USING (
        (is_public = TRUE AND status IN ('planned', 'growing', 'harvested'))
        OR public.is_company_member(company_id)
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "productions_manage" ON public.productions
    FOR ALL USING (
        public.is_company_member(company_id) 
        OR public.current_user_role() = 'admin'
    );

-- 10. Politiques demands
CREATE POLICY "demands_select" ON public.demands
    FOR SELECT USING (
        auth.uid() = reseller_id
        OR status = 'active'
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "demands_insert" ON public.demands
    FOR INSERT WITH CHECK (
        auth.uid() = reseller_id 
        AND public.current_user_role() = 'reseller'
    );

CREATE POLICY "demands_update" ON public.demands
    FOR UPDATE USING (
        auth.uid() = reseller_id 
        OR public.current_user_role() = 'admin'
    );

-- 11. Politiques campaigns
CREATE POLICY "campaigns_select" ON public.campaigns
    FOR SELECT USING (
        status = 'active'
        OR public.is_company_member(company_id)
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "campaigns_manage" ON public.campaigns
    FOR ALL USING (
        public.is_company_member(company_id) 
        OR public.current_user_role() = 'admin'
    );

-- 12. Politiques campaign_delivery_zones
CREATE POLICY "campaign_delivery_zones_select" ON public.campaign_delivery_zones
    FOR SELECT USING (TRUE);

CREATE POLICY "campaign_delivery_zones_manage" ON public.campaign_delivery_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c 
            WHERE c.id = campaign_delivery_zones.campaign_id 
              AND (public.is_company_member(c.company_id) OR public.current_user_role() = 'admin')
        )
    );

-- 13. Politiques orders
CREATE POLICY "orders_select" ON public.orders
    FOR SELECT USING (
        reseller_id = auth.uid()
        OR public.is_company_member(company_id)
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "orders_insert" ON public.orders
    FOR INSERT WITH CHECK (
        reseller_id = auth.uid() 
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "orders_update" ON public.orders
    FOR UPDATE USING (
        reseller_id = auth.uid()
        OR public.is_company_member(company_id)
        OR public.current_user_role() = 'admin'
    );

-- 14. Politiques order_items
CREATE POLICY "order_items_select" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_items.order_id 
              AND (o.reseller_id = auth.uid() OR public.is_company_member(o.company_id) OR public.current_user_role() = 'admin')
        )
    );

CREATE POLICY "order_items_insert" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_items.order_id 
              AND (o.reseller_id = auth.uid() OR public.current_user_role() = 'admin')
        )
    );

-- 15. Politiques stock_reservations
CREATE POLICY "stock_reservations_select" ON public.stock_reservations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c 
            WHERE c.id = stock_reservations.campaign_id 
              AND (public.is_company_member(c.company_id) OR public.current_user_role() = 'admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = stock_reservations.order_id 
              AND o.reseller_id = auth.uid()
        )
    );

-- 16. Politiques audit_logs
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT USING (
        actor_id = auth.uid() 
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT WITH CHECK (TRUE);
