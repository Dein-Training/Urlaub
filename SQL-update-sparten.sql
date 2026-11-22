-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Sparten Therapie/Pflege, neue Positionen
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Sparte einer Position ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pos_sparte(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p IN ('geschaeftsleitung','buchhaltung') THEN 'leitung'
    WHEN p IN ('praxisleitung','tl_physio_koenigsbrueck','tl_physio_pulsnitz',
               'tl_physio_kamenz','tl_ergo','tl_logo','tl_podo','tl_trainer',
               'physio_koenigsbrueck','physio_pulsnitz','physio_kamenz',
               'ergotherapeut','logopaede','podologe','trainer','rezeption',
               'reinigungskraft') THEN 'therapie'
    WHEN p IN ('pflegedienstleitung','tl_ambulant','tl_wg_koenigsbrueck','tl_wg_ohorn',
               'tl_wg_kamenz','tl_ip_steina','tl_ip_kamenz',
               'pflege_ambulant','pflege_wg_koenigsbrueck','pflege_wg_ohorn',
               'pflege_wg_kamenz','pflege_ip_steina','pflege_ip_kamenz',
               'haushaltspflege') THEN 'pflege'
    ELSE NULL END;
$$;

-- ─── 2. Bereich einer Position ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pos_bereich(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p
    WHEN 'buchhaltung' THEN 'buchhaltung'
    -- Therapie
    WHEN 'tl_physio_koenigsbrueck' THEN 'physio_koenigsbrueck'
    WHEN 'physio_koenigsbrueck'    THEN 'physio_koenigsbrueck'
    WHEN 'tl_physio_pulsnitz'      THEN 'physio_pulsnitz'
    WHEN 'physio_pulsnitz'         THEN 'physio_pulsnitz'
    WHEN 'tl_physio_kamenz'        THEN 'physio_kamenz'
    WHEN 'physio_kamenz'           THEN 'physio_kamenz'
    WHEN 'tl_ergo'    THEN 'ergo'      WHEN 'ergotherapeut' THEN 'ergo'
    WHEN 'tl_logo'    THEN 'logo'      WHEN 'logopaede'     THEN 'logo'
    WHEN 'tl_podo'    THEN 'podo'      WHEN 'podologe'      THEN 'podo'
    WHEN 'tl_trainer' THEN 'trainer'   WHEN 'trainer'       THEN 'trainer'
    WHEN 'rezeption'  THEN 'rezeption'
    WHEN 'reinigungskraft' THEN 'reinigung'
    -- Pflege
    WHEN 'tl_ambulant'         THEN 'ambulant'  WHEN 'pflege_ambulant'         THEN 'ambulant'
    WHEN 'tl_wg_koenigsbrueck' THEN 'wg_koenigsbrueck'
    WHEN 'pflege_wg_koenigsbrueck' THEN 'wg_koenigsbrueck'
    WHEN 'tl_wg_ohorn'  THEN 'wg_ohorn'  WHEN 'pflege_wg_ohorn'  THEN 'wg_ohorn'
    WHEN 'tl_wg_kamenz' THEN 'wg_kamenz' WHEN 'pflege_wg_kamenz' THEN 'wg_kamenz'
    WHEN 'tl_ip_steina' THEN 'ip_steina' WHEN 'pflege_ip_steina' THEN 'ip_steina'
    WHEN 'tl_ip_kamenz' THEN 'ip_kamenz' WHEN 'pflege_ip_kamenz' THEN 'ip_kamenz'
    WHEN 'haushaltspflege' THEN 'haushalt'
    ELSE NULL END;
$$;

-- ─── 3. Reichweite: alle > sparte > bereich > selbst ───────────────
CREATE OR REPLACE FUNCTION public.pos_scope(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p = 'geschaeftsleitung' THEN 'alle'
    WHEN p IN ('praxisleitung','pflegedienstleitung') THEN 'sparte'
    WHEN p LIKE 'tl\_%' THEN 'bereich'
    ELSE 'selbst' END;
$$;

-- ─── 4. Rechteprüfung mit Spartenebene ─────────────────────────────
CREATE OR REPLACE FUNCTION public.darf_verwalten(target_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE ich public.profiles%ROWTYPE; ziel public.profiles%ROWTYPE; sc TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF auth.uid() = target_id THEN RETURN TRUE; END IF;

  SELECT * INTO ich FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF ich.role = 'admin' THEN RETURN TRUE; END IF;

  sc := public.pos_scope(ich.position);
  IF sc = 'alle' THEN RETURN TRUE; END IF;

  SELECT * INTO ziel FROM public.profiles WHERE id = target_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Praxis-/Pflegedienstleitung: gesamte eigene Sparte.
  -- Geschäftsleitung und Buchhaltung liegen in der Sparte 'leitung'
  -- und bleiben damit automatisch ausgeschlossen.
  IF sc = 'sparte' THEN
    RETURN public.pos_sparte(ich.position) IS NOT NULL
       AND public.pos_sparte(ziel.position) = public.pos_sparte(ich.position);
  END IF;

  IF sc = 'bereich' THEN
    RETURN public.pos_bereich(ich.position) IS NOT NULL
       AND public.pos_bereich(ziel.position) = public.pos_bereich(ich.position);
  END IF;

  RETURN FALSE;
END; $$;

-- ─── 5. Bestehende Physiotherapie-Einträge zuordnen ────────────────
-- Alte Sammelpositionen auf einen Standort setzen; bitte anschließend
-- im Mitarbeiter-Dialog je Person den richtigen Standort auswählen.
UPDATE public.profiles SET position = 'physio_kamenz'    WHERE position = 'physiotherapeut';
UPDATE public.profiles SET position = 'tl_physio_kamenz' WHERE position = 'tl_physio';

-- ─── 6. Kontrolle ──────────────────────────────────────────────────
SELECT vorname, nachname, position,
       public.pos_sparte(position)  AS sparte,
       public.pos_scope(position)   AS reichweite,
       public.pos_bereich(position) AS bereich
FROM public.profiles ORDER BY sparte NULLS LAST, position, nachname;
