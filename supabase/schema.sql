-- ============================================================
-- ChakLand GIS PRO — Supabase Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL)
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE (extends auth.users with role)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  role        TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. HELPER FUNCTIONS
-- ============================================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Auto-update updated_date
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. ENTITY TABLES
-- ============================================================

-- --- LandMap ---
CREATE TABLE IF NOT EXISTS land_maps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  village           TEXT,
  district          TEXT,
  tehsil            TEXT,
  section           TEXT,
  zilladar_section  TEXT,
  rajbah            TEXT,
  moga_number       TEXT,
  mogha_side        TEXT CHECK (mogha_side IN ('L', 'R')),
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_progress','review','approved','published')),
  total_parcels     INTEGER DEFAULT 0,
  drawing_data      TEXT,
  viewport          TEXT,
  editor_settings   TEXT,
  thumbnail_url     TEXT,
  notes             TEXT,
  geo_placement_lat DOUBLE PRECISION,
  geo_placement_lng DOUBLE PRECISION,
  geo_rotation      DOUBLE PRECISION DEFAULT 0,
  geo_moga_filter   TEXT,
  is_template       BOOLEAN DEFAULT FALSE,
  created_date      TIMESTAMPTZ DEFAULT NOW(),
  updated_date      TIMESTAMPTZ DEFAULT NOW(),
  created_by_id     UUID REFERENCES auth.users(id)
);

-- --- ParatWarabandi ---
CREATE TABLE IF NOT EXISTS parat_warabandis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warabandi_type  TEXT CHECK (warabandi_type IN ('پرتوارہ بندی','ترمیم وارہ بندی')),
  canal_name      TEXT,
  mogha_name      TEXT,
  mogha_number    TEXT,
  mogha_side      TEXT CHECK (mogha_side IN ('L', 'R')),
  village_name    TEXT,
  sub_division    TEXT,
  division        TEXT,
  warabandi_date  DATE,
  applicant_name  TEXT,
  applicant_father TEXT,
  applicant_cnic  TEXT,
  shareholders    TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  notes           TEXT,
  is_template     BOOLEAN DEFAULT FALSE,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by_id   UUID REFERENCES auth.users(id)
);

-- --- ParatWarabandiRecord ---
CREATE TABLE IF NOT EXISTS parat_warabandi_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mogha_number  TEXT NOT NULL,
  mogha_side    TEXT CHECK (mogha_side IN ('L', 'R', '')),
  mouza         TEXT,
  doc_type      TEXT,
  data_json     TEXT,
  description   TEXT,
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  created_date  TIMESTAMPTZ DEFAULT NOW(),
  updated_date  TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES auth.users(id)
);

-- --- MapSnapshot ---
CREATE TABLE IF NOT EXISTS map_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id          TEXT NOT NULL,
  map_title       TEXT,
  moga_number     TEXT,
  drawing_data    TEXT,
  viewport        TEXT,
  editor_settings TEXT,
  non_parcel_count INTEGER DEFAULT 0,
  total_parcels   INTEGER DEFAULT 0,
  description     TEXT,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by_id   UUID REFERENCES auth.users(id)
);

-- --- Form33CRecord ---
CREATE TABLE IF NOT EXISTS form33c_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fasal           TEXT NOT NULL,
  year            TEXT NOT NULL,
  orientation     TEXT,
  district        TEXT,
  villages_json   TEXT,
  signatures_json TEXT,
  description     TEXT,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by_id   UUID REFERENCES auth.users(id)
);

-- --- FormFieldConfig ---
CREATE TABLE IF NOT EXISTS form_field_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type   TEXT NOT NULL CHECK (form_type IN ('parat_warabandi_header','parat_warabandi_table')),
  field_key   TEXT NOT NULL,
  label_urdu  TEXT,
  label_en    TEXT,
  field_type  TEXT DEFAULT 'text' CHECK (field_type IN ('text','date','number')),
  placeholder TEXT,
  visible     BOOLEAN DEFAULT TRUE,
  "order"     INTEGER DEFAULT 0,
  rtl         BOOLEAN DEFAULT FALSE,
  num         BOOLEAN DEFAULT FALSE,
  width       TEXT,
  description TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES auth.users(id)
);

-- --- FormulaConfig ---
CREATE TABLE IF NOT EXISTS formula_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_key TEXT NOT NULL,
  label       TEXT NOT NULL,
  unit_type   TEXT CHECK (unit_type IN ('water_time_per_acre','water_time_per_kanal','multiplier','rounding')),
  value       DOUBLE PRECISION NOT NULL,
  description TEXT,
  enabled     BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES auth.users(id)
);

-- --- FardMasrooba ---
CREATE TABLE IF NOT EXISTS fard_masroobas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mogha_number    TEXT NOT NULL,
  mogha_side      TEXT CHECK (mogha_side IN ('L', 'R', '')),
  rajbah          TEXT,
  village         TEXT,
  village2        TEXT,
  section         TEXT,
  tehsil          TEXT,
  district        TEXT,
  map_id          TEXT,
  rows_json       TEXT,
  rate_config_json TEXT,
  total_abiana    DOUBLE PRECISION DEFAULT 0,
  total_area      DOUBLE PRECISION DEFAULT 0,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by_id   UUID REFERENCES auth.users(id)
);

-- --- TaskAssignment ---
CREATE TABLE IF NOT EXISTS task_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division        TEXT NOT NULL,
  subdivision     TEXT NOT NULL CHECK (subdivision IN ('Jauharabad','Qaidabad')),
  section         TEXT NOT NULL,
  mouza           TEXT,
  officer_role    TEXT NOT NULL CHECK (officer_role IN ('zilladar','patwari')),
  officer_name    TEXT,
  officer_user_id TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        DATE,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','review','forwarded','approved','completed','rejected')),
  assigned_by_name TEXT,
  file_url        TEXT,
  photo_url       TEXT,
  forwarded_to    TEXT,
  forwarded_by    TEXT,
  remarks         TEXT,
  history_json    TEXT,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by_id   UUID REFERENCES auth.users(id)
);

-- --- Subscription ---
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  user_email      TEXT,
  user_name       TEXT,
  amount          DOUBLE PRECISION DEFAULT 2000,
  method          TEXT NOT NULL CHECK (method IN ('stripe','manual')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','expired','rejected')),
  payment_date    TIMESTAMPTZ,
  expiry_date     TIMESTAMPTZ,
  receipt_url     TEXT,
  stripe_session_id TEXT,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by_id   UUID REFERENCES auth.users(id)
);

-- --- Form1Register ---
CREATE TABLE IF NOT EXISTS form1_registers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id      TEXT NOT NULL,
  map_title   TEXT,
  moga_number TEXT,
  village     TEXT,
  tehsil      TEXT,
  district    TEXT,
  mouza       TEXT,
  channel_name TEXT,
  outlet_rd   TEXT,
  outlet_side TEXT CHECK (outlet_side IN ('L', 'R', '')),
  rows_json   TEXT,
  total_acres DOUBLE PRECISION DEFAULT 0,
  total_kanal DOUBLE PRECISION DEFAULT 0,
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  notes       TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES auth.users(id)
);

-- --- Naqsha27B ---
CREATE TABLE IF NOT EXISTS naqsha_27b (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village         TEXT NOT NULL,
  tehsil          TEXT,
  district        TEXT,
  date_reference  TEXT,
  date_decision   TEXT,
  register_number TEXT,
  rows_json       TEXT,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by_id   UUID REFERENCES auth.users(id)
);

-- --- LandSurveyRecord (field survey / khasra-level land record data) ---
CREATE TABLE IF NOT EXISTS land_survey_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  khasra_no       TEXT NOT NULL,
  village         TEXT,
  tehsil          TEXT,
  district        TEXT,
  moga_number     TEXT,
  rajbah          TEXT,
  owner_name      TEXT,
  father_name     TEXT,
  owner_cnic      TEXT,
  area_acre       DOUBLE PRECISION DEFAULT 0,
  area_kanal      DOUBLE PRECISION DEFAULT 0,
  area_marla      DOUBLE PRECISION DEFAULT 0,
  land_use        TEXT CHECK (land_use IN ('cultivable','bagh','fish_farm','ghair_mumkin','abadi','')),
  crop_name       TEXT,
  tenure          TEXT,
  survey_date     DATE,
  surveyor_name   TEXT,
  geo_lat         DOUBLE PRECISION,
  geo_lng         DOUBLE PRECISION,
  map_id          TEXT,
  attachment_url  TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','verified','approved')),
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW(),
  created_by_id   UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 4. UPDATED_DATE TRIGGERS (all tables)
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','land_maps','parat_warabandis','parat_warabandi_records',
    'map_snapshots','form33c_records','form_field_configs','formula_configs',
    'fard_masroobas','task_assignments','subscriptions','form1_registers','naqsha_27b',
    'land_survey_records'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_timestamp();', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 5. ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_maps             ENABLE ROW LEVEL SECURITY;
ALTER TABLE parat_warabandis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE parat_warabandi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE form33c_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_field_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fard_masroobas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE form1_registers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE naqsha_27b            ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_survey_records   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- --- LandMap ---
CREATE POLICY land_maps_read ON land_maps FOR SELECT USING (
  created_by_id = auth.uid() OR is_admin() OR is_template = TRUE
  OR status IN ('approved','published')
);
CREATE POLICY land_maps_create ON land_maps FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY land_maps_update ON land_maps FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY land_maps_delete ON land_maps FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- ParatWarabandi ---
CREATE POLICY parat_warabandis_read ON parat_warabandis FOR SELECT USING (
  created_by_id = auth.uid() OR is_admin() OR is_template = TRUE
);
CREATE POLICY parat_warabandis_create ON parat_warabandis FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY parat_warabandis_update ON parat_warabandis FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY parat_warabandis_delete ON parat_warabandis FOR DELETE USING (
  created_by_id = auth.uid() OR is_admin() OR is_template = TRUE
);

-- --- ParatWarabandiRecord (read: any authed, write: own/admin) ---
CREATE POLICY pwr_read ON parat_warabandi_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY pwr_create ON parat_warabandi_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY pwr_update ON parat_warabandi_records FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY pwr_delete ON parat_warabandi_records FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- MapSnapshot (read/write: own/admin) ---
CREATE POLICY ms_read ON map_snapshots FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY ms_create ON map_snapshots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY ms_update ON map_snapshots FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY ms_delete ON map_snapshots FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- Form33CRecord (read: any authed, write: own/admin) ---
CREATE POLICY f33c_read ON form33c_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY f33c_create ON form33c_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY f33c_update ON form33c_records FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY f33c_delete ON form33c_records FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- FormFieldConfig (read: any authed, write: admin only) ---
CREATE POLICY ffc_read ON form_field_configs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY ffc_create ON form_field_configs FOR INSERT WITH CHECK (is_admin());
CREATE POLICY ffc_update ON form_field_configs FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY ffc_delete ON form_field_configs FOR DELETE USING (is_admin());

-- --- FormulaConfig (read: any authed, write: admin only) ---
CREATE POLICY fc_read ON formula_configs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY fc_create ON formula_configs FOR INSERT WITH CHECK (is_admin());
CREATE POLICY fc_update ON formula_configs FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY fc_delete ON formula_configs FOR DELETE USING (is_admin());

-- --- FardMasrooba (read: any authed, write: own/admin) ---
CREATE POLICY fm_read ON fard_masroobas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY fm_create ON fard_masroobas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY fm_update ON fard_masroobas FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY fm_delete ON fard_masroobas FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- TaskAssignment (read/update: any authed, delete: own/admin) ---
CREATE POLICY ta_read ON task_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY ta_create ON task_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY ta_update ON task_assignments FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY ta_delete ON task_assignments FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- Subscription (create: own only, read: own/admin, write: admin only) ---
CREATE POLICY sub_read ON subscriptions FOR SELECT USING (user_id = auth.uid()::text OR is_admin());
CREATE POLICY sub_create ON subscriptions FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY sub_update ON subscriptions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY sub_delete ON subscriptions FOR DELETE USING (is_admin());

-- --- Form1Register (read: any authed, write: own/admin) ---
CREATE POLICY f1r_read ON form1_registers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY f1r_create ON form1_registers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY f1r_update ON form1_registers FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY f1r_delete ON form1_registers FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- Naqsha27B (read: any authed, write: own/admin) ---
CREATE POLICY n27_read ON naqsha_27b FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY n27_create ON naqsha_27b FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY n27_update ON naqsha_27b FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY n27_delete ON naqsha_27b FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- LandSurveyRecord (read: any authed, write: own/admin) ---
CREATE POLICY lsr_read ON land_survey_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY lsr_create ON land_survey_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY lsr_update ON land_survey_records FOR UPDATE USING (created_by_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY lsr_delete ON land_survey_records FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- --- Profiles (read: own or admin, update: own or admin) ---
CREATE POLICY profiles_read ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

-- ============================================================
-- 7. STORAGE BUCKET FOR FILE UPLOADS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY uploads_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);
CREATE POLICY uploads_read ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');
CREATE POLICY uploads_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);
CREATE POLICY uploads_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);

-- ============================================================
-- 8. REALTIME (enable for all entity tables)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE land_maps;
ALTER PUBLICATION supabase_realtime ADD TABLE parat_warabandis;
ALTER PUBLICATION supabase_realtime ADD TABLE parat_warabandi_records;
ALTER PUBLICATION supabase_realtime ADD TABLE map_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE form33c_records;
ALTER PUBLICATION supabase_realtime ADD TABLE form_field_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE formula_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE fard_masroobas;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE form1_registers;
ALTER PUBLICATION supabase_realtime ADD TABLE naqsha_27b;
ALTER PUBLICATION supabase_realtime ADD TABLE land_survey_records;