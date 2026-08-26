ALTER TABLE public.work_assignees
  ADD CONSTRAINT work_assignees_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;