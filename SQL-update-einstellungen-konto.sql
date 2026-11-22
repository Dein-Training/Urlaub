-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Einstellungen + Überstundenkonto
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Einstellungen (eine Zeile für den ganzen Betrieb) ──────────
CREATE TABLE IF NOT EXISTS public.einstellungen (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  frist_tag           INT  NOT NULL DEFAULT 30  CHECK (frist_tag  BETWEEN 1 AND 31),
  frist_monat         INT  NOT NULL DEFAULT 11  CHECK (frist_monat BETWEEN 1 AND 12),
  mindest_prozent     INT  NOT NULL DEFAULT 90  CHECK (mindest_prozent BETWEEN 0 AND 100),
  ueberstunden_erlaubt BOOLEAN NOT NULL DEFAULT true,
  geaendert_am        TIMESTAMPTZ DEFAULT NOW(),
  geaendert_von       UUID
);

INSERT INTO public.einstellungen (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.einstellungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eins_select" ON public.einstellungen;
CREATE POLICY "eins_select" ON public.einstellungen
  FOR SELECT TO authenticated USING (true);

-- Ändern dürfen Administratoren sowie Geschäfts-, Praxis- und Pflegedienstleitung
DROP POLICY IF EXISTS "eins_update" ON public.einstellungen;
CREATE POLICY "eins_update" ON public.einstellungen
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND (p.role='admin' OR public.pos_scope(p.position) IN ('alle','sparte'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND (p.role='admin' OR public.pos_scope(p.position) IN ('alle','sparte'))));

-- ─── 2. Ausnahmen je Mitarbeiter (leer = Vorgabe gilt) ─────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS frist_datum          DATE,
  ADD COLUMN IF NOT EXISTS mindest_prozent      INT CHECK (mindest_prozent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ueberstunden_erlaubt BOOLEAN;

-- ─── 3. Überstundenkonto: jede Bewegung nachvollziehbar ────────────
CREATE TABLE IF NOT EXISTS public.ueberstunden_konto (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  datum         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tage          NUMERIC(6,2) NOT NULL,          -- + Zugang, − Abbau
  stunden       NUMERIC(7,2),                   -- umgerechnet, falls bekannt
  saldo_danach  NUMERIC(6,2) NOT NULL,
  art           TEXT NOT NULL,                  -- antrag, urlaub, korrektur
  beschreibung  TEXT,
  bezug_id      TEXT,
  erfasst_von   UUID,
  erfasst_name  TEXT
);

CREATE INDEX IF NOT EXISTS idx_uek_user ON public.ueberstunden_konto(user_id, datum DESC);

ALTER TABLE public.ueberstunden_konto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uek_select" ON public.ueberstunden_konto;
CREATE POLICY "uek_select" ON public.ueberstunden_konto
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.darf_verwalten(user_id));

-- Geschrieben wird ausschließlich durch die Trigger unten.

-- ─── 4. Bewegung eintragen ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.uek_buchen(
  p_user UUID, p_tage NUMERIC, p_art TEXT, p_text TEXT, p_bezug TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE letzter NUMERIC; std NUMERIC; pr public.profiles%ROWTYPE;
BEGIN
  IF p_tage IS NULL OR p_tage = 0 THEN RETURN; END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = p_user;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT saldo_danach INTO letzter FROM public.ueberstunden_konto
   WHERE user_id = p_user ORDER BY datum DESC, id DESC LIMIT 1;
  IF letzter IS NULL THEN letzter := COALESCE(pr.ueberstunden,0) - p_tage; END IF;

  std := CASE WHEN COALESCE(pr.arbeitstage_woche,0) > 0
              THEN ROUND(p_tage * (pr.wochenstunden / pr.arbeitstage_woche), 2) END;

  INSERT INTO public.ueberstunden_konto
    (user_id,tage,stunden,saldo_danach,art,beschreibung,bezug_id,erfasst_von,erfasst_name)
  VALUES (p_user, p_tage, std, ROUND(letzter + p_tage, 2), p_art, p_text, p_bezug,
          auth.uid(), public.protokoll_wer());
END; $$;

-- ─── 5. Genehmigte Überstundenanträge buchen ───────────────────────
CREATE OR REPLACE FUNCTION public.uek_aus_antrag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE pr public.profiles%ROWTYPE; tage NUMERIC;
BEGIN
  IF NEW.status <> 'confirmed' OR OLD.status = 'confirmed' THEN RETURN NEW; END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = NEW.user_id;
  IF NOT FOUND OR COALESCE(pr.arbeitstage_woche,0) = 0 THEN RETURN NEW; END IF;
  tage := ROUND(NEW.stunden / (pr.wochenstunden / pr.arbeitstage_woche), 2);
  PERFORM public.uek_buchen(NEW.user_id, tage, 'antrag',
    'Antrag über ' || NEW.stunden || ' Std. genehmigt' ||
    COALESCE(' (' || NEW.grund || ')',''), NEW.id::text);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_uek_antrag ON public.ueberstunden_antraege;
CREATE TRIGGER trg_uek_antrag
  AFTER UPDATE ON public.ueberstunden_antraege
  FOR EACH ROW EXECUTE FUNCTION public.uek_aus_antrag();

-- ─── 6. Überstundenabbau durch Urlaub buchen ───────────────────────
CREATE OR REPLACE FUNCTION public.uek_aus_urlaub()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE pr public.profiles%ROWTYPE; tage NUMERIC; alt_best BOOLEAN; neu_best BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.type <> 'ueberstunden' OR OLD.status <> 'confirmed' THEN RETURN OLD; END IF;
    SELECT * INTO pr FROM public.profiles WHERE id = OLD.user_id;
    tage := public.urlaubstage_im_jahr(OLD.von, OLD.bis, EXTRACT(YEAR FROM OLD.von)::int,
                                       COALESCE(pr.fronleichnam,false));
    PERFORM public.uek_buchen(OLD.user_id, tage, 'urlaub',
      'Gelöschter Abbau ' || to_char(OLD.von,'DD.MM.YYYY') || ' – ' ||
      to_char(OLD.bis,'DD.MM.YYYY') || ' zurückgebucht', OLD.id::text);
    RETURN OLD;
  END IF;

  IF NEW.type <> 'ueberstunden' THEN RETURN NEW; END IF;
  alt_best := (TG_OP = 'UPDATE' AND OLD.status = 'confirmed');
  neu_best := (NEW.status = 'confirmed');
  IF neu_best = alt_best THEN RETURN NEW; END IF;

  SELECT * INTO pr FROM public.profiles WHERE id = NEW.user_id;
  tage := public.urlaubstage_im_jahr(NEW.von, NEW.bis, EXTRACT(YEAR FROM NEW.von)::int,
                                     COALESCE(pr.fronleichnam,false));
  IF neu_best THEN
    PERFORM public.uek_buchen(NEW.user_id, -tage, 'urlaub',
      'Freie Tage ' || to_char(NEW.von,'DD.MM.YYYY') || ' – ' ||
      to_char(NEW.bis,'DD.MM.YYYY'), NEW.id::text);
  ELSE
    PERFORM public.uek_buchen(NEW.user_id, tage, 'urlaub',
      'Rücknahme ' || to_char(NEW.von,'DD.MM.YYYY') || ' – ' ||
      to_char(NEW.bis,'DD.MM.YYYY'), NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_uek_urlaub ON public.entries;
CREATE TRIGGER trg_uek_urlaub
  AFTER INSERT OR UPDATE OR DELETE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.uek_aus_urlaub();

-- ─── 7. Konto muss zum Saldo passen ────────────────────────────────
-- Ändert die Leitung den Kontostand direkt, wird das als Korrektur festgehalten.
CREATE OR REPLACE FUNCTION public.uek_aus_korrektur()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE diff NUMERIC;
BEGIN
  IF current_setting('app.uek_buchung', true) = 'an' THEN RETURN NEW; END IF;
  IF NEW.ueberstunden IS NOT DISTINCT FROM OLD.ueberstunden THEN RETURN NEW; END IF;
  diff := ROUND(COALESCE(NEW.ueberstunden,0) - COALESCE(OLD.ueberstunden,0), 2);
  PERFORM public.uek_buchen(NEW.id, diff, 'korrektur',
    'Kontostand von Hand angepasst: ' || COALESCE(OLD.ueberstunden,0) ||
    ' → ' || COALESCE(NEW.ueberstunden,0) || ' Tage', NULL);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_uek_korrektur ON public.profiles;
CREATE TRIGGER trg_uek_korrektur
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.uek_aus_korrektur();

-- ─── 8. Startbestand für vorhandene Mitarbeiter ────────────────────
INSERT INTO public.ueberstunden_konto
  (user_id,datum,tage,saldo_danach,art,beschreibung,erfasst_name)
SELECT p.id, NOW(), COALESCE(p.ueberstunden,0), COALESCE(p.ueberstunden,0),
       'korrektur', 'Anfangsbestand bei Einführung des Kontos', 'System'
FROM public.profiles p
WHERE NOT p.pauschal
  AND COALESCE(p.ueberstunden,0) <> 0
  AND NOT EXISTS (SELECT 1 FROM public.ueberstunden_konto k WHERE k.user_id = p.id);

-- ─── 9. Kontrolle ──────────────────────────────────────────────────
SELECT * FROM public.einstellungen;

SELECT p.vorname, k.datum, k.tage, k.saldo_danach, k.art, k.beschreibung
FROM public.ueberstunden_konto k JOIN public.profiles p ON p.id = k.user_id
ORDER BY k.datum DESC LIMIT 20;
