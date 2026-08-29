CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = _user_id AND up.module = _module AND (
      (_action = 'view' AND up.can_view) OR
      (_action = 'create' AND up.can_create) OR
      (_action = 'edit' AND up.can_edit) OR
      (_action = 'delete' AND up.can_delete)
    )
  )
$$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION private.has_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_permission(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.has_role(_user_id, _role)
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.has_permission(_user_id, _module, _action)
$$;

DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);