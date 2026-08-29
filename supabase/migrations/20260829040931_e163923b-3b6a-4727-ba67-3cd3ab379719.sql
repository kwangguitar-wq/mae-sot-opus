-- profiles: no longer world-readable by every signed-in user
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_permission(auth.uid(), 'tasks', 'view')
);

-- user_roles: only own row or admins
DROP POLICY IF EXISTS roles_select ON public.user_roles;
CREATE POLICY roles_select ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- user_permissions: only own row or admins
DROP POLICY IF EXISTS perms_select ON public.user_permissions;
CREATE POLICY perms_select ON public.user_permissions
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- is_protected_owner is an admin-only helper; signed-in users must not call it
REVOKE EXECUTE ON FUNCTION public.is_protected_owner(uuid) FROM authenticated, anon, public;