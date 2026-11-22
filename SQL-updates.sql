-- ═══════════════════════════════════════════════════════════════════════════
-- SQL-Updates für Urlaubsplaner — im Supabase SQL Editor ausführen
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Spalte für Einmalpasswort-Flag
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 2. admin_reset_password Funktion (setzt Passwort + Flag)
CREATE OR REPLACE FUNCTION public.admin_reset_password(target_user_id UUID, new_password TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Nur Administratoren können Passwörter zurücksetzen';
  END IF;
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;

-- 3. admin_create_user Funktion (neuer User bekommt Einmalpasswort-Flag)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT, p_password TEXT, p_vorname TEXT, p_nachname TEXT,
  p_role TEXT, p_position TEXT, p_color TEXT,
  p_urlaubstage INT, p_ueberstunden INT, p_resturlaub INT,
  p_einstellungsdatum DATE, p_geburtsdatum DATE
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') THEN
    RAISE EXCEPTION 'Nur Administratoren';
  END IF;
  new_id := gen_random_uuid();
  INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,
    raw_user_meta_data,created_at,updated_at,aud,role)
  VALUES (new_id,p_email,crypt(p_password,gen_salt('bf')),NOW(),
    json_build_object('vorname',p_vorname,'nachname',p_nachname,'role',p_role),
    NOW(),NOW(),'authenticated','authenticated');
  INSERT INTO public.profiles (id,email,role,vorname,nachname,position,color,
    urlaubstage,ueberstunden,resturlaub,einstellungsdatum,geburtsdatum,must_change_password)
  VALUES (new_id,p_email,p_role,p_vorname,p_nachname,p_position,p_color,
    p_urlaubstage,p_ueberstunden,p_resturlaub,p_einstellungsdatum,p_geburtsdatum,true);
  RETURN json_build_object('id',new_id,'email',p_email,'vorname',p_vorname);
END;
$$;
