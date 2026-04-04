-- ============================================================
-- INGELSTADGYMNASIET - PROVA-PÅ-SYSTEM - DATABASSCHEMA
-- Kör detta i Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- SETTINGS (en rad per skola)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'Ingelstadgymnasiet',
  sender_email TEXT,
  admin_emails TEXT[] DEFAULT '{}',
  kitchen_email TEXT,
  internat_email TEXT,
  internat_email_text TEXT,
  admin_email_text TEXT,
  overnight_capacity INT DEFAULT 3,
  smtp_host TEXT,
  smtp_port TEXT DEFAULT '587',
  smtp_user TEXT,
  smtp_pass TEXT,
  open_terms TEXT[] DEFAULT '{}',
  term_history TEXT[] DEFAULT '{}',
  blocked_dates DATE[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROGRAMS
CREATE TABLE programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎓',
  is_nv BOOLEAN DEFAULT FALSE,
  hidden BOOLEAN DEFAULT FALSE,
  slot_mode TEXT DEFAULT 'closed' CHECK (slot_mode IN ('open','closed')),
  default_capacity INT DEFAULT 10,
  email_text TEXT,
  nv_compatible TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','personal','internat')),
  program_id TEXT REFERENCES programs(id),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLOTS
CREATE TABLE slots (
  id TEXT PRIMARY KEY DEFAULT 's' || substr(gen_random_uuid()::text, 1, 8),
  program_id TEXT NOT NULL REFERENCES programs(id),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fm','em','hel')),
  capacity INT NOT NULL DEFAULT 10,
  booked INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKINGS
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  guardian_email TEXT NOT NULL,
  phone TEXT NOT NULL,
  school TEXT NOT NULL,
  municipality TEXT,
  grade TEXT NOT NULL,
  days INT NOT NULL DEFAULT 1,
  overnight BOOLEAN DEFAULT FALSE,
  special_food TEXT,
  other_info TEXT,
  code TEXT NOT NULL UNIQUE,
  cancelled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKING SLOTS (many-to-many)
CREATE TABLE booking_slots (
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  slot_id TEXT REFERENCES slots(id),
  PRIMARY KEY (booking_id, slot_id)
);

-- ROOM BOOKINGS (övernattning per rum)
CREATE TABLE room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  room INT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLOSED ROOMS (internat stängda nätter)
CREATE TABLE closed_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room INT, -- NULL = alla rum
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_rooms ENABLE ROW LEVEL SECURITY;

-- Public kan läsa program och slots (för bokningsflödet)
CREATE POLICY "programs_public_read" ON programs FOR SELECT USING (true);
CREATE POLICY "slots_public_read" ON slots FOR SELECT USING (true);
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);

-- Service role har full tillgång (används av API-routes)
CREATE POLICY "all_service_role" ON settings USING (auth.role() = 'service_role');
CREATE POLICY "all_service_role_programs" ON programs USING (auth.role() = 'service_role');
CREATE POLICY "all_service_role_staff" ON staff USING (auth.role() = 'service_role');
CREATE POLICY "all_service_role_slots" ON slots USING (auth.role() = 'service_role');
CREATE POLICY "all_service_role_bookings" ON bookings USING (auth.role() = 'service_role');
CREATE POLICY "all_service_role_booking_slots" ON booking_slots USING (auth.role() = 'service_role');
CREATE POLICY "all_service_role_room_bookings" ON room_bookings USING (auth.role() = 'service_role');
CREATE POLICY "all_service_role_closed_rooms" ON closed_rooms USING (auth.role() = 'service_role');

-- ============================================================
-- STARTDATA
-- ============================================================
INSERT INTO settings (school_name, overnight_capacity, open_terms, admin_email_text)
VALUES (
  'Ingelstadgymnasiet',
  3,
  ARRAY['VT26'],
  'Välkommen till Ingelstadgymnasiet! Vi ser fram emot ditt besök. Ta med bekräftelsekoden nedan.'
);

INSERT INTO programs (id, name, icon, is_nv, hidden, slot_mode, default_capacity, nv_compatible, description, email_text) VALUES
  ('na', 'Naturvetenskap (NV)', '🔬', true, true, 'closed', 8, ARRAY['djursjuk','hasthallning','lb-lantbruk'], 'Utforska naturens lagar med experiment och teori.', 'NV-programmet välkomnar dig! Ta med din vetenskapliga nyfikenhet.'),
  ('djurvard', 'Djurvård', '🐾', false, false, 'open', 10, '{}', 'Lär dig ta hand om och arbeta med djur professionellt.', 'Djurvårdsprogrammet: Klä dig i bekväma kläder. Vi arbetar med levande djur!'),
  ('djursjuk', 'Djursjukvård', '💉', false, false, 'closed', 8, '{}', 'Sjukvård och behandling av djur inom veterinär och klinik.', 'Djursjukvårdsprogrammet: Vi ses i kliniken. Medicinska moment ingår under dagen.'),
  ('hasthallning', 'Hästhållning', '🐴', false, false, 'open', 10, '{}', 'Arbeta med hästar och lär dig om skötsel och ridning.', 'Hästhållning: Ta med stövlar och kläder som tål lite smuts. Vi ses i stallet!'),
  ('dv-hund', 'DV-Hund', '🐕', false, false, 'closed', 10, '{}', 'Djurvård med inriktning mot hundar — träning, skötsel och vård.', 'DV-Hund: Välkommen till hundverksamheten! Ta med ombyteskläder.'),
  ('lb-entreprenad', 'LB-Entreprenad', '🚜', false, false, 'closed', 12, '{}', 'Lantbruksmaskiner, entreprenad och markarbete i praktiken.', 'LB-Entreprenad: Vi ses vid maskinparken. Rejäla skor rekommenderas.'),
  ('lb-lantbruk', 'LB-Lantbruk', '🌾', false, false, 'closed', 12, '{}', 'Lantbruk, djurskötsel och grödor — ett liv på landet i praktiken.', 'LB-Lantbruk: Välkommen till gården! Praktiska moment ingår under dagen.');
