-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Supabase SQL Schema
-- Einmalig im Supabase SQL-Editor ausführen (unter: SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Erweiterungen ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 2. Benutzerprofil-Tabelle (erweitert auth.users) ───────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'trainer' CHECK (role IN ('admin', 'trainer')),
  vorname       TEXT NOT NULL DEFAULT '',
  nachname      TEXT NOT NULL DEFAULT '',
  geburtsdatum  TEXT DEFAULT '',
  position      TEXT DEFAULT 'Trainer',
  color         TEXT DEFAULT '#2563EB',
  urlaubstage   INTEGER DEFAULT 30,
  ueberstunden  INTEGER DEFAULT 0,
  resturlaub    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Urlaubseinträge ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'urlaub'
                CHECK (type IN ('urlaub', 'resturlaub', 'ueberstunden')),
  von         DATE NOT NULL,
  bis         DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'rejected')),
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Indizes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON public.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_status  ON public.entries(status);
CREATE INDEX IF NOT EXISTS idx_entries_dates   ON public.entries(von, bis);

-- ─── 5. Row Level Security (RLS) aktivieren ─────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries  ENABLE ROW LEVEL SECURITY;

-- ─── 6. RLS-Policies: profiles ──────────────────────────────────────

-- Jeder angemeldete User sieht alle Profile (für Kalender/Legende)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Jeder User darf nur sein eigenes Profil bearbeiten
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Nur Admins dürfen Profile anlegen (über Service-Key oder direkt per SQL)
-- Neuen User anlegt der Admin in Supabase Auth + Trigger erstellt Profil
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Nur Admins dürfen fremde Profile löschen
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 7. RLS-Policies: entries ───────────────────────────────────────

-- Alle angemeldeten User sehen bestätigte Einträge; eigene immer
CREATE POLICY "entries_select"
  ON public.entries FOR SELECT
  TO authenticated
  USING (
    status = 'confirmed'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Einträge anlegen: für sich selbst oder Admin für jeden
CREATE POLICY "entries_insert"
  ON public.entries FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Bearbeiten: eigene pending-Einträge; Admin alles
CREATE POLICY "entries_update"
  ON public.entries FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Löschen: eigene pending; Admin alles
CREATE POLICY "entries_delete"
  ON public.entries FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND status != 'confirmed')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 8. Trigger: Profil automatisch anlegen bei neuem Auth-User ─────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, vorname, nachname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'trainer'),
    COALESCE(NEW.raw_user_meta_data->>'vorname', ''),
    COALESCE(NEW.raw_user_meta_data->>'nachname', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 9. Trigger: updated_at automatisch setzen ──────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entries_updated_at ON public.entries;
CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 10. Admin-User anlegen ─────────────────────────────────────────
-- WICHTIG: Diesen Block NACH dem obigen Schema ausführen.
-- Er legt Thomas Keilig als Admin an.
-- Ersetze 'Tz_11.2022!' ggf. durch ein neues Passwort.

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  aud, role
)
VALUES (
  uuid_generate_v4(),
  'thomas.keilig@tz-westlausitz.de',
  crypt('Tz_11.2022!', gen_salt('bf')),
  NOW(),
  '{"vorname":"Thomas","nachname":"Keilig","role":"admin"}',
  NOW(), NOW(),
  'authenticated', 'authenticated'
)
ON CONFLICT (email) DO NOTHING;

-- Profil direkt setzen (falls Trigger nicht greift):
INSERT INTO public.profiles (id, email, role, vorname, nachname, position, color, urlaubstage)
SELECT id, email, 'admin', 'Thomas', 'Keilig', 'Administrator', '#2563EB', 30
FROM auth.users WHERE email = 'thomas.keilig@tz-westlausitz.de'
ON CONFLICT (id) DO UPDATE SET role = 'admin', vorname = 'Thomas', nachname = 'Keilig';
