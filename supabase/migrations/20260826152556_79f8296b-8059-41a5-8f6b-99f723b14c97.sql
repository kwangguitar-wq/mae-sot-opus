-- ===== Owner-level admin protection =====
CREATE OR REPLACE FUNCTION public.owner_email()
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT 'kwangtava@hotmail.com'::text $$;

CREATE OR REPLACE FUNCTION public.is_protected_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id AND lower(u.email) = public.owner_email()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_protected_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_email() TO authenticated;

-- ผูกสิทธิ์ผู้ดูแลระบบให้บัญชีเจ้าของที่มีอยู่แล้ว (ไม่สร้างบัญชีซ้ำ)
INSERT INTO public.profiles (id, full_name, position)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 'ผู้ดูแลระบบ'
FROM auth.users u
WHERE lower(u.email) = public.owner_email()
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = public.owner_email()
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles r
WHERE r.role <> 'admin'::app_role AND public.is_protected_owner(r.user_id);

-- ป้องกันการลดสิทธิ์บัญชีเจ้าของ
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.is_protected_owner(OLD.user_id) AND OLD.role = 'admin'::app_role THEN
      RETURN NULL; -- ไม่อนุญาตให้ลบบทบาทผู้ดูแลของบัญชีเจ้าของ
    END IF;
    RETURN OLD;
  END IF;

  IF public.is_protected_owner(NEW.user_id) AND NEW.role <> 'admin'::app_role THEN
    RETURN NULL; -- ไม่อนุญาตให้กำหนดบทบาทต่ำกว่าผู้ดูแลให้บัญชีเจ้าของ
  END IF;

  IF TG_OP = 'UPDATE' AND public.is_protected_owner(OLD.user_id) AND OLD.role = 'admin'::app_role THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_owner_role ON public.user_roles;
CREATE TRIGGER trg_protect_owner_role
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();

-- ให้บัญชีเจ้าของได้สิทธิ์ผู้ดูแลอัตโนมัติเมื่อสมัคร/สร้างใหม่
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, position)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), '')
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';

  IF lower(NEW.email) = public.owner_email() OR admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES
      (NEW.id, 'dashboard', true, false, false, false),
      (NEW.id, 'calendar', true, false, false, false),
      (NEW.id, 'tasks', true, true, true, false),
      (NEW.id, 'notifications', true, false, false, false)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;