-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Update: Urlaubskonto gegen Selbstbedienung schützen
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- Mitarbeiter ohne Leitungsfunktion dürfen ihr eigenes Urlaubskonto,
-- ihre Überstunden, Arbeitszeit, Position und Berechtigung NICHT selbst ändern.
-- Die RLS-Policy erlaubt das Bearbeiten des eigenen Profils (Name, Farbe,
-- Geburtsdatum) — dieser Trigger schützt gezielt die kritischen Spalten.

CREATE OR REPLACE FUNCTION public.schuetze_urlaubskonto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE ich public.profiles%ROWTYPE; darf BOOLEAN;
BEGIN
  -- Kein angemeldeter Benutzer (z. B. Serverprozess) → unverändert durchlassen
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO ich FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Wer darf diese Felder pflegen? Administratoren, Geschäfts-/Praxisleitung
  -- und Teamleitungen (für ihren Bereich; das prüft bereits darf_verwalten).
  darf := ich.role = 'admin'
       OR public.pos_scope(ich.position) IN ('alle','bereich');

  -- Zusätzlich muss die Person das Zielprofil überhaupt verwalten dürfen
  IF darf THEN
    darf := public.darf_verwalten(NEW.id);
  END IF;

  IF NOT darf THEN
    -- Geschützte Felder auf die alten Werte zurücksetzen
    NEW.urlaubstage       := OLD.urlaubstage;
    NEW.ueberstunden      := OLD.ueberstunden;
    NEW.resturlaub        := OLD.resturlaub;
    NEW.wochenstunden     := OLD.wochenstunden;
    NEW.arbeitstage_woche := OLD.arbeitstage_woche;
    NEW.position          := OLD.position;
    NEW.role              := OLD.role;
    NEW.einstellungsdatum := OLD.einstellungsdatum;
  END IF;

  -- Niemand darf sich selbst die Administratorrolle geben
  IF NEW.id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role AND ich.role <> 'admin' THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_schuetze_urlaubskonto ON public.profiles;
CREATE TRIGGER trg_schuetze_urlaubskonto
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.schuetze_urlaubskonto();

-- ─── Kontrolle ─────────────────────────────────────────────────────
SELECT tgname AS trigger_name, tgrelid::regclass AS tabelle
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;
