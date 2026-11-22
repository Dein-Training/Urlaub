-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Update: Arbeitszeit + Bereinigung offener Policies
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. WICHTIG: offene Richtlinie entfernen ───────────────────────
-- "allow_all_authenticated" gilt für ALL und hebt durch die ODER-Verknüpfung
-- alle neuen Einschränkungen wieder auf.
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own"     ON public.profiles;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.entries;

-- ─── 2. Arbeitszeit je Mitarbeiter ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wochenstunden      NUMERIC(4,1) NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS arbeitstage_woche  INT          NOT NULL DEFAULT 5;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_wochenstunden_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_wochenstunden_check CHECK (wochenstunden >= 0 AND wochenstunden <= 60);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_arbeitstage_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_arbeitstage_check CHECK (arbeitstage_woche BETWEEN 1 AND 6);

-- ─── 3. Benutzeranlage um die neuen Felder erweitern ───────────────
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT, p_password TEXT, p_vorname TEXT, p_nachname TEXT,
  p_role TEXT, p_position TEXT, p_color TEXT,
  p_urlaubstage INT, p_ueberstunden INT, p_resturlaub INT,
  p_einstellungsdatum DATE, p_geburtsdatum DATE,
  p_geschlecht TEXT DEFAULT 'd',
  p_wochenstunden NUMERIC DEFAULT 40,
  p_arbeitstage_woche INT DEFAULT 5
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
    urlaubstage, ueberstunden, resturlaub, einstellungsdatum, geburtsdatum,
    wochenstunden, arbeitstage_woche, must_change_password)
  VALUES (new_id, v_email, COALESCE(p_role,'mitarbeiter'), p_vorname, p_nachname,
    COALESCE(p_position,'trainer'), COALESCE(p_geschlecht,'d'), p_color,
    p_urlaubstage, p_ueberstunden, p_resturlaub, p_einstellungsdatum, p_geburtsdatum,
    COALESCE(p_wochenstunden,40), COALESCE(p_arbeitstage_woche,5), true)
  ON CONFLICT (id) DO UPDATE SET
    role=EXCLUDED.role, vorname=EXCLUDED.vorname, nachname=EXCLUDED.nachname,
    position=EXCLUDED.position, geschlecht=EXCLUDED.geschlecht, color=EXCLUDED.color,
    urlaubstage=EXCLUDED.urlaubstage, ueberstunden=EXCLUDED.ueberstunden,
    resturlaub=EXCLUDED.resturlaub, einstellungsdatum=EXCLUDED.einstellungsdatum,
    geburtsdatum=EXCLUDED.geburtsdatum, wochenstunden=EXCLUDED.wochenstunden,
    arbeitstage_woche=EXCLUDED.arbeitstage_woche, must_change_password=true;

  RETURN json_build_object('id', new_id, 'email', v_email, 'vorname', p_vorname);
END; $$;

-- ─── 4. Kontrolle ──────────────────────────────────────────────────
-- Es dürfen auf profiles nur noch die eigenen Policies + allow_service_role stehen
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('profiles','entries')
ORDER BY tablename, cmd;

SELECT vorname, nachname, wochenstunden, arbeitstage_woche,
       ROUND(wochenstunden / NULLIF(arbeitstage_woche,0), 2) AS stunden_pro_tag
FROM public.profiles ORDER BY nachname;
