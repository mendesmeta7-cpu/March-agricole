-- Migration 9: Configuration des Buckets Supabase Storage et Politiques
-- Date: 2026-09-09

-- 1. Création des buckets de stockage dans storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'public-assets', 
        'public-assets', 
        TRUE, 
        5242880, -- 5 MB
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    ),
    (
        'private-documents', 
        'private-documents', 
        FALSE, 
        10485760, -- 10 MB
        ARRAY['image/jpeg', 'image/png', 'application/pdf']
    )
ON CONFLICT (id) DO UPDATE 
SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Politiques RLS sur storage.objects

-- Bucket public-assets : Lecture publique
CREATE POLICY "public_assets_read_all" ON storage.objects
    FOR SELECT USING (bucket_id = 'public-assets');

-- Bucket public-assets : Écriture authentifiée
CREATE POLICY "public_assets_insert_auth" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'public-assets' 
        AND auth.role() = 'authenticated'
    );

-- Bucket public-assets : Modification/Suppression par le propriétaire ou admin
CREATE POLICY "public_assets_update_owner" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'public-assets' 
        AND (auth.uid() = owner OR public.current_user_role() = 'admin')
    );

CREATE POLICY "public_assets_delete_owner" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'public-assets' 
        AND (auth.uid() = owner OR public.current_user_role() = 'admin')
    );

-- Bucket private-documents : Lecture réservée au propriétaire et admin
CREATE POLICY "private_docs_read_owner_or_admin" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'private-documents' 
        AND (auth.uid() = owner OR public.current_user_role() = 'admin')
    );

-- Bucket private-documents : Écriture authentifiée
CREATE POLICY "private_docs_insert_auth" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'private-documents' 
        AND auth.role() = 'authenticated'
    );

-- Bucket private-documents : Modification/Suppression par le propriétaire ou admin
CREATE POLICY "private_docs_update_owner" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'private-documents' 
        AND (auth.uid() = owner OR public.current_user_role() = 'admin')
    );

CREATE POLICY "private_docs_delete_owner" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'private-documents' 
        AND (auth.uid() = owner OR public.current_user_role() = 'admin')
    );
