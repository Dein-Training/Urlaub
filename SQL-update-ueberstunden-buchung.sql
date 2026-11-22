-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Überstundenbuchung absichern + Diagnose
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. DIAGNOSE ZUERST ────────────────────────────────────────────
-- Zeigt alle Überstundenanträge mit Status und was daraus wurde.
SELECT a.created_at, p.vorname, a.stunden, a.status,
       a.entschieden_am, e.vorname AS entschieden_von,
       p.ueberstunden AS konto_aktuell,
       ROUND(p.wochenstunden / NULLIF(p.arbeitstage_woche,0), 2) AS std_pro_tag
FROM public.ueberstunden_antraege a
JOIN public.profiles p ON p.id = a.user_id
LEFT JOIN public.profiles e ON e.id = a.entschieden_von
ORDER BY a.created_at DESC;

-- ─── 2. Schutztrigger für die Buchung durchlässig machen ───────────
-- Der Trigger schuetze_urlaubskonto setzt Überstunden auf den alten Wert
-- zurück, wenn die handelnde Person keine Leitungsrolle hat. Die Buchung
-- durch die Genehmigungsfunktion muss davon ausgenommen sein — sonst kann
-- die Änderung stillschweigend verworfen werden.
CREATE OR REPLACE FUNCTION public.schuetze_urlaubskonto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE ich public.profiles%ROWTYPE; darf BOOLEAN;
BEGIN
  -- Buchung aus der geprüften Genehmigungsfunktion → unverändert durchlassen
  IF current_setting('app.kontobuchung', true) = 'an' THEN
    RETURN NEW;
  END IF;

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
  END IF;

  IF NEW.id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role AND ich.role <> 'admin' THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END; $$;

-- ─── 3. Genehmigungsfunktion: Buchung nachweisbar machen ───────────
CREATE OR REPLACE FUNCTION public.ueberstunden_entscheiden(
  p_antrag UUID, p_status TEXT, p_hinweis TEXT DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE a public.ueberstunden_antraege%ROWTYPE;
        ziel public.profiles%ROWTYPE;
        ich  public.profiles%ROWTYPE;
        std_pro_tag NUMERIC; tage NUMERIC; neu NUMERIC; kontrolle NUMERIC;
BEGIN
  IF p_status NOT IN ('confirmed','rejected') THEN
    RAISE EXCEPTION 'Ungültiger Status';
  END IF;

  SELECT * INTO a FROM public.ueberstunden_antraege WHERE id = p_antrag;
  IF NOT FOUND THEN RAISE EXCEPTION 'Antrag nicht gefunden'; END IF;
  IF a.status <> 'pending' THEN
    RAISE EXCEPTION 'Dieser Antrag wurde bereits am % entschieden', a.entschieden_am;
  END IF;

  SELECT * INTO ich FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Kein Profil gefunden'; END IF;

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
      RAISE EXCEPTION 'Arbeitszeit von % ist nicht hinterlegt', ziel.vorname;
    END IF;
    tage := ROUND(a.stunden / std_pro_tag, 2);
    neu  := ROUND(COALESCE(ziel.ueberstunden,0) + tage, 2);
    IF neu < 0 THEN
      RAISE EXCEPTION 'Das Überstundenkonto würde negativ (%). Bitte Antrag anpassen', neu;
    END IF;

    -- Schutztrigger für diese eine Buchung aussetzen
    PERFORM set_config('app.kontobuchung', 'an', true);
    UPDATE public.profiles SET ueberstunden = neu WHERE id = a.user_id;
    PERFORM set_config('app.kontobuchung', 'aus', true);

    -- Nachweis: wurde der Wert wirklich geschrieben?
    SELECT ueberstunden INTO kontrolle FROM public.profiles WHERE id = a.user_id;
    IF kontrolle IS DISTINCT FROM neu THEN
      RAISE EXCEPTION 'Buchung fehlgeschlagen: Konto steht auf % statt %', kontrolle, neu;
    END IF;
  END IF;

  UPDATE public.ueberstunden_antraege
     SET status = p_status, entschieden_von = auth.uid(),
         entschieden_am = NOW(), hinweis = p_hinweis
   WHERE id = p_antrag;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (a.user_id,
    CASE WHEN p_status = 'confirmed'
      THEN 'Dein Überstundenantrag über ' || a.stunden || ' Std. wurde genehmigt. Neues Konto: '
           || neu || ' Tage.'
      ELSE 'Dein Überstundenantrag über ' || a.stunden || ' Std. wurde abgelehnt.'
    END || COALESCE(' Hinweis: ' || p_hinweis, ''),
    CASE WHEN p_status = 'confirmed' THEN 'success' ELSE 'warn' END);

  RETURN json_build_object('status', p_status, 'ueberstunden_neu', neu, 'tage', tage);
END; $$;
