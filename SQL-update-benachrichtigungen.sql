-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Update: Leitung über Überstundenanträge informieren
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- Wird ein Überstundenantrag gestellt, bekommen alle Zuständigen eine
-- Benachrichtigung: Administratoren, Geschäfts-/Praxisleitung und die
-- Teamleitung des jeweiligen Fachbereichs.
CREATE OR REPLACE FUNCTION public.melde_ueberstundenantrag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE antragsteller public.profiles%ROWTYPE; bereich TEXT;
BEGIN
  SELECT * INTO antragsteller FROM public.profiles WHERE id = NEW.user_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  bereich := public.pos_bereich(antragsteller.position);

  INSERT INTO public.notifications (user_id, message, type)
  SELECT p.id,
         antragsteller.vorname || ' ' || COALESCE(antragsteller.nachname,'')
         || ' hat eine Überstundenänderung von ' || NEW.stunden || ' Std. beantragt'
         || COALESCE(' (' || NEW.grund || ')', '') || '.',
         'info'
  FROM public.profiles p
  WHERE p.id <> NEW.user_id
    AND (
      p.role = 'admin'
      OR public.pos_scope(p.position) = 'alle'
      OR (public.pos_scope(p.position) = 'bereich'
          AND public.pos_bereich(p.position) = bereich)
    );

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_melde_ueberstundenantrag ON public.ueberstunden_antraege;
CREATE TRIGGER trg_melde_ueberstundenantrag
  AFTER INSERT ON public.ueberstunden_antraege
  FOR EACH ROW EXECUTE FUNCTION public.melde_ueberstundenantrag();

-- Dasselbe für Urlaubsanträge: bisher erfuhr die Leitung nur beim Blick
-- in die Einträge-Ansicht davon.
CREATE OR REPLACE FUNCTION public.melde_urlaubsantrag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE antragsteller public.profiles%ROWTYPE; bereich TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT * INTO antragsteller FROM public.profiles WHERE id = NEW.user_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  bereich := public.pos_bereich(antragsteller.position);

  INSERT INTO public.notifications (user_id, message, type, entry_id)
  SELECT p.id,
         antragsteller.vorname || ' ' || COALESCE(antragsteller.nachname,'')
         || ' hat Urlaub vom ' || to_char(NEW.von,'DD.MM.YYYY')
         || ' bis ' || to_char(NEW.bis,'DD.MM.YYYY') || ' beantragt.',
         'info', NEW.id
  FROM public.profiles p
  WHERE p.id <> NEW.user_id
    AND (
      p.role = 'admin'
      OR public.pos_scope(p.position) = 'alle'
      OR (public.pos_scope(p.position) = 'bereich'
          AND public.pos_bereich(p.position) = bereich)
    );

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_melde_urlaubsantrag ON public.entries;
CREATE TRIGGER trg_melde_urlaubsantrag
  AFTER INSERT ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.melde_urlaubsantrag();

-- ─── Kontrolle ─────────────────────────────────────────────────────
SELECT tgname, tgrelid::regclass AS tabelle
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid IN ('public.entries'::regclass,'public.ueberstunden_antraege'::regclass)
ORDER BY tabelle, tgname;
