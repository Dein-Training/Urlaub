-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Update: Pauschalkräfte
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Kennzeichen ────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pauschal BOOLEAN NOT NULL DEFAULT false;

-- Arbeitszeit darf bei Pauschalkräften 0 sein
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_arbeitstage_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_arbeitstage_check CHECK (arbeitstage_woche BETWEEN 0 AND 6);

-- ─── 2. Vor Selbstbedienung schützen ───────────────────────────────
CREATE OR REPLACE FUNCTION public.schuetze_urlaubskonto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE ich public.profiles%ROWTYPE; darf BOOLEAN;
BEGIN
  IF current_setting('app.kontobuchung', true) = 'an' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO ich FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN NEW; END IF;

  darf := ich.role = 'admin'
       OR public.pos_scope(ich.position) IN ('alle','bereich');
  IF darf THEN darf := public.darf_verwalten(NEW.id); END IF;

  IF NOT darf THEN
    NEW.urlaubstage       := OLD.urlaubstage;
    NEW.ueberstunden      := OLD.ueberstunden;
    NEW.resturlaub        := OLD.resturlaub;
    NEW.wochenstunden     := OLD.wochenstunden;
    NEW.arbeitstage_woche := OLD.arbeitstage_woche;
    NEW.position          := OLD.position;
    NEW.role              := OLD.role;
    NEW.einstellungsdatum := OLD.einstellungsdatum;
    NEW.color             := OLD.color;
    NEW.pauschal          := OLD.pauschal;
  END IF;

  IF NEW.id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role AND ich.role <> 'admin' THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END; $$;

-- ─── 3. Keine Überstundenanträge für Pauschalkräfte ────────────────
-- Ohne feste Tagesstundenzahl lässt sich nicht in Urlaubstage umrechnen.
CREATE OR REPLACE FUNCTION public.pruefe_ueberstundenantrag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE p public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = NEW.user_id;
  IF FOUND AND p.pauschal THEN
    RAISE EXCEPTION 'Für Pauschalkräfte wird kein Überstundenkonto geführt';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_pruefe_ueberstundenantrag ON public.ueberstunden_antraege;
CREATE TRIGGER trg_pruefe_ueberstundenantrag
  BEFORE INSERT ON public.ueberstunden_antraege
  FOR EACH ROW EXECUTE FUNCTION public.pruefe_ueberstundenantrag();

-- ─── 4. Benutzeranlage erweitern ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT, p_password TEXT, p_vorname TEXT, p_nachname TEXT,
  p_role TEXT, p_position TEXT, p_color TEXT,
  p_urlaubstage INT, p_ueberstunden INT, p_resturlaub INT,
  p_einstellungsdatum DATE, p_geburtsdatum DATE,
  p_geschlecht TEXT DEFAULT 'd',
  p_wochenstunden NUMERIC DEFAULT 40,
  p_arbeitstage_woche INT DEFAULT 5,
  p_pauschal BOOLEAN DEFAULT false
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
    wochenstunden, arbeitstage_woche, pauschal, must_change_password)
  VALUES (new_id, v_email, COALESCE(p_role,'mitarbeiter'), p_vorname, p_nachname,
    COALESCE(p_position,'trainer'), COALESCE(p_geschlecht,'d'), p_color,
    CASE WHEN p_pauschal THEN 0 ELSE p_urlaubstage END,
    CASE WHEN p_pauschal THEN 0 ELSE p_ueberstunden END,
    CASE WHEN p_pauschal THEN 0 ELSE p_resturlaub END,
    p_einstellungsdatum, p_geburtsdatum,
    CASE WHEN p_pauschal THEN 0 ELSE COALESCE(p_wochenstunden,40) END,
    CASE WHEN p_pauschal THEN 0 ELSE COALESCE(p_arbeitstage_woche,5) END,
    COALESCE(p_pauschal,false), true)
  ON CONFLICT (id) DO UPDATE SET
    role=EXCLUDED.role, vorname=EXCLUDED.vorname, nachname=EXCLUDED.nachname,
    position=EXCLUDED.position, geschlecht=EXCLUDED.geschlecht, color=EXCLUDED.color,
    urlaubstage=EXCLUDED.urlaubstage, ueberstunden=EXCLUDED.ueberstunden,
    resturlaub=EXCLUDED.resturlaub, einstellungsdatum=EXCLUDED.einstellungsdatum,
    geburtsdatum=EXCLUDED.geburtsdatum, wochenstunden=EXCLUDED.wochenstunden,
    arbeitstage_woche=EXCLUDED.arbeitstage_woche, pauschal=EXCLUDED.pauschal,
    must_change_password=true;

  RETURN json_build_object('id', new_id, 'email', v_email, 'vorname', p_vorname);
END; $$;

-- ─── 5. Kontrolle ──────────────────────────────────────────────────
SELECT vorname, nachname, pauschal, urlaubstage, wochenstunden, arbeitstage_woche
FROM public.profiles ORDER BY nachname;
