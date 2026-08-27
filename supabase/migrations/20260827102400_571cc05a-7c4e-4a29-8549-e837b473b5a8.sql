GRANT EXECUTE ON FUNCTION public.is_protected_owner(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_protected_owner(uuid) FROM anon, public;

DROP POLICY IF EXISTS attachments_read ON storage.objects;
CREATE POLICY attachments_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'work-attachments' AND public.has_permission(auth.uid(), 'tasks', 'view'));

DROP POLICY IF EXISTS attachments_update ON storage.objects;
CREATE POLICY attachments_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'work-attachments' AND public.has_permission(auth.uid(), 'tasks', 'edit'))
  WITH CHECK (bucket_id = 'work-attachments' AND public.has_permission(auth.uid(), 'tasks', 'edit'));