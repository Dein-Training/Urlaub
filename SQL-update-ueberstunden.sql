-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Update: Überstundenanträge + Farbschutz
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Überstunden mit Nachkommastellen zulassen ──────────────────
-- Halbe Tage entstehen zwangsläufig, sobald in Stunden gerechnet wird.
ALTER TABLE public.profiles
  ALTER COLUMN ueberstunden TYPE NUMERIC(6,2) USING ueberstunden::numeric;

-- ─── 2. Tabelle für Überstundenanträge ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.ueberstunden_antraege (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stunden         NUMERIC(6,2) NOT NULL,           -- Änderung in Stunden (+ oder −)
  grund           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','rejected')),
  entschieden_von UUID REFERENCES public.profiles(id),
  entschieden_am  TIMESTAMPTZ,
  hinweis         TEXT,                            -- Rückmeldung der Leitung
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ueberstunden_user   ON public.ueberstunden_antraege(user_id);
CREATE INDEX IF NOT EXISTS idx_ueberstunden_status ON public.ueberstunden_antraege(status);

ALTER TABLE public.ueberstunden_antraege ENABLE ROW LEVEL SECURITY;

-- Sehen: eigene Anträge und die der geführten Mitarbeiter
DROP POLICY IF EXISTS "ue_select" ON public.ueberstunden_antraege;
CREATE POLICY "ue_select" ON public.ueberstunden_antraege
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.darf_verwalten(user_id));

-- Stellen: nur für sich selbst
DROP POLICY IF EXISTS "ue_insert" ON public.ueberstunden_antraege;
CREATE POLICY "ue_insert" ON public.ueberstunden_antraege
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Zurückziehen: eigener Antrag, solange er offen ist
DROP POLICY IF EXISTS "ue_delete" ON public.ueberstunden_antraege;
CREATE POLICY "ue_delete" ON public.ueberstunden_antraege
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- Entscheiden läuft ausschließlich über die Funktion unten, nicht per UPDATE.

-- ─── 3. Entscheidung durch die Leitung ─────────────────────────────
CREATE OR REPLACE FUNCTION public.ueberstunden_entscheiden(
  p_antrag UUID, p_status TEXT, p_hinweis TEXT DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE a public.ueberstunden_antraege%ROWTYPE;
        ziel public.profiles%ROWTYPE;
        ich  public.profiles%ROWTYPE;
        std_pro_tag NUMERIC; tage NUMERIC; neu NUMERIC;
BEGIN
  IF p_status NOT IN ('confirmed','rejected') THEN
    RAISE EXCEPTION 'Ungültiger Status';
  END IF;

  SELECT * INTO a FROM public.ueberstunden_antraege WHERE id = p_antrag;
  IF NOT FOUND THEN RAISE EXCEPTION 'Antrag nicht gefunden'; END IF;
  IF a.status <> 'pending' THEN RAISE EXCEPTION 'Antrag wurde bereits entschieden'; END IF;

  SELECT * INTO ich FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Kein Profil gefunden'; END IF;

  -- Über den eigenen Antrag entscheidet nur die Geschäfts-/Praxisleitung
  IF a.user_id = auth.uid()
     AND ich.role <> 'admin'
     AND public.pos_scope(ich.position) <> 'alle' THEN
    RAISE EXCEPTION 'Über den eigenen Antrag entscheidet die Praxis- oder Geschäftsleitung';
  END IF;

  IF NOT public.darf_verwalten(a.user_id) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diesen Mitarbeiter';
  END IF;

  SELECT * INTO ziel FROM public.profiles WHERE id = a.user_id;

  IF p_status = 'confirmed' THEN
    std_pro_tag := NULLIF(ziel.wochenstunden,0) / NULLIF(ziel.arbeitstage_woche,0);
    IF std_pro_tag IS NULL OR std_pro_tag = 0 THEN
      RAISE EXCEPTION 'Arbeitszeit des Mitarbeiters ist nicht hinterlegt';
    END IF;
    tage := ROUND(a.stunden / std_pro_tag, 2);
    neu  := COALESCE(ziel.ueberstunden,0) + tage;
    IF neu < 0 THEN
      RAISE EXCEPTION 'Das Überstundenkonto würde negativ (%). Bitte Antrag anpassen', neu;
    END IF;
    UPDATE public.profiles SET ueberstunden = neu WHERE id = a.user_id;
  END IF;

  UPDATE public.ueberstunden_antraege
     SET status = p_status, entschieden_von = auth.uid(),
         entschieden_am = NOW(), hinweis = p_hinweis
   WHERE id = p_antrag;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (a.user_id,
    CASE WHEN p_status = 'confirmed'
      THEN 'Dein Überstundenantrag über ' || a.stunden || ' Std. wurde genehmigt. Neues Konto: '
           || ROUND(neu,2) || ' Tage.'
      ELSE 'Dein Überstundenantrag über ' || a.stunden || ' Std. wurde abgelehnt.'
    END || COALESCE(' Hinweis: ' || p_hinweis, ''),
    CASE WHEN p_status = 'confirmed' THEN 'success' ELSE 'warn' END);

  RETURN json_build_object('status', p_status, 'ueberstunden_neu', neu);
END; $$;

-- ─── 4. Farbe ebenfalls vor Selbstbedienung schützen ───────────────
CREATE OR REPLACE FUNCTION public.schuetze_urlaubskonto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE ich public.profiles%ROWTYPE; darf BOOLEAN;
BEGIN
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
    NEW.color             := OLD.color;      -- NEU: Farbe vergibt die Leitung
  END IF;

  IF NEW.id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role AND ich.role <> 'admin' THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_schuetze_urlaubskonto ON public.profiles;
CREATE TRIGGER trg_schuetze_urlaubskonto
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.schuetze_urlaubskonto();

-- ─── 5. Kontrolle ──────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'ueberstunden_antraege';

SELECT vorname, nachname, ueberstunden, wochenstunden, arbeitstage_woche,
       ROUND(wochenstunden / NULLIF(arbeitstage_woche,0), 2) AS stunden_pro_tag
FROM public.profiles ORDER BY nachname;
