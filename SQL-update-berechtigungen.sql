-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Update: Geschlecht, Positionen, Berechtigungen
-- Komplett im Supabase SQL-Editor ausführen (SQL Editor → New Query → Run)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Neue Spalte: Geschlecht ────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS geschlecht TEXT NOT NULL DEFAULT 'd';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_geschlecht_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_geschlecht_check CHECK (geschlecht IN ('w','m','d'));

-- ─── 2. Berechtigung: 'trainer' wird zu 'mitarbeiter' ──────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'mitarbeiter' WHERE role <> 'admin';
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','mitarbeiter'));
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'mitarbeiter';

-- ─── 3. Positionen auf feste Schlüssel umstellen ───────────────────
UPDATE public.profiles SET position = CASE
  WHEN position ILIKE '%geschäftsleit%'                       THEN 'geschaeftsleitung'
  WHEN position ILIKE '%praxisleit%'                          THEN 'praxisleitung'
  WHEN position ILIKE 'teamleitung physio%'                   THEN 'tl_physio'
  WHEN position ILIKE 'teamleitung ergo%'                     THEN 'tl_ergo'
  WHEN position ILIKE 'teamleitung train%'                    THEN 'tl_trainer'
  WHEN position ILIKE 'teamleitung logo%'                     THEN 'tl_logo'
  WHEN position ILIKE 'teamleitung podo%'                     THEN 'tl_podo'
  WHEN position ILIKE 'physiotherapeut%'                      THEN 'physiotherapeut'
  WHEN position ILIKE 'ergotherapeut%'                        THEN 'ergotherapeut'
  WHEN position ILIKE 'logopäd%' OR position ILIKE 'logopad%' THEN 'logopaede'
  WHEN position ILIKE 'podolog%'                              THEN 'podologe'
  ELSE 'trainer'
END
WHERE position IS NULL OR position NOT IN (
  'geschaeftsleitung','praxisleitung','tl_physio','tl_ergo','tl_trainer',
  'tl_logo','tl_podo','physiotherapeut','ergotherapeut','logopaede','podologe','trainer');

ALTER TABLE public.profiles ALTER COLUMN position SET DEFAULT 'trainer';

-- ─── 4. Hilfsfunktionen für die Rechteprüfung ──────────────────────
-- Fachbereich einer Position
CREATE OR REPLACE FUNCTION public.pos_bereich(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p
    WHEN 'tl_physio' THEN 'physio' WHEN 'physiotherapeut' THEN 'physio'
    WHEN 'tl_ergo'   THEN 'ergo'   WHEN 'ergotherapeut'   THEN 'ergo'
    WHEN 'tl_logo'   THEN 'logo'   WHEN 'logopaede'       THEN 'logo'
    WHEN 'tl_podo'   THEN 'podo'   WHEN 'podologe'        THEN 'podo'
    WHEN 'tl_trainer' THEN 'trainer' WHEN 'trainer'       THEN 'trainer'
    ELSE NULL END;
$$;

-- Reichweite einer Position: alle / bereich / selbst
CREATE OR REPLACE FUNCTION public.pos_scope(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p IN ('geschaeftsleitung','praxisleitung') THEN 'alle'
    WHEN p LIKE 'tl\_%' THEN 'bereich'
    ELSE 'selbst' END;
$$;

-- Darf die angemeldete Person das Profil von target_id führen?
-- SECURITY DEFINER, damit die Prüfung nicht selbst an RLS scheitert.
CREATE OR REPLACE FUNCTION public.darf_verwalten(target_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE ich public.profiles%ROWTYPE; ziel public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF auth.uid() = target_id THEN RETURN TRUE; END IF;
  SELECT * INTO ich   FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF ich.role = 'admin' THEN RETURN TRUE; END IF;
  IF public.pos_scope(ich.position) = 'alle' THEN RETURN TRUE; END IF;
  IF public.pos_scope(ich.position) = 'bereich' THEN
    SELECT * INTO ziel FROM public.profiles WHERE id = target_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    RETURN public.pos_bereich(ziel.position) = public.pos_bereich(ich.position);
  END IF;
  RETURN FALSE;
END; $$;

-- ─── 5. RLS-Policies neu setzen ────────────────────────────────────
-- profiles: auch die Stammdaten nur im eigenen Verantwortungsbereich sichtbar
DROP POLICY IF EXISTS "profiles_select_all"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.darf_verwalten(id));

DROP POLICY IF EXISTS "profiles_update_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_scoped" ON public.profiles;
CREATE POLICY "profiles_update_scoped"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.darf_verwalten(id))
  WITH CHECK (public.darf_verwalten(id));

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- entries
-- Datenschutz: Mitarbeiter sehen ausschliesslich eigene Eintraege.
-- Leitungen sehen zusaetzlich die Eintraege der von ihnen gefuehrten Personen.
DROP POLICY IF EXISTS "entries_select" ON public.entries;
CREATE POLICY "entries_select"
  ON public.entries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.darf_verwalten(user_id));

DROP POLICY IF EXISTS "entries_insert" ON public.entries;
CREATE POLICY "entries_insert"
  ON public.entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.darf_verwalten(user_id));

DROP POLICY IF EXISTS "entries_update" ON public.entries;
CREATE POLICY "entries_update"
  ON public.entries FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.darf_verwalten(user_id))
  WITH CHECK ((user_id = auth.uid() AND status = 'pending') OR public.darf_verwalten(user_id));

DROP POLICY IF EXISTS "entries_delete" ON public.entries;
CREATE POLICY "entries_delete"
  ON public.entries FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.darf_verwalten(user_id));

-- ─── 6. Benutzeranlage: Geschlecht ergänzen ────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT, p_password TEXT, p_vorname TEXT, p_nachname TEXT,
  p_role TEXT, p_position TEXT, p_color TEXT,
  p_urlaubstage INT, p_ueberstunden INT, p_resturlaub INT,
  p_einstellungsdatum DATE, p_geburtsdatum DATE, p_geschlecht TEXT DEFAULT 'd'
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_id UUID; v_email TEXT := lower(btrim(p_email));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') THEN
    RAISE EXCEPTION 'Nur Administratoren dürfen Benutzer anlegen';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email)=v_email) THEN
    RAISE EXCEPTION 'Diese E-Mail ist bereits vergeben';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email)=v_email) THEN
    RAISE EXCEPTION 'Es existiert noch ein verwaistes Profil zu dieser E-Mail';
  END IF;
  IF length(p_password) < 8 THEN RAISE EXCEPTION 'Passwort zu kurz'; END IF;

  new_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new)
  VALUES (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('vorname',p_vorname,'nachname',p_nachname,'role',p_role)::jsonb,
    NOW(), NOW(), '', '', '', '');

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id,
    json_build_object('sub', new_id::text, 'email', v_email)::jsonb,
    'email', v_email, NOW(), NOW(), NOW());

  INSERT INTO public.profiles (id, email, role, vorname, nachname, position, geschlecht, color,
    urlaubstage, ueberstunden, resturlaub, einstellungsdatum, geburtsdatum, must_change_password)
  VALUES (new_id, v_email, COALESCE(p_role,'mitarbeiter'), p_vorname, p_nachname,
    COALESCE(p_position,'trainer'), COALESCE(p_geschlecht,'d'), p_color,
    p_urlaubstage, p_ueberstunden, p_resturlaub, p_einstellungsdatum, p_geburtsdatum, true)
  ON CONFLICT (id) DO UPDATE SET
    role=EXCLUDED.role, vorname=EXCLUDED.vorname, nachname=EXCLUDED.nachname,
    position=EXCLUDED.position, geschlecht=EXCLUDED.geschlecht, color=EXCLUDED.color,
    urlaubstage=EXCLUDED.urlaubstage, ueberstunden=EXCLUDED.ueberstunden,
    resturlaub=EXCLUDED.resturlaub, einstellungsdatum=EXCLUDED.einstellungsdatum,
    geburtsdatum=EXCLUDED.geburtsdatum, must_change_password=true;

  RETURN json_build_object('id', new_id, 'email', v_email, 'vorname', p_vorname);
END; $$;

-- Trigger-Standard ebenfalls auf 'mitarbeiter' umstellen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, vorname, nachname)
  VALUES (NEW.id, lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role','mitarbeiter'),
    COALESCE(NEW.raw_user_meta_data->>'vorname',''),
    COALESCE(NEW.raw_user_meta_data->>'nachname',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profil-Trigger: %', SQLERRM;
  RETURN NEW;
END; $$;

-- ─── 7. Kontrolle ──────────────────────────────────────────────────
SELECT vorname, nachname, role AS berechtigung, position, geschlecht,
       public.pos_scope(position) AS reichweite,
       public.pos_bereich(position) AS bereich
FROM public.profiles ORDER BY nachname, vorname;
