-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Änderungsprotokoll
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Tabelle ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aenderungsprotokoll (
  id             BIGSERIAL PRIMARY KEY,
  zeitpunkt      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  benutzer_id    UUID,
  benutzer_name  TEXT,
  bereich        TEXT NOT NULL,        -- Mitarbeiter, Urlaub, Position, …
  aktion         TEXT NOT NULL,        -- erstellt, geaendert, geloescht
  betrifft       TEXT,                 -- Name der betroffenen Person/Sache
  beschreibung   TEXT,                 -- lesbarer Text
  datensatz_id   TEXT
);

CREATE INDEX IF NOT EXISTS idx_prot_zeit    ON public.aenderungsprotokoll(zeitpunkt DESC);
CREATE INDEX IF NOT EXISTS idx_prot_bereich ON public.aenderungsprotokoll(bereich);

ALTER TABLE public.aenderungsprotokoll ENABLE ROW LEVEL SECURITY;

-- Nur Administratoren dürfen lesen
DROP POLICY IF EXISTS "prot_select" ON public.aenderungsprotokoll;
CREATE POLICY "prot_select" ON public.aenderungsprotokoll
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Schreiben übernehmen ausschließlich die Trigger (SECURITY DEFINER).
-- Niemand darf Einträge ändern oder löschen — das Protokoll bleibt unverfälscht.

-- ─── 2. Hilfsfunktion: Wer handelt gerade? ─────────────────────────
CREATE OR REPLACE FUNCTION public.protokoll_wer()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT btrim(COALESCE(vorname,'') || ' ' || COALESCE(nachname,''))
       FROM public.profiles WHERE id = auth.uid()),
    'System');
$$;

CREATE OR REPLACE FUNCTION public.protokoll_name(uid UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT btrim(COALESCE(vorname,'') || ' ' || COALESCE(nachname,''))
    FROM public.profiles WHERE id = uid;
$$;

-- ─── 3. Mitarbeiter (profiles) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prot_profiles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE txt TEXT := ''; nm TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Mitarbeiter', 'erstellt',
            btrim(COALESCE(NEW.vorname,'')||' '||COALESCE(NEW.nachname,'')),
            'Mitarbeiter angelegt (' || COALESCE(NEW.email,'') || ')', NEW.id::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Mitarbeiter', 'geloescht',
            btrim(COALESCE(OLD.vorname,'')||' '||COALESCE(OLD.nachname,'')),
            'Mitarbeiter gelöscht (' || COALESCE(OLD.email,'') || ')', OLD.id::text);
    RETURN OLD;
  END IF;

  -- UPDATE: nur inhaltliche Änderungen festhalten
  IF NEW.vorname       IS DISTINCT FROM OLD.vorname       THEN txt := txt || 'Vorname: '||COALESCE(OLD.vorname,'–')||' → '||COALESCE(NEW.vorname,'–')||'; '; END IF;
  IF NEW.nachname      IS DISTINCT FROM OLD.nachname      THEN txt := txt || 'Nachname: '||COALESCE(OLD.nachname,'–')||' → '||COALESCE(NEW.nachname,'–')||'; '; END IF;
  IF NEW.email         IS DISTINCT FROM OLD.email         THEN txt := txt || 'E-Mail: '||COALESCE(OLD.email,'–')||' → '||COALESCE(NEW.email,'–')||'; '; END IF;
  IF NEW.position      IS DISTINCT FROM OLD.position      THEN txt := txt || 'Position: '||COALESCE(OLD.position,'–')||' → '||COALESCE(NEW.position,'–')||'; '; END IF;
  IF NEW.role          IS DISTINCT FROM OLD.role          THEN txt := txt || 'Berechtigung: '||COALESCE(OLD.role,'–')||' → '||COALESCE(NEW.role,'–')||'; '; END IF;
  IF NEW.urlaubstage   IS DISTINCT FROM OLD.urlaubstage   THEN txt := txt || 'Urlaubstage: '||COALESCE(OLD.urlaubstage::text,'–')||' → '||COALESCE(NEW.urlaubstage::text,'–')||'; '; END IF;
  IF NEW.ueberstunden  IS DISTINCT FROM OLD.ueberstunden  THEN txt := txt || 'Überstunden: '||COALESCE(OLD.ueberstunden::text,'–')||' → '||COALESCE(NEW.ueberstunden::text,'–')||'; '; END IF;
  IF NEW.resturlaub    IS DISTINCT FROM OLD.resturlaub    THEN txt := txt || 'Resturlaub: '||COALESCE(OLD.resturlaub::text,'–')||' → '||COALESCE(NEW.resturlaub::text,'–')||'; '; END IF;
  IF NEW.wochenstunden IS DISTINCT FROM OLD.wochenstunden THEN txt := txt || 'Wochenstunden: '||COALESCE(OLD.wochenstunden::text,'–')||' → '||COALESCE(NEW.wochenstunden::text,'–')||'; '; END IF;
  IF NEW.arbeitstage_woche IS DISTINCT FROM OLD.arbeitstage_woche THEN txt := txt || 'Arbeitstage: '||COALESCE(OLD.arbeitstage_woche::text,'–')||' → '||COALESCE(NEW.arbeitstage_woche::text,'–')||'; '; END IF;
  IF NEW.pauschal      IS DISTINCT FROM OLD.pauschal      THEN txt := txt || 'Pauschalkraft: '||CASE WHEN NEW.pauschal THEN 'ja' ELSE 'nein' END||'; '; END IF;
  IF NEW.fronleichnam  IS DISTINCT FROM OLD.fronleichnam  THEN txt := txt || 'Fronleichnam: '||CASE WHEN NEW.fronleichnam THEN 'ja' ELSE 'nein' END||'; '; END IF;
  IF NEW.color         IS DISTINCT FROM OLD.color         THEN txt := txt || 'Farbe geändert; '; END IF;
  IF NEW.geburtsdatum  IS DISTINCT FROM OLD.geburtsdatum  THEN txt := txt || 'Geburtsdatum geändert; '; END IF;
  IF NEW.einstellungsdatum IS DISTINCT FROM OLD.einstellungsdatum THEN txt := txt || 'Einstellungsdatum geändert; '; END IF;

  IF txt <> '' THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Mitarbeiter', 'geaendert',
            btrim(COALESCE(NEW.vorname,'')||' '||COALESCE(NEW.nachname,'')),
            rtrim(txt,'; '), NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prot_profiles ON public.profiles;
CREATE TRIGGER trg_prot_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prot_profiles();

-- ─── 4. Urlaubseinträge (entries) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.prot_entries()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE nm TEXT; art TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    nm := public.protokoll_name(OLD.user_id);
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Urlaub', 'geloescht', nm,
            COALESCE(OLD.type,'Urlaub')||' '||to_char(OLD.von,'DD.MM.YYYY')||
            ' – '||to_char(OLD.bis,'DD.MM.YYYY')||' gelöscht', OLD.id::text);
    RETURN OLD;
  END IF;

  nm := public.protokoll_name(NEW.user_id);
  art := CASE NEW.type WHEN 'urlaub' THEN 'Urlaub'
                       WHEN 'resturlaub' THEN 'Resturlaub'
                       WHEN 'ueberstunden' THEN 'Überstundenabbau'
                       ELSE COALESCE(NEW.type,'Eintrag') END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Urlaub', 'erstellt', nm,
            art||' '||to_char(NEW.von,'DD.MM.YYYY')||' – '||to_char(NEW.bis,'DD.MM.YYYY')||
            ' ('||COALESCE(NEW.status,'pending')||')', NEW.id::text);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Urlaub',
            CASE NEW.status WHEN 'confirmed' THEN 'genehmigt'
                            WHEN 'rejected'  THEN 'abgelehnt'
                            ELSE 'geaendert' END,
            nm, art||' '||to_char(NEW.von,'DD.MM.YYYY')||' – '||to_char(NEW.bis,'DD.MM.YYYY')||
            ': '||COALESCE(OLD.status,'–')||' → '||COALESCE(NEW.status,'–'), NEW.id::text);
  ELSIF NEW.von IS DISTINCT FROM OLD.von OR NEW.bis IS DISTINCT FROM OLD.bis
     OR NEW.type IS DISTINCT FROM OLD.type THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Urlaub', 'geaendert', nm,
            'Zeitraum: '||to_char(OLD.von,'DD.MM.YYYY')||' – '||to_char(OLD.bis,'DD.MM.YYYY')||
            ' → '||to_char(NEW.von,'DD.MM.YYYY')||' – '||to_char(NEW.bis,'DD.MM.YYYY'), NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prot_entries ON public.entries;
CREATE TRIGGER trg_prot_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.prot_entries();

-- ─── 5. Positionen ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prot_positionen()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Position', 'erstellt', NEW.label_m,
            'Position angelegt (Sparte '||NEW.sparte||', Reichweite '||NEW.scope||')', NEW.key);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Position', 'geloescht', OLD.label_m,
            'Position gelöscht', OLD.key);
    RETURN OLD;
  ELSE
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Position', 'geaendert', NEW.label_m,
            'Bezeichnung/Einstellungen geändert (Sparte '||NEW.sparte||
            ', Reichweite '||NEW.scope||', Bereich '||COALESCE(NEW.bereich,'–')||')', NEW.key);
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_prot_positionen ON public.positionen;
CREATE TRIGGER trg_prot_positionen
  AFTER INSERT OR UPDATE OR DELETE ON public.positionen
  FOR EACH ROW EXECUTE FUNCTION public.prot_positionen();

-- ─── 6. Jahreskonten ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prot_jahreskonten()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE nm TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  nm := public.protokoll_name(NEW.user_id);
  IF TG_OP = 'UPDATE'
     AND NEW.urlaubstage IS NOT DISTINCT FROM OLD.urlaubstage
     AND NEW.resturlaub  IS NOT DISTINCT FROM OLD.resturlaub THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.aenderungsprotokoll
    (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
  VALUES (auth.uid(), public.protokoll_wer(), 'Urlaubskonto',
          CASE WHEN TG_OP='INSERT' THEN 'erstellt' ELSE 'geaendert' END, nm,
          'Jahr '||NEW.jahr||': '||NEW.urlaubstage||' Urlaubstage, '||
          NEW.resturlaub||' Resturlaub', NEW.user_id::text);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prot_jahreskonten ON public.jahreskonten;
CREATE TRIGGER trg_prot_jahreskonten
  AFTER INSERT OR UPDATE OR DELETE ON public.jahreskonten
  FOR EACH ROW EXECUTE FUNCTION public.prot_jahreskonten();

-- ─── 7. Überstundenanträge ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prot_ueberstunden()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE nm TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    nm := public.protokoll_name(OLD.user_id);
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Überstunden', 'geloescht', nm,
            'Antrag über '||OLD.stunden||' Std. zurückgezogen', OLD.id::text);
    RETURN OLD;
  END IF;

  nm := public.protokoll_name(NEW.user_id);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Überstunden', 'erstellt', nm,
            'Antrag über '||NEW.stunden||' Std.'||COALESCE(' ('||NEW.grund||')',''), NEW.id::text);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.aenderungsprotokoll
      (benutzer_id,benutzer_name,bereich,aktion,betrifft,beschreibung,datensatz_id)
    VALUES (auth.uid(), public.protokoll_wer(), 'Überstunden',
            CASE NEW.status WHEN 'confirmed' THEN 'genehmigt'
                            WHEN 'rejected'  THEN 'abgelehnt' ELSE 'geaendert' END,
            nm, 'Antrag über '||NEW.stunden||' Std.: '||NEW.status, NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prot_ueberstunden ON public.ueberstunden_antraege;
CREATE TRIGGER trg_prot_ueberstunden
  AFTER INSERT OR UPDATE OR DELETE ON public.ueberstunden_antraege
  FOR EACH ROW EXECUTE FUNCTION public.prot_ueberstunden();

-- ─── 8. Kontrolle ──────────────────────────────────────────────────
SELECT tgname, tgrelid::regclass AS tabelle FROM pg_trigger
WHERE NOT tgisinternal AND tgname LIKE 'trg_prot_%' ORDER BY tabelle;

SELECT zeitpunkt, benutzer_name, bereich, aktion, betrifft, beschreibung
FROM public.aenderungsprotokoll ORDER BY zeitpunkt DESC LIMIT 20;
