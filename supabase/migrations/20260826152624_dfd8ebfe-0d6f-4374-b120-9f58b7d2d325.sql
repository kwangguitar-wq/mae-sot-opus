CREATE OR REPLACE FUNCTION public.owner_email()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 'kwangtava@hotmail.com'::text $$;

-- ปิดการเรียกใช้จากผู้ที่ยังไม่ล็อกอินและจากทุก role โดยปริยาย
REVOKE ALL ON FUNCTION public.owner_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_protected_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_owner_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC, anon;

-- แอปเรียกผ่านผู้ใช้ที่ล็อกอินแล้วเท่านั้น
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;