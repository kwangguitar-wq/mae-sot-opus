-- ===== Roles & helpers =====
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  position TEXT DEFAULT '',
  avatar_url TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = _user_id AND up.module = _module AND (
      (_action = 'view' AND up.can_view) OR
      (_action = 'create' AND up.can_create) OR
      (_action = 'edit' AND up.can_edit) OR
      (_action = 'delete' AND up.can_delete)
    )
  )
$$;

-- ===== Master data =====
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#2563eb',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  address TEXT DEFAULT '',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- ===== Work items =====
CREATE TYPE public.work_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.work_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  location_text TEXT DEFAULT '',
  priority public.work_priority NOT NULL DEFAULT 'medium',
  status public.work_status NOT NULL DEFAULT 'pending',
  note TEXT DEFAULT '',
  attachment_url TEXT,
  attachment_name TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_items_date ON public.work_items (work_date);
CREATE INDEX idx_work_items_status ON public.work_items (status);
CREATE INDEX idx_work_items_category ON public.work_items (category_id);
CREATE INDEX idx_work_items_is_demo ON public.work_items (is_demo);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_items TO authenticated;
GRANT ALL ON public.work_items TO service_role;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.work_assignees (
  work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (work_item_id, user_id)
);
CREATE INDEX idx_work_assignees_user ON public.work_assignees (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_assignees TO authenticated;
GRANT ALL ON public.work_assignees TO service_role;
ALTER TABLE public.work_assignees ENABLE ROW LEVEL SECURITY;

-- ===== Notifications / audit / settings =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  work_item_id UUID REFERENCES public.work_items(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ===== RLS policies =====
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_write_admin" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "perms_select" ON public.user_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "perms_write_admin" ON public.user_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_write" ON public.categories FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'settings', 'edit')) WITH CHECK (public.has_permission(auth.uid(), 'settings', 'edit'));

CREATE POLICY "locations_select" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "locations_write" ON public.locations FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'settings', 'edit')) WITH CHECK (public.has_permission(auth.uid(), 'settings', 'edit'));

CREATE POLICY "work_select" ON public.work_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "work_insert" ON public.work_items FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'tasks', 'create'));
CREATE POLICY "work_update" ON public.work_items FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'tasks', 'edit')) WITH CHECK (public.has_permission(auth.uid(), 'tasks', 'edit'));
CREATE POLICY "work_delete" ON public.work_items FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'tasks', 'delete'));

CREATE POLICY "assignees_select" ON public.work_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignees_insert" ON public.work_assignees FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'tasks', 'create') OR public.has_permission(auth.uid(), 'tasks', 'edit'));
CREATE POLICY "assignees_delete" ON public.work_assignees FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'tasks', 'edit'));

CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'audit', 'view'));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_write_admin" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Triggers =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_work_updated BEFORE UPDATE ON public.work_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup; first user becomes admin with full permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, position)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), '');

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Seed master data (default categories per spec + sample locations) =====
INSERT INTO public.categories (name, color, is_default) VALUES
  ('ข่าวประชาสัมพันธ์', '#2563eb', true),
  ('เผยแพร่ Facebook/Website/Online', '#7c3aed', true),
  ('ถ่ายภาพ/วิดีโอ', '#0891b2', true),
  ('ผลิตสื่อ', '#059669', true),
  ('ลงพื้นที่ประชาสัมพันธ์', '#d97706', true),
  ('กิจกรรม/พิธีการ', '#dc2626', true),
  ('ถ่ายทอดสด', '#db2777', true);

INSERT INTO public.locations (name, address) VALUES
  ('สำนักงานเทศบาลนครแม่สอด', 'อำเภอแม่สอด จังหวัดตาก'),
  ('ห้องประชุมใหญ่', 'ชั้น 2 อาคารสำนักงาน'),
  ('ศาลากลางชุมชน', '-'),
  ('ภายนอกพื้นที่ (ระบุในหมายเหตุ)', '-');

INSERT INTO public.settings (key, value) VALUES
  ('line', '{"enabled": false, "notify_on_create": true, "notify_on_update": true, "message_template": "มีงานใหม่: {title} วันที่ {date}"}'::jsonb),
  ('general', '{"org_name": "เทศบาลนครแม่สอด", "department": "ฝ่ายประชาสัมพันธ์"}'::jsonb);

-- ===== Demo work items (is_demo = true, ลบทีเดียวได้จากหน้าตั้งค่า) =====
INSERT INTO public.work_items (title, description, category_id, work_date, start_time, end_time, location_text, priority, status, note, is_demo)
SELECT v.title, v.description, c.id, v.work_date, v.start_time, v.end_time, v.location_text, v.priority::public.work_priority, v.status::public.work_status, v.note, true
FROM (VALUES
  ('[ตัวอย่าง] ถ่ายภาพพิธีเปิดงานเทศกาล', 'จัดเตรียมอุปกรณ์กล้องและเลนส์มุมกว้าง', 'ถ่ายภาพ/วิดีโอ', CURRENT_DATE, '08:30'::time, '11:00'::time, 'สำนักงานเทศบาลนครแม่สอด', 'high', 'pending', 'ประสานงานเวทีล่วงหน้า'),
  ('[ตัวอย่าง] โพสต์ข่าวประชาสัมพันธ์เก็บขยะ', 'เผยแพร่มาตรการจัดเก็บขยะช่วงเทศกาล', 'เผยแพร่ Facebook/Website/Online', CURRENT_DATE, '13:00'::time, '14:00'::time, 'สำนักงานเทศบาลนครแม่สอด', 'medium', 'in_progress', ''),
  ('[ตัวอย่าง] ถ่ายทอดสดการประชุมสภา', 'ทดสอบสัญญาณก่อนเริ่ม 30 นาที', 'ถ่ายทอดสด', CURRENT_DATE + 1, '09:00'::time, '12:00'::time, 'ห้องประชุมใหญ่', 'urgent', 'pending', ''),
  ('[ตัวอย่าง] ลงพื้นที่ประชาสัมพันธ์ชุมชนริมน้ำ', 'แจกเอกสารและสัมภาษณ์ประชาชน', 'ลงพื้นที่ประชาสัมพันธ์', CURRENT_DATE + 2, '08:00'::time, '12:00'::time, 'ภายนอกพื้นที่ (ระบุในหมายเหตุ)', 'high', 'pending', 'เตรียมรถและลำโพง'),
  ('[ตัวอย่าง] ผลิตสื่ออินโฟกราฟิก', 'กราฟิกงบประมาณประจำปี', 'ผลิตสื่อ', CURRENT_DATE + 3, '10:00'::time, '16:00'::time, 'สำนักงานเทศบาลนครแม่สอด', 'medium', 'pending', ''),
  ('[ตัวอย่าง] จัดข่าวผลการพัฒนาเมือง', 'เรียบเรียงข่าวส่งสื่อมวลชน', 'ข่าวประชาสัมพันธ์', CURRENT_DATE - 1, '09:00'::time, '11:30'::time, 'สำนักงานเทศบาลนครแม่สอด', 'low', 'completed', ''),
  ('[ตัวอย่าง] กิจกรรมจิตอาสาทำความสะอาด', 'บันทึกภาพกิจกรรมและจัดทำข่าว', 'กิจกรรม/พิธีการ', CURRENT_DATE + 5, '07:30'::time, '11:00'::time, 'ศาลากลางชุมชน', 'medium', 'pending', '')
) AS v(title, description, cat_name, work_date, start_time, end_time, location_text, priority, status, note)
JOIN public.categories c ON c.name = v.cat_name;