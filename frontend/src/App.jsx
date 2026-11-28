import { useState, useRef, useEffect } from "react";
import {
  supabase, signIn, signOut, getSession,
  getProfile, getAllProfiles, updateProfile, createUser, deleteUser, signOutHart, sessionAusSpeicher,
  getAllEntries, getMyEntries, getConfirmedEntries,
  createEntry, updateEntry, setEntryStatus, deleteEntry, checkConflicts,
  adminResetPassword, requestPasswordReset,
  getPasswordResetRequests, dismissResetRequest,
  createNotification, getMyNotifications, markNotificationRead,
  clearMustChangePassword,
  getJahreskonten, setJahreskonto, uebertragBerechnen,
  getPositionen, savePosition, deletePosition, getProtokoll,
  getEinstellungen, saveEinstellungen, deleteEinstellung, getUeKonto,
  getZusatzrechte, saveZusatzrecht, deleteZusatzrecht,
  createUeberstundenAntrag, getUeberstundenAntraege,
  decideUeberstundenAntrag, deleteUeberstundenAntrag,
} from "./supabase.js";
import { urlaubsUebersichtPdf, pdfAusgeben } from "./pdf.js";

// ─── Feiertagsdaten 2025–2027 (alle 16 Bundesländer) ─────────────────────────
const KALENDER_DB = {"BW":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-01-06":"Heilige Drei Könige","2025-06-19":"Fronleichnam","2025-11-01":"Allerheiligen"},"ferien":[["2025-01-07","2025-01-07","Heilige Drei Könige"],["2025-03-27","2025-04-04","Osterferien"],["2025-05-30","2025-05-30","Pfingstfreitag"],["2025-06-10","2025-06-21","Pfingstferien"],["2025-07-31","2025-09-13","Sommerferien"],["2025-10-28","2025-10-31","Herbstferien"],["2025-12-22","2026-01-06","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-01-06":"Heilige Drei Könige","2026-06-04":"Fronleichnam","2026-11-01":"Allerheiligen"},"ferien":[["2026-01-06","2026-01-06","Heilige Drei Könige"],["2026-04-09","2026-04-18","Osterferien"],["2026-06-09","2026-06-20","Pfingstferien"],["2026-07-30","2026-09-12","Sommerferien"],["2026-11-02","2026-11-06","Herbstferien"],["2026-12-23","2027-01-08","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-01-06":"Heilige Drei Könige","2027-05-27":"Fronleichnam","2027-11-01":"Allerheiligen"},"ferien":[["2027-03-29","2027-04-10","Osterferien"],["2027-06-08","2027-06-19","Pfingstferien"],["2027-07-29","2027-09-11","Sommerferien"],["2027-11-01","2027-11-05","Herbstferien"],["2027-12-22","2028-01-07","Weihnachtsferien"]]}},"BY":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-01-06":"Heilige Drei Könige","2025-06-19":"Fronleichnam","2025-08-15":"Mariä Himmelfahrt","2025-11-01":"Allerheiligen"},"ferien":[["2025-02-27","2025-03-07","Winterferien"],["2025-04-14","2025-04-25","Osterferien"],["2025-07-31","2025-09-12","Sommerferien"],["2025-11-03","2025-11-07","Herbstferien"],["2025-12-24","2026-01-05","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-01-06":"Heilige Drei Könige","2026-06-04":"Fronleichnam","2026-08-15":"Mariä Himmelfahrt","2026-11-01":"Allerheiligen"},"ferien":[["2026-02-19","2026-02-27","Winterferien"],["2026-04-09","2026-04-17","Osterferien"],["2026-07-30","2026-09-11","Sommerferien"],["2026-11-02","2026-11-06","Herbstferien"],["2026-12-23","2027-01-08","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-01-06":"Heilige Drei Könige","2027-05-27":"Fronleichnam","2027-08-15":"Mariä Himmelfahrt","2027-11-01":"Allerheiligen"},"ferien":[["2027-03-01","2027-03-05","Winterferien"],["2027-03-29","2027-04-09","Osterferien"],["2027-07-29","2027-09-10","Sommerferien"],["2027-11-01","2027-11-05","Herbstferien"],["2027-12-24","2028-01-05","Weihnachtsferien"]]}},"BE":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-03-08":"Internationaler Frauentag"},"ferien":[["2025-01-27","2025-02-07","Winterferien"],["2025-04-14","2025-04-25","Osterferien"],["2025-07-24","2025-09-06","Sommerferien"],["2025-10-20","2025-11-01","Herbstferien"],["2025-12-22","2026-01-02","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-03-08":"Internationaler Frauentag"},"ferien":[["2026-02-02","2026-02-06","Winterferien"],["2026-04-01","2026-04-17","Osterferien"],["2026-07-16","2026-08-28","Sommerferien"],["2026-10-19","2026-10-30","Herbstferien"],["2026-12-21","2027-01-03","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-03-08":"Internationaler Frauentag"},"ferien":[["2027-02-01","2027-02-05","Winterferien"],["2027-03-22","2027-04-03","Osterferien"],["2027-07-15","2027-08-27","Sommerferien"],["2027-10-11","2027-10-22","Herbstferien"],["2027-12-20","2028-01-02","Weihnachtsferien"]]}},"BB":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-10-31":"Reformationstag"},"ferien":[["2025-01-27","2025-02-07","Winterferien"],["2025-04-14","2025-04-25","Osterferien"],["2025-07-24","2025-09-06","Sommerferien"],["2025-10-20","2025-11-01","Herbstferien"],["2025-12-22","2026-01-02","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-10-31":"Reformationstag"},"ferien":[["2026-02-02","2026-02-06","Winterferien"],["2026-04-01","2026-04-17","Osterferien"],["2026-07-16","2026-08-28","Sommerferien"],["2026-10-19","2026-10-30","Herbstferien"],["2026-12-21","2027-01-03","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-10-31":"Reformationstag"},"ferien":[["2027-02-01","2027-02-05","Winterferien"],["2027-03-22","2027-04-03","Osterferien"],["2027-07-15","2027-08-27","Sommerferien"],["2027-10-11","2027-10-22","Herbstferien"],["2027-12-20","2028-01-02","Weihnachtsferien"]]}},"HB":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-10-31":"Reformationstag"},"ferien":[["2025-02-03","2025-02-04","Winterferien"],["2025-04-14","2025-04-25","Osterferien"],["2025-06-26","2025-08-06","Sommerferien"],["2025-10-13","2025-10-24","Herbstferien"],["2025-12-22","2026-01-06","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-10-31":"Reformationstag"},"ferien":[["2026-02-02","2026-02-03","Winterferien"],["2026-03-25","2026-04-09","Osterferien"],["2026-06-25","2026-08-05","Sommerferien"],["2026-10-12","2026-10-23","Herbstferien"],["2026-12-23","2027-01-06","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-10-31":"Reformationstag"},"ferien":[["2027-02-01","2027-02-02","Winterferien"],["2027-03-22","2027-04-07","Osterferien"],["2027-06-24","2027-08-04","Sommerferien"],["2027-10-11","2027-10-22","Herbstferien"],["2027-12-22","2028-01-05","Weihnachtsferien"]]}},"HH":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-10-31":"Reformationstag"},"ferien":[["2025-01-31","2025-01-31","Winterferien"],["2025-03-10","2025-03-21","Frühjahrsferien"],["2025-07-10","2025-08-20","Sommerferien"],["2025-10-03","2025-10-17","Herbstferien"],["2025-12-19","2026-01-02","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-10-31":"Reformationstag"},"ferien":[["2026-01-30","2026-01-30","Winterferien"],["2026-03-02","2026-03-13","Frühjahrsferien"],["2026-07-16","2026-08-26","Sommerferien"],["2026-10-05","2026-10-16","Herbstferien"],["2026-12-18","2027-01-01","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-10-31":"Reformationstag"},"ferien":[["2027-03-01","2027-03-12","Frühjahrsferien"],["2027-07-15","2027-08-25","Sommerferien"],["2027-10-04","2027-10-15","Herbstferien"],["2027-12-20","2027-12-31","Weihnachtsferien"]]}},"HE":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-06-19":"Fronleichnam"},"ferien":[["2025-03-24","2025-04-04","Osterferien"],["2025-07-07","2025-08-15","Sommerferien"],["2025-10-13","2025-10-25","Herbstferien"],["2025-12-22","2026-01-09","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-06-04":"Fronleichnam"},"ferien":[["2026-03-30","2026-04-10","Osterferien"],["2026-07-06","2026-08-14","Sommerferien"],["2026-10-12","2026-10-24","Herbstferien"],["2026-12-21","2027-01-08","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-05-27":"Fronleichnam"},"ferien":[["2027-03-29","2027-04-09","Osterferien"],["2027-07-05","2027-08-13","Sommerferien"],["2027-10-11","2027-10-23","Herbstferien"],["2027-12-22","2028-01-07","Weihnachtsferien"]]}},"MV":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-03-08":"Internationaler Frauentag","2025-10-31":"Reformationstag"},"ferien":[["2025-02-17","2025-02-22","Winterferien"],["2025-04-14","2025-04-25","Osterferien"],["2025-07-07","2025-08-16","Sommerferien"],["2025-10-04","2025-10-18","Herbstferien"],["2025-12-22","2026-01-03","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-03-08":"Internationaler Frauentag","2026-10-31":"Reformationstag"},"ferien":[["2026-02-16","2026-02-21","Winterferien"],["2026-04-01","2026-04-11","Osterferien"],["2026-07-06","2026-08-15","Sommerferien"],["2026-10-05","2026-10-16","Herbstferien"],["2026-12-21","2027-01-02","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-03-08":"Internationaler Frauentag","2027-10-31":"Reformationstag"},"ferien":[["2027-02-15","2027-02-20","Winterferien"],["2027-03-22","2027-04-03","Osterferien"],["2027-07-05","2027-08-14","Sommerferien"],["2027-10-04","2027-10-15","Herbstferien"],["2027-12-22","2027-12-31","Weihnachtsferien"]]}},"NI":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-10-31":"Reformationstag"},"ferien":[["2025-01-31","2025-01-31","Winterferien"],["2025-04-07","2025-04-22","Osterferien"],["2025-06-26","2025-08-06","Sommerferien"],["2025-10-13","2025-10-25","Herbstferien"],["2025-12-22","2026-01-05","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-10-31":"Reformationstag"},"ferien":[["2026-02-02","2026-02-03","Winterferien"],["2026-03-25","2026-04-09","Osterferien"],["2026-06-25","2026-08-05","Sommerferien"],["2026-10-12","2026-10-24","Herbstferien"],["2026-12-23","2027-01-05","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-10-31":"Reformationstag"},"ferien":[["2027-02-01","2027-02-02","Winterferien"],["2027-03-22","2027-04-07","Osterferien"],["2027-06-24","2027-08-04","Sommerferien"],["2027-10-11","2027-10-23","Herbstferien"],["2027-12-22","2028-01-04","Weihnachtsferien"]]}},"NW":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-06-19":"Fronleichnam","2025-11-01":"Allerheiligen"},"ferien":[["2025-04-14","2025-04-25","Osterferien"],["2025-06-23","2025-08-05","Sommerferien"],["2025-10-13","2025-10-25","Herbstferien"],["2025-12-22","2026-01-06","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-06-04":"Fronleichnam","2026-11-01":"Allerheiligen"},"ferien":[["2026-03-30","2026-04-11","Osterferien"],["2026-06-29","2026-08-11","Sommerferien"],["2026-10-05","2026-10-17","Herbstferien"],["2026-12-23","2027-01-06","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-05-27":"Fronleichnam","2027-11-01":"Allerheiligen"},"ferien":[["2027-03-29","2027-04-10","Osterferien"],["2027-06-28","2027-08-10","Sommerferien"],["2027-10-04","2027-10-16","Herbstferien"],["2027-12-22","2028-01-05","Weihnachtsferien"]]}},"RP":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-06-19":"Fronleichnam","2025-11-01":"Allerheiligen"},"ferien":[["2025-04-14","2025-04-25","Osterferien"],["2025-06-23","2025-08-01","Sommerferien"],["2025-10-13","2025-10-24","Herbstferien"],["2025-12-22","2026-01-07","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-06-04":"Fronleichnam","2026-11-01":"Allerheiligen"},"ferien":[["2026-03-30","2026-04-10","Osterferien"],["2026-06-29","2026-08-07","Sommerferien"],["2026-10-12","2026-10-23","Herbstferien"],["2026-12-23","2027-01-06","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-05-27":"Fronleichnam","2027-11-01":"Allerheiligen"},"ferien":[["2027-03-29","2027-04-09","Osterferien"],["2027-06-28","2027-08-06","Sommerferien"],["2027-10-11","2027-10-22","Herbstferien"],["2027-12-22","2028-01-05","Weihnachtsferien"]]}},"SL":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-06-19":"Fronleichnam","2025-08-15":"Mariä Himmelfahrt","2025-11-01":"Allerheiligen"},"ferien":[["2025-04-14","2025-04-25","Osterferien"],["2025-06-23","2025-08-01","Sommerferien"],["2025-10-20","2025-11-01","Herbstferien"],["2025-12-22","2026-01-07","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-06-04":"Fronleichnam","2026-08-15":"Mariä Himmelfahrt","2026-11-01":"Allerheiligen"},"ferien":[["2026-03-30","2026-04-10","Osterferien"],["2026-06-29","2026-08-07","Sommerferien"],["2026-10-19","2026-10-31","Herbstferien"],["2026-12-23","2027-01-06","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-05-27":"Fronleichnam","2027-08-15":"Mariä Himmelfahrt","2027-11-01":"Allerheiligen"},"ferien":[["2027-03-29","2027-04-09","Osterferien"],["2027-06-28","2027-08-06","Sommerferien"],["2027-10-18","2027-10-30","Herbstferien"],["2027-12-22","2028-01-05","Weihnachtsferien"]]}},"SN":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-06-19":"Fronleichnam","2025-10-31":"Reformationstag","2025-11-19":"Buß- und Bettag"},"ferien":[["2025-02-17","2025-03-01","Winterferien"],["2025-04-18","2025-04-26","Osterferien"],["2025-07-21","2025-08-29","Sommerferien"],["2025-10-06","2025-10-17","Herbstferien"],["2025-12-22","2026-01-02","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-06-04":"Fronleichnam","2026-10-31":"Reformationstag","2026-11-18":"Buß- und Bettag"},"ferien":[["2026-02-16","2026-02-28","Winterferien"],["2026-04-09","2026-04-18","Osterferien"],["2026-07-20","2026-08-28","Sommerferien"],["2026-10-05","2026-10-16","Herbstferien"],["2026-12-21","2027-01-02","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-05-27":"Fronleichnam","2027-10-31":"Reformationstag","2027-11-17":"Buß- und Bettag"},"ferien":[["2027-02-15","2027-02-27","Winterferien"],["2027-03-29","2027-04-10","Osterferien"],["2027-07-19","2027-08-27","Sommerferien"],["2027-10-04","2027-10-15","Herbstferien"],["2027-12-22","2027-12-31","Weihnachtsferien"]]}},"ST":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-01-06":"Heilige Drei Könige","2025-10-31":"Reformationstag"},"ferien":[["2025-02-17","2025-02-22","Winterferien"],["2025-04-14","2025-04-24","Osterferien"],["2025-07-10","2025-08-20","Sommerferien"],["2025-10-20","2025-11-01","Herbstferien"],["2025-12-22","2026-01-06","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-01-06":"Heilige Drei Könige","2026-10-31":"Reformationstag"},"ferien":[["2026-02-09","2026-02-14","Winterferien"],["2026-04-01","2026-04-11","Osterferien"],["2026-07-09","2026-08-19","Sommerferien"],["2026-10-19","2026-10-31","Herbstferien"],["2026-12-21","2027-01-06","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-01-06":"Heilige Drei Könige","2027-10-31":"Reformationstag"},"ferien":[["2027-02-08","2027-02-13","Winterferien"],["2027-03-22","2027-04-03","Osterferien"],["2027-07-08","2027-08-18","Sommerferien"],["2027-10-18","2027-10-30","Herbstferien"],["2027-12-22","2028-01-05","Weihnachtsferien"]]}},"SH":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-10-31":"Reformationstag"},"ferien":[["2025-04-07","2025-04-18","Osterferien"],["2025-06-26","2025-08-06","Sommerferien"],["2025-10-13","2025-10-24","Herbstferien"],["2025-12-22","2026-01-05","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-10-31":"Reformationstag"},"ferien":[["2026-03-30","2026-04-17","Osterferien"],["2026-06-25","2026-08-05","Sommerferien"],["2026-10-12","2026-10-23","Herbstferien"],["2026-12-23","2027-01-05","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-10-31":"Reformationstag"},"ferien":[["2027-03-22","2027-04-07","Osterferien"],["2027-06-24","2027-08-04","Sommerferien"],["2027-10-11","2027-10-22","Herbstferien"],["2027-12-22","2028-01-04","Weihnachtsferien"]]}},"TH":{"2025":{"feiertage":{"2025-01-01":"Neujahr","2025-04-18":"Karfreitag","2025-04-20":"Ostersonntag","2025-04-21":"Ostermontag","2025-05-01":"Tag der Arbeit","2025-05-29":"Christi Himmelfahrt","2025-06-08":"Pfingstsonntag","2025-06-09":"Pfingstmontag","2025-10-03":"Tag der Deutschen Einheit","2025-12-25":"1. Weihnachtstag","2025-12-26":"2. Weihnachtstag","2025-06-19":"Fronleichnam","2025-09-20":"Weltkindertag","2025-10-31":"Reformationstag"},"ferien":[["2025-02-17","2025-02-22","Winterferien"],["2025-04-14","2025-04-25","Osterferien"],["2025-07-07","2025-08-16","Sommerferien"],["2025-10-20","2025-11-01","Herbstferien"],["2025-12-22","2026-01-03","Weihnachtsferien"]]},"2026":{"feiertage":{"2026-01-01":"Neujahr","2026-04-03":"Karfreitag","2026-04-05":"Ostersonntag","2026-04-06":"Ostermontag","2026-05-01":"Tag der Arbeit","2026-05-14":"Christi Himmelfahrt","2026-05-24":"Pfingstsonntag","2026-05-25":"Pfingstmontag","2026-10-03":"Tag der Deutschen Einheit","2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag","2026-06-04":"Fronleichnam","2026-09-20":"Weltkindertag","2026-10-31":"Reformationstag"},"ferien":[["2026-02-16","2026-02-21","Winterferien"],["2026-04-01","2026-04-11","Osterferien"],["2026-07-06","2026-08-15","Sommerferien"],["2026-10-19","2026-10-31","Herbstferien"],["2026-12-21","2027-01-02","Weihnachtsferien"]]},"2027":{"feiertage":{"2027-01-01":"Neujahr","2027-03-26":"Karfreitag","2027-03-28":"Ostersonntag","2027-03-29":"Ostermontag","2027-05-01":"Tag der Arbeit","2027-05-06":"Christi Himmelfahrt","2027-05-16":"Pfingstsonntag","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag","2027-12-26":"2. Weihnachtstag","2027-05-27":"Fronleichnam","2027-09-20":"Weltkindertag","2027-10-31":"Reformationstag"},"ferien":[["2027-02-15","2027-02-20","Winterferien"],["2027-03-22","2027-04-03","Osterferien"],["2027-07-05","2027-08-14","Sommerferien"],["2027-10-18","2027-10-30","Herbstferien"],["2027-12-22","2027-12-31","Weihnachtsferien"]]}}};



// ─── Sicheres Passwort generieren ────────────────────────────────────────────
function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const pick = (s, n) => Array.from({length:n}, ()=>s[Math.floor(Math.random()*s.length)]);
  const all = [...pick(upper,3),...pick(lower,3),...pick(digits,3),...pick(special,2)];
  for(let i=all.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[all[i],all[j]]=[all[j],all[i]];}
  return all.join("");
}

// ─── Urlaubstage anhand Betriebszugehörigkeit berechnen ──────────────────────
function calcUrlaubstage(einstellungsdatum, refYear=new Date().getFullYear()) {
  if (!einstellungsdatum) return 26;
  const einDate = new Date(einstellungsdatum);
  const refDate = new Date(refYear, 11, 31); // 31.12. des Referenzjahres
  let jahre = refDate.getFullYear() - einDate.getFullYear();
  // Exakt: hat der MA das Jubiläum im Referenzjahr schon erreicht?
  const jubiläum = new Date(refYear, einDate.getMonth(), einDate.getDate());
  if (refDate < jubiläum) jahre--;
  if (jahre < 1) return 26;
  if (jahre < 5) return 27;
  if (jahre < 10) return 28;
  return 29;
}

const BUNDESLAENDER=[["","—"],["BW","Baden-Württemberg"],["BY","Bayern"],["BE","Berlin"],["BB","Brandenburg"],["HB","Bremen"],["HH","Hamburg"],["HE","Hessen"],["MV","Mecklenburg-Vorpommern"],["NI","Niedersachsen"],["NW","Nordrhein-Westfalen"],["RP","Rheinland-Pfalz"],["SL","Saarland"],["SN","Sachsen"],["ST","Sachsen-Anhalt"],["SH","Schleswig-Holstein"],["TH","Thüringen"]];
const MONTHS=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DAYS_SHORT=["Mo","Di","Mi","Do","Fr","Sa","So"];
const PRESET_COLORS=["#2563EB","#DC2626","#059669","#D97706","#7C3AED","#DB2777","#0891B2","#65A30D","#EA580C","#0F766E"];

// ─── Kalender-Helpers ─────────────────────────────────────────────────────────
// Ostersonntag nach der Gaußschen Osterformel — Grundlage aller beweglichen Feiertage
function osterSonntag(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
        f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
        i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
        mo=Math.floor((h+l-7*m+114)/31),tg=((h+l-7*m+114)%31)+1;
  return new Date(y,mo-1,tg);
}
const plusTage=(dt,n)=>{const d=new Date(dt);d.setDate(d.getDate()+n);return d;};
// Bundeslandspezifische Feiertage
const FT_REGIONAL={
  dreikoenige:["BW","BY","ST"],
  fronleichnam:["BW","BY","HE","NW","RP","SL"],   // in SN nur einzelne Gemeinden → je Mitarbeiter
  mariaeHimmelfahrt:["BY","SL"],
  reformation:["BB","HB","HH","MV","NI","SN","ST","SH","TH"],
  allerheiligen:["BW","BY","NW","RP","SL"],
  bussUndBettag:["SN"],
  frauentag:["BE","MV"],
  weltkindertag:["TH"],
};
// Buß- und Bettag: Mittwoch vor dem 23. November
function bussBettag(y){const d=new Date(y,10,23);d.setDate(23-((d.getDay()+4)%7||7));return d;}
function berechneFeiertage(state,y){
  const ft={},setze=(dt,name)=>{ft[isoOf(dt)]=name;};
  const o=osterSonntag(y);
  setze(new Date(y,0,1),"Neujahr");
  setze(plusTage(o,-2),"Karfreitag");
  setze(o,"Ostersonntag");
  setze(plusTage(o,1),"Ostermontag");
  setze(new Date(y,4,1),"Tag der Arbeit");
  setze(plusTage(o,39),"Christi Himmelfahrt");
  setze(plusTage(o,49),"Pfingstsonntag");
  setze(plusTage(o,50),"Pfingstmontag");
  setze(new Date(y,9,3),"Tag der Deutschen Einheit");
  setze(new Date(y,11,25),"1. Weihnachtstag");
  setze(new Date(y,11,26),"2. Weihnachtstag");
  const hat=k=>FT_REGIONAL[k].includes(state);
  if(hat("dreikoenige"))       setze(new Date(y,0,6),"Heilige Drei Könige");
  if(hat("frauentag"))         setze(new Date(y,2,8),"Internationaler Frauentag");
  if(hat("fronleichnam"))      setze(plusTage(o,60),"Fronleichnam");
  if(hat("mariaeHimmelfahrt")) setze(new Date(y,7,15),"Mariä Himmelfahrt");
  if(hat("weltkindertag"))     setze(new Date(y,8,20),"Weltkindertag");
  if(hat("reformation"))       setze(new Date(y,9,31),"Reformationstag");
  if(hat("allerheiligen"))     setze(new Date(y,10,1),"Allerheiligen");
  if(hat("bussUndBettag"))     setze(bussBettag(y),"Buß- und Bettag");
  return ft;
}
// Fronleichnam = Ostersonntag + 60 Tage. In Sachsen nur in einzelnen Gemeinden
// des Landkreises Bautzen gesetzlicher Feiertag — deshalb je Mitarbeiter wählbar.
const FRONLEICHNAM_WAHL_BL=["SN","TH"];
const FL_CACHE={};
function fronleichnamISO(y){
  if(!FL_CACHE[y])FL_CACHE[y]=isoOf(plusTage(osterSonntag(y),60));
  return FL_CACHE[y];
}
const FT_CACHE={};
// Hinterlegte Jahre nutzen; für alle anderen Jahre die Feiertage berechnen.
// Ferien werden von den Kultusministerien festgelegt und lassen sich nicht berechnen.
function getSD(state,year){
  if(!state)return{feiertage:{},ferien:[]};
  const y=String(year);
  // 1. Amtliche Daten aus der API (falls geladen)
  if(API_DB[state+y])return API_DB[state+y];
  // 2. Fest hinterlegte Daten
  const db=KALENDER_DB[state];
  if(db&&db[y])return db[y];
  // 3. Berechnete Feiertage
  const key=state+y;
  if(!FT_CACHE[key])FT_CACHE[key]={feiertage:berechneFeiertage(state,Number(year)),ferien:[]};
  return FT_CACHE[key];
}
// ─── Amtliche Daten von der OpenHolidays-API ────────────────────────────────
// Kostenfreies Open-Data-Projekt mit Feiertagen UND Schulferien aller Bundesländer.
// Die Daten werden im Browser zwischengespeichert, damit die App auch offline läuft.
const API_DB={};                       // "SN2028" -> {feiertage,ferien}
const API_BASIS="https://openholidaysapi.org";
const API_CACHE_TAGE=14;
const apiKey=(st,y)=>"up_kal_"+st+"_"+y;

function ausCache(st,y){
  try{
    const roh=localStorage.getItem(apiKey(st,y));
    if(!roh)return null;
    const c=JSON.parse(roh);
    if(Date.now()-c.zeit>API_CACHE_TAGE*24*60*60*1000)return null;
    return c.daten;
  }catch(e){return null;}
}
function inCache(st,y,daten){
  try{localStorage.setItem(apiKey(st,y),JSON.stringify({zeit:Date.now(),daten}));}catch(e){}
}
const apiName=n=>{
  if(!Array.isArray(n))return "";
  return (n.find(x=>x.language==="DE")||n[0]||{}).text||"";
};
async function holeVonApi(pfad,st,y){
  const q="countryIsoCode=DE&subdivisionCode=DE-"+st+"&languageIsoCode=DE"
         +"&validFrom="+y+"-01-01&validTo="+y+"-12-31";
  const r=await fetch(API_BASIS+"/"+pfad+"?"+q,{headers:{accept:"application/json"}});
  if(!r.ok)throw new Error("API "+r.status);
  return await r.json();
}
// Lädt Feiertage und Ferien; liefert true, wenn neue Daten vorliegen
async function ladeKalenderJahr(st,y){
  if(!st)return false;
  const k=st+y;
  if(API_DB[k])return false;
  const c=ausCache(st,y);
  if(c){API_DB[k]=c;return true;}
  try{
    const[ft,fr]=await Promise.all([holeVonApi("PublicHolidays",st,y),holeVonApi("SchoolHolidays",st,y)]);
    const feiertage={};
    (ft||[]).forEach(e=>{
      const name=apiName(e.name);
      let cur=e.startDate;
      while(cur&&cur<=(e.endDate||e.startDate)){
        feiertage[cur]=name;
        const[a1,b1,c1]=cur.split("-").map(Number);
        cur=isoOf(new Date(a1,b1-1,c1+1));
      }
    });
    const ferien=(fr||[]).map(e=>[e.startDate,e.endDate||e.startDate,apiName(e.name)]);
    const daten={feiertage,ferien};
    API_DB[k]=daten;inCache(st,y,daten);
    return true;
  }catch(e){
    return false;   // Kein Netz oder API nicht erreichbar → hinterlegte Daten nutzen
  }
}
const ferienVorhanden=(state,year)=>{
  const k=state+year;
  if(API_DB[k]&&API_DB[k].ferien&&API_DB[k].ferien.length)return true;
  return !!(KALENDER_DB[state]&&KALENDER_DB[state][String(year)]);
};
const isFT=(iso,s,y)=>getSD(s,y).feiertage[iso]||null;
const isFer=(iso,s,y)=>{for(const[v,b,n]of getSD(s,y).ferien){if(iso>=v&&iso<=b)return n;}return null;};
const dimM=(y,m)=>new Date(y,m+1,0).getDate();
const fwdM=(y,m)=>{let d=new Date(y,m,1).getDay();return d===0?6:d-1;};
const isWE=(y,m,d)=>{let w=new Date(y,m,d).getDay();return w===0||w===6;};
const toISO=(y,m,d)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const fmtDE=iso=>{if(!iso)return"";const[y,m,d]=iso.split("-");return`${d}.${m}.${y}`;};
const wday=iso=>{const[y,m,d]=iso.split("-").map(Number);return["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(y,m-1,d).getDay()];};
// ─── Urlaubstage-Berechnung mit Feiertagen ───────────────────────────────────
// Bundesland der laufenden Sitzung (wird in App() bei jedem Render gesetzt)
let AKT_BL="SN";
// Tage, die nur zur Hälfte vom Urlaubskonto abgezogen werden (Format MM-TT)
const HALBE_TAGE=["12-24","12-31"];
const isoOf=dt=>dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
// Wieviel Urlaub kostet ein einzelner Tag? 0 = Wochenende/Feiertag, 0.5 = halber Tag, 1 = voll
function tagesFaktor(dt,u){
  const w=dt.getDay();
  if(w===0||w===6)return 0;                       // Wochenende
  const iso=isoOf(dt);
  if(HALBE_TAGE.includes(iso.slice(5)))return 0.5; // Heiligabend / Silvester
  const jahr=dt.getFullYear();
  if(isFT(iso,AKT_BL,jahr))return 0;               // gesetzlicher Feiertag
  // Fronleichnam nur, wenn für diesen Mitarbeiter hinterlegt
  if(u&&u.fronleichnam&&FRONLEICHNAM_WAHL_BL.includes(AKT_BL)&&iso===fronleichnamISO(jahr))return 0;
  return 1;
}
function countWD(von,bis,u){
  if(!von||!bis)return 0;
  const[y1,m1,d1]=von.split("-").map(Number),[y2,m2,d2]=bis.split("-").map(Number);
  let s=new Date(y1,m1-1,d1),e=new Date(y2,m2-1,d2);
  if(e<s)return 0;
  let c=0,cur=new Date(s);
  while(cur<=e){c+=tagesFaktor(cur,u);cur.setDate(cur.getDate()+1);}
  return Math.round(c*2)/2;
}
// Zahl für die Anzeige: 4 → "4", 4.5 → "4,5"
const fmtT=n=>{const v=Number(n)||0;return Number.isInteger(v)?String(v):String(v).replace(".",",");};
function eDays(entries=[],type,u){return entries.filter(e=>e.type===type).reduce((s,e)=>s+countWD(e.von,e.bis,u),0);}

// ─── Geschlecht, Positionen & Berechtigungen ─────────────────────────────────
const GESCHLECHTER=[["w","weiblich"],["m","männlich"],["d","divers"]];
// scope: "alle" = darf alle bearbeiten · "bereich" = nur eigenen Fachbereich · "selbst" = nur sich
// Sparten: "leitung" (Geschäftsleitung/Buchhaltung), "therapie", "pflege"
// Reichweite: alle > sparte > bereich > selbst
const STANDARD_POSITIONEN=[
  // ── Übergreifende Leitung ───────────────────────────────────────
  {key:"geschaeftsleitung",scope:"alle",  sparte:"leitung", bereich:null,
   l:{m:"Geschäftsleitung",w:"Geschäftsleitung",d:"Geschäftsleitung"}},
  {key:"buchhaltung",      scope:"selbst",sparte:"leitung", bereich:"buchhaltung",
   l:{m:"Buchhaltung",w:"Buchhaltung",d:"Buchhaltung"}},
  {key:"hausmeister",      scope:"selbst",sparte:"leitung", bereich:"hausmeister",
   l:{m:"Hausmeister",w:"Hausmeisterin",d:"Hausmeister/in"}},
  {key:"taxi",             scope:"selbst",sparte:"leitung", bereich:"taxi",
   l:{m:"Fahrdienst / Taxi",w:"Fahrdienst / Taxi",d:"Fahrdienst / Taxi"}},

  // ── Therapie: Leitung ───────────────────────────────────────────
  {key:"praxisleitung",    scope:"sparte",sparte:"therapie",bereich:null,
   l:{m:"Praxisleitung",w:"Praxisleitung",d:"Praxisleitung"}},

  // ── Therapie: Teamleitungen ─────────────────────────────────────
  {key:"tl_physio_koenigsbrueck",scope:"bereich",sparte:"therapie",bereich:"physio_koenigsbrueck",
   l:{m:"Teamleitung Physiotherapie Königsbrück",w:"Teamleitung Physiotherapie Königsbrück",d:"Teamleitung Physiotherapie Königsbrück"}},
  {key:"tl_physio_pulsnitz",     scope:"bereich",sparte:"therapie",bereich:"physio_pulsnitz",
   l:{m:"Teamleitung Physiotherapie Pulsnitz",w:"Teamleitung Physiotherapie Pulsnitz",d:"Teamleitung Physiotherapie Pulsnitz"}},
  {key:"tl_physio_kamenz",       scope:"bereich",sparte:"therapie",bereich:"physio_kamenz",
   l:{m:"Teamleitung Physiotherapie Kamenz",w:"Teamleitung Physiotherapie Kamenz",d:"Teamleitung Physiotherapie Kamenz"}},
  {key:"tl_ergo",   scope:"bereich",sparte:"therapie",bereich:"ergo",
   l:{m:"Teamleitung Ergotherapie",w:"Teamleitung Ergotherapie",d:"Teamleitung Ergotherapie"}},
  {key:"tl_logo",   scope:"bereich",sparte:"therapie",bereich:"logo",
   l:{m:"Teamleitung Logopädie",w:"Teamleitung Logopädie",d:"Teamleitung Logopädie"}},
  {key:"tl_podo",   scope:"bereich",sparte:"therapie",bereich:"podo",
   l:{m:"Teamleitung Podologie",w:"Teamleitung Podologie",d:"Teamleitung Podologie"}},
  {key:"tl_trainer",scope:"bereich",sparte:"therapie",bereich:"trainer",
   l:{m:"Teamleitung Trainer",w:"Teamleitung Trainer",d:"Teamleitung Trainer"}},

  // ── Therapie: Mitarbeiter ───────────────────────────────────────
  {key:"physio_koenigsbrueck",scope:"selbst",sparte:"therapie",bereich:"physio_koenigsbrueck",
   l:{m:"Physiotherapeut Königsbrück",w:"Physiotherapeutin Königsbrück",d:"Physiotherapeut/in Königsbrück"}},
  {key:"physio_pulsnitz",     scope:"selbst",sparte:"therapie",bereich:"physio_pulsnitz",
   l:{m:"Physiotherapeut Pulsnitz",w:"Physiotherapeutin Pulsnitz",d:"Physiotherapeut/in Pulsnitz"}},
  {key:"physio_kamenz",       scope:"selbst",sparte:"therapie",bereich:"physio_kamenz",
   l:{m:"Physiotherapeut Kamenz",w:"Physiotherapeutin Kamenz",d:"Physiotherapeut/in Kamenz"}},
  {key:"ergotherapeut",scope:"selbst",sparte:"therapie",bereich:"ergo",
   l:{m:"Ergotherapeut",w:"Ergotherapeutin",d:"Ergotherapeut/in"}},
  {key:"logopaede",    scope:"selbst",sparte:"therapie",bereich:"logo",
   l:{m:"Logopäde",w:"Logopädin",d:"Logopäde/Logopädin"}},
  {key:"podologe",     scope:"selbst",sparte:"therapie",bereich:"podo",
   l:{m:"Podologe",w:"Podologin",d:"Podologe/Podologin"}},
  {key:"trainer",      scope:"selbst",sparte:"therapie",bereich:"trainer",
   l:{m:"Trainer",w:"Trainerin",d:"Trainer/in"}},
  {key:"rezeption",    scope:"selbst",sparte:"therapie",bereich:"rezeption",
   l:{m:"Rezeption",w:"Rezeption",d:"Rezeption"}},
  // Reinigungskraft: keine eigene Teamleitung → Praxisleitung ist zuständig
  {key:"reinigungskraft",scope:"selbst",sparte:"therapie",bereich:"reinigung",
   l:{m:"Reinigungskraft",w:"Reinigungskraft",d:"Reinigungskraft"}},

  // ── Pflege: Leitung ─────────────────────────────────────────────
  {key:"pflegedienstleitung",scope:"sparte",sparte:"pflege",bereich:null,
   l:{m:"Pflegedienstleitung",w:"Pflegedienstleitung",d:"Pflegedienstleitung"}},

  // ── Pflege: Teamleitungen ───────────────────────────────────────
  {key:"tl_ambulant",   scope:"bereich",sparte:"pflege",bereich:"ambulant",
   l:{m:"Teamleitung Ambulante Pflege",w:"Teamleitung Ambulante Pflege",d:"Teamleitung Ambulante Pflege"}},
  {key:"tl_wg_koenigsbrueck",scope:"bereich",sparte:"pflege",bereich:"wg_koenigsbrueck",
   l:{m:"Teamleitung WG Königsbrück",w:"Teamleitung WG Königsbrück",d:"Teamleitung WG Königsbrück"}},
  {key:"tl_wg_kamenz",  scope:"bereich",sparte:"pflege",bereich:"wg_kamenz",
   l:{m:"Teamleitung WG Kamenz",w:"Teamleitung WG Kamenz",d:"Teamleitung WG Kamenz"}},
  {key:"tl_ip_kamenz",  scope:"bereich",sparte:"pflege",bereich:"ip_kamenz",
   l:{m:"Teamleitung Intensivpflege Kamenz",w:"Teamleitung Intensivpflege Kamenz",d:"Teamleitung Intensivpflege Kamenz"}},

  // ── Pflege: Mitarbeiter ─────────────────────────────────────────
  {key:"pflege_ambulant",   scope:"selbst",sparte:"pflege",bereich:"ambulant",
   l:{m:"Pflegekraft Ambulante Pflege",w:"Pflegekraft Ambulante Pflege",d:"Pflegekraft Ambulante Pflege"}},
  {key:"pflege_wg_koenigsbrueck",scope:"selbst",sparte:"pflege",bereich:"wg_koenigsbrueck",
   l:{m:"Pflegekraft WG Königsbrück",w:"Pflegekraft WG Königsbrück",d:"Pflegekraft WG Königsbrück"}},
  {key:"pflege_wg_kamenz",  scope:"selbst",sparte:"pflege",bereich:"wg_kamenz",
   l:{m:"Pflegekraft WG Kamenz",w:"Pflegekraft WG Kamenz",d:"Pflegekraft WG Kamenz"}},
  {key:"pflege_ip_kamenz",  scope:"selbst",sparte:"pflege",bereich:"ip_kamenz",
   l:{m:"Pflegekraft Intensivpflege Kamenz",w:"Pflegekraft Intensivpflege Kamenz",d:"Pflegekraft Intensivpflege Kamenz"}},
  // Haushaltspflege: keine eigene Teamleitung → Pflegedienstleitung ist zuständig
  {key:"haushaltspflege",scope:"selbst",sparte:"pflege",bereich:"haushalt",
   l:{m:"Haushaltspflege",w:"Haushaltspflege",d:"Haushaltspflege"}},
];
let SPARTEN={leitung:"Leitung & Verwaltung",therapie:"Therapie",pflege:"Pflege"};

const STANDARD_BEREICH_NAME={
  buchhaltung:"Buchhaltung",
  physio_koenigsbrueck:"Physiotherapie Königsbrück",
  physio_pulsnitz:"Physiotherapie Pulsnitz",
  physio_kamenz:"Physiotherapie Kamenz",
  ergo:"Ergotherapie",logo:"Logopädie",podo:"Podologie",trainer:"Trainer",
  rezeption:"Rezeption",reinigung:"Reinigung",
  ambulant:"Ambulante Pflege",
  wg_koenigsbrueck:"WG Königsbrück",wg_kamenz:"WG Kamenz",
  ip_kamenz:"Intensivpflege Kamenz",
  hausmeister:"Hausmeister",taxi:"Fahrdienst / Taxi",
  haushalt:"Haushaltspflege",
};
function posInfo(key){return POS_MAP[key]||{key:key,scope:"selbst",sparte:null,bereich:null,l:null};}
// Auswahl für die Bereichsfilter: Alle, Sparten, dann alle belegten Bereiche
let bereicheDerSparte=sp=>POSITIONEN
  .filter(p=>p.sparte===sp&&p.bereich&&p.scope==="selbst")
  .map(p=>[p.bereich,BEREICH_NAME[p.bereich]||p.bereich])
  .filter((v,i,arr)=>arr.findIndex(x=>x[0]===v[0])===i);
// Gruppierte Auswahl für das Aufklappmenü
let FILTER_GRUPPEN=[];
// Flache Liste (für Beschriftungen und Suche)
let FILTER_OPTIONEN=[];
let filterLabel=wert=>(FILTER_OPTIONEN.find(([k])=>k===wert)||[null,"Alle Bereiche"])[1];
// Der Positionskatalog kann von Administratoren in der Datenbank gepflegt werden.
// Solange keine Daten geladen sind, gilt die eingebaute Standardliste.
let POSITIONEN=STANDARD_POSITIONEN;
let POS_MAP=Object.fromEntries(POSITIONEN.map(p=>[p.key,p]));
let BEREICH_NAME={...STANDARD_BEREICH_NAME};

function baueKataloge(){
  POS_MAP=Object.fromEntries(POSITIONEN.map(p=>[p.key,p]));
  // Bereichsnamen: hinterlegte Bezeichnung, sonst aus der Position ableiten
  BEREICH_NAME={...STANDARD_BEREICH_NAME};
  POSITIONEN.forEach(p=>{
    if(p.bereich&&!BEREICH_NAME[p.bereich])
      BEREICH_NAME[p.bereich]=p.bereich_name||p.bereich;
    if(p.bereich&&p.bereich_name)BEREICH_NAME[p.bereich]=p.bereich_name;
  });
  bereicheDerSparte=sp=>POSITIONEN
    .filter(p=>p.sparte===sp&&p.bereich&&p.scope==="selbst")
    .map(p=>[p.bereich,BEREICH_NAME[p.bereich]||p.bereich])
    .filter((v,i,arr)=>arr.findIndex(x=>x[0]===v[0])===i);
  FILTER_GRUPPEN=[
    ["Übersicht",[["alle","Alle Bereiche"],["leitung","Nur Leitung"]]],
    ...Object.entries(SPARTEN)
      .filter(([sp])=>sp!=="leitung")
      .map(([sp,lbl])=>[lbl,[["sparte:"+sp,lbl+" (gesamt)"],...bereicheDerSparte(sp)]]),
    ["Leitung & Verwaltung",bereicheDerSparte("leitung")],
  ].filter(([,opts])=>opts.length>0);
  FILTER_OPTIONEN=FILTER_GRUPPEN.flatMap(([,opts])=>opts);
  filterLabel=wert=>(FILTER_OPTIONEN.find(([k])=>k===wert)||[null,"Alle Bereiche"])[1];
}

baueKataloge();   // Standardkatalog sofort aufbauen

// Positionen aus der Datenbank übernehmen (Zeilen der Tabelle "positionen")
function uebernehmePositionen(zeilen){
  if(!Array.isArray(zeilen)||zeilen.length===0)return false;
  POSITIONEN=zeilen
    .slice()
    .sort((a,b)=>(a.sortierung||0)-(b.sortierung||0))
    .map(z=>({
      key:z.key, scope:z.scope, sparte:z.sparte, bereich:z.bereich||null,
      bereich_name:z.bereich_name||null, geschuetzt:!!z.geschuetzt,
      l:{m:z.label_m||z.key, w:z.label_w||z.label_m||z.key, d:z.label_d||z.label_m||z.key},
    }));
  baueKataloge();
  return true;
}

// Passt eine Person zum gewählten Filterwert?
function passtZuFilter(u,filter){
  if(!filter||filter==="alle")return true;
  const pi=posInfo(u?.position);
  if(filter==="leitung")return pi.scope==="alle"||pi.scope==="sparte";
  if(filter.startsWith("sparte:"))return pi.sparte===filter.slice(7);
  return pi.bereich===filter;
}
// Anzeigename je nach Geschlecht; unbekannte (alte) Werte werden unverändert gezeigt
function posLabel(key,geschlecht){
  const p=POS_MAP[key];
  if(!p)return key||"—";
  return p.l[geschlecht||"d"]||p.l.d;
}
// Darf "actor" das Profil/den Urlaub von "target" sehen und bearbeiten?
// Trifft ein Zusatzrecht von "actor" auf "target" zu?
function zusatzTrifft(rechte,actorId,target,nurBearbeiten){
  const pi=posInfo(target?.position);
  return (rechte||[]).some(z=>{
    if(z.user_id!==actorId)return false;
    if(nurBearbeiten&&!z.darf_bearbeiten)return false;
    if(z.ziel_typ==="alle")return true;
    if(z.ziel_typ==="leitung")return ["alle","sparte","bereich"].includes(pi.scope);
    if(z.ziel_typ==="sparte")return pi.sparte===z.ziel_wert;
    if(z.ziel_typ==="bereich")return pi.bereich===z.ziel_wert;
    return false;
  });
}
function canManage(actor,target,rechte){
  if(!actor||!target)return false;
  if(actor.id===target.id)return true;
  if(actor.role==="admin")return true;
  if(zusatzTrifft(rechte,actor.id,target,true))return true;
  const a=posInfo(actor.position),z=posInfo(target.position);
  if(a.scope==="alle")return true;                       // Geschäftsleitung
  // Praxis- bzw. Pflegedienstleitung: gesamte eigene Sparte, aber niemals
  // Geschäftsleitung oder Buchhaltung (Sparte "leitung")
  if(a.scope==="sparte")return !!a.sparte&&z.sparte===a.sparte;
  if(a.scope==="bereich")return !!a.bereich&&z.bereich===a.bereich;
  return false;
}
// Darf "actor" über den Antrag von "target" entscheiden? Der eigene Antrag zählt nicht.
function darfEntscheiden(actor,target,rechte){
  if(!actor||!target)return false;
  // Über den eigenen Antrag entscheidet nur die Geschäftsleitung
  if(actor.id===target.id)return actor.role==="admin"||posInfo(actor.position).scope==="alle";
  return canManage(actor,target,rechte);
}
// Hat jemand überhaupt Leitungsrechte (über sich selbst hinaus)?
// Sehen: alles aus canManage plus reine Leserechte
function canSee(actor,target,rechte){
  if(canManage(actor,target,rechte))return true;
  return zusatzTrifft(rechte,actor?.id,target,false);
}
function istLeitung(p){
  if(!p)return false;
  if(p.role==="admin")return true;
  const s=posInfo(p.position).scope;
  return s==="alle"||s==="sparte"||s==="bereich";
}
// ─── Arbeitszeit ─────────────────────────────────────────────────────────────
const WOCHENTAGE_AUSWAHL=[1,2,3,4,5,6];
const stdProTag=u=>{
  if(u?.pauschal)return 0;                       // keine feste Tagesstundenzahl
  const w=Number(u?.wochenstunden)||0,t=Number(u?.arbeitstage_woche)||0;
  return (w>0&&t>0)?Math.round((w/t)*100)/100:0;
};
const fmtStd=n=>{const v=Number(n)||0;return (Number.isInteger(v)?String(v):v.toFixed(2).replace(/0$/,"")).replace(".",",");};
// Urlaubstage in Stunden umrechnen (für Überstundenkonto)
const tageInStd=(tage,u)=>Math.round((Number(tage)||0)*stdProTag(u)*100)/100;
const naechsterTag=iso=>{const[y,m,d]=iso.split("-").map(Number);const dt=new Date(y,m-1,d+1);return isoOf(dt);};
// Datum, an dem "budget" Urlaubstage innerhalb von..bis aufgebraucht sind (oder null)
function splitDatum(von,bis,budget){
  if(budget<=0)return null;
  const[y1,m1,d1]=von.split("-").map(Number),[y2,m2,d2]=bis.split("-").map(Number);
  let cur=new Date(y1,m1-1,d1);const ende=new Date(y2,m2-1,d2);
  let verbraucht=0,letzter=null;
  while(cur<=ende){
    const f=tagesFaktor(cur);
    if(f>0){
      if(verbraucht+f>budget)break;
      verbraucht+=f;letzter=isoOf(cur);
    }
    cur.setDate(cur.getDate()+1);
  }
  return letzter;
}

// Schmaler Bildschirm (Handy)? Steuert die kompakte Darstellung der Kalenderleiste
function useSchmal(grenze=780){
  const [schmal,setSchmal]=useState(typeof window!=="undefined"&&window.innerWidth<grenze);
  useEffect(()=>{
    const pruefe=()=>setSchmal(window.innerWidth<grenze);
    window.addEventListener("resize",pruefe);
    window.addEventListener("orientationchange",pruefe);
    return()=>{window.removeEventListener("resize",pruefe);window.removeEventListener("orientationchange",pruefe);};
  },[grenze]);
  return schmal;
}

// Welche Feiertage und halben Tage liegen im gewählten Zeitraum?
function besondereTage(von,bis,u){
  if(!von||!bis||bis<von)return [];
  const[y1,m1,d1]=von.split("-").map(Number),[y2,m2,d2]=bis.split("-").map(Number);
  let cur=new Date(y1,m1-1,d1);const ende=new Date(y2,m2-1,d2);
  const liste=[];
  while(cur<=ende){
    const w=cur.getDay(),iso=isoOf(cur);
    if(w!==0&&w!==6){
      if(HALBE_TAGE.includes(iso.slice(5)))
        liste.push({iso,name:iso.slice(5)==="12-24"?"Heiligabend":"Silvester",halb:true});
      else{
        const ft=isFT(iso,AKT_BL,cur.getFullYear());
        if(ft)liste.push({iso,name:ft,halb:false});
        else if(u&&u.fronleichnam&&FRONLEICHNAM_WAHL_BL.includes(AKT_BL)&&iso===fronleichnamISO(cur.getFullYear()))
          liste.push({iso,name:"Fronleichnam",halb:false});
      }
    }
    cur.setDate(cur.getDate()+1);
  }
  return liste;
}
// Alter in Jahren aus dem Geburtsdatum (Geburtstag im laufenden Jahr berücksichtigt)
function alterAus(iso){
  if(!iso)return null;
  const[y,m,d]=iso.split("-").map(Number);
  if(!y||!m||!d)return null;
  const heute=new Date();
  let a=heute.getFullYear()-y;
  const hatteGeburtstag=(heute.getMonth()+1>m)||(heute.getMonth()+1===m&&heute.getDate()>=d);
  if(!hatteGeburtstag)a--;
  return (a>=0&&a<130)?a:null;
}
// Steht der Geburtstag heute oder in den nächsten Tagen an?
function tageBisGeburtstag(iso){
  if(!iso)return null;
  const[,m,d]=iso.split("-").map(Number);
  if(!m||!d)return null;
  const heute=new Date();heute.setHours(0,0,0,0);
  let next=new Date(heute.getFullYear(),m-1,d);
  if(next<heute)next=new Date(heute.getFullYear()+1,m-1,d);
  return Math.round((next-heute)/86400000);
}
// ─── Neuerungen im Programm ──────────────────────────────────────────────────
// Neueste Version steht oben. Bei jeder grundlegenden Änderung hier einen
// Eintrag ergänzen und die Version hochzählen — die App zeigt dann allen
// Benutzern beim nächsten Anmelden den Hinweis.
const CHANGELOG=[
  {
    version:"2026.11.28",
    datum:"28. November 2026",
    titel:"Urlaubsübersicht als echte PDF-Datei",
    punkte:[
      "Der Knopf „PDF / Drucken“ erzeugt jetzt eine richtige PDF-Datei im Programm selbst. Bisher wurde nur ein Druckfenster geöffnet — im App-Modus auf iPad und iPhone gibt es dort aber kein Druckmenü, weshalb sich nichts speichern ließ.",
      "Auf iPad und iPhone öffnet sich nun das Teilen-Menü: Die Übersicht lässt sich in „Dateien“ sichern, per Mail versenden oder an einen Drucker geben. Am Rechner wird die Datei direkt heruntergeladen.",
      "Die Übersicht wird bei vielen Einträgen sauber auf mehrere Seiten verteilt, jede Seite trägt Spaltenköpfe und Seitenzahl.",
    ],
  },
  {
    version:"2026.11.23",
    datum:"23. November 2026",
    titel:"Anmeldung, Pauschalkräfte und direkte Urlaubsplanung",
    punkte:[
      "Die Anmeldemaske behält die eingetippte E-Mail-Adresse, wenn man kurz in eine andere App wechselt — etwa um das Passwort aus dem E-Mail-Programm zu kopieren. Das Passwort selbst wird aus Sicherheitsgründen nie gespeichert.",
      "Pauschalkräfte können von der Leitung so eingestellt werden, dass ihr Urlaub keine Genehmigung braucht. Die Einträge gelten dann sofort als bestätigt. Einstellbar beim Anlegen und jederzeit später.",
      "Der rote Hinweis „Jetzt Urlaub für … planen“ führt mit einem Klick direkt in die Urlaubsplanung des betroffenen Jahres — der Eingabedialog öffnet sich gleich mit.",
      "Der Menüpunkt „Einträge“ heißt jetzt „Urlaubseinträge“.",
      "Druckfenster haben jetzt einen eigenen Knopf „Drucken / PDF“. Auf iPad und iPhone öffnete sich der Druckdialog bisher nicht von allein — darüber lässt sich die Übersicht auch als PDF sichern.",
      "Bei Pauschalkräften ohne Genehmigungspflicht heißt es „Urlaub eintragen“ statt „Urlaub beantragen“.",
      "Der eigene Urlaubsantrag kann nicht mehr selbst genehmigt werden. Darüber entscheidet ausschließlich die zuständige Leitung.",
    ],
  },
  {
    version:"2026.08.25",
    datum:"25. August 2026",
    titel:"Zusatzrechte und Regeln je Bereich",
    punkte:[
      "Einzelnen Personen — etwa der Buchhaltung — lassen sich zusätzliche Einblicke geben: für alle Mitarbeiter, nur die Leitungen, eine Sparte oder einen Fachbereich, wahlweise nur lesend oder auch bearbeitend.",
      "Die Regeln zur Urlaubsplanung gelten jetzt je Geltungsbereich: Die Pflegedienstleitung stellt sie für die Pflege ein, eine Teamleitung für ihren Fachbereich. Bereichsregeln haben Vorrang vor Spartenregeln, diese vor der betrieblichen Vorgabe.",
      "Beim Anlegen eines Mitarbeiters sind Geschlecht und Position nicht mehr vorbelegt und müssen bewusst gewählt werden.",
    ],
  },
  {
    version:"2026.08.23",
    datum:"23. August 2026",
    titel:"Freizeitausgleich statt Urlaub",
    punkte:[
      "Werden Überstunden als freie Tage genommen, heißt das jetzt überall „Freizeitausgleich“ und nicht mehr „Urlaub“.",
      "Das entspricht der rechtlichen Einordnung: Freizeitausgleich ist Ausgleich für geleistete Mehrarbeit und kein Urlaubstag im Sinne des Bundesurlaubsgesetzes.",
      "Betroffen sind Antragsdialog, Kalender, Einträge, Ausdrucke, Überstundenkonto und Anleitung.",
    ],
  },
  {
    version:"2026.08.22",
    datum:"22. August 2026",
    titel:"Einstellbare Regeln und Überstundenkonto",
    punkte:[
      "Die Leitung legt unter Mitarbeiter → „⚙️ Regeln“ fest, bis wann der Urlaub eingereicht sein muss und wie viel Prozent bis dahin verplant sein müssen.",
      "Ebenfalls einstellbar: ob Freizeitausgleich überhaupt genommen werden darf.",
      "Für einzelne Mitarbeiter lassen sich abweichende Fristen, Mindestanteile und Überstundenregeln hinterlegen.",
      "Neu: das Überstundenkonto. Über das ⏱-Symbol in der Mitarbeiterliste ist jede Bewegung mit Datum, Menge und Kontostand nachvollziehbar.",
    ],
  },
  {
    version:"2026.08.16",
    datum:"16. August 2026",
    titel:"Anleitung für alle",
    punkte:[
      "Neuer Menüpunkt „❓ Anleitung“ mit einer Schritt-für-Schritt-Erklärung: Urlaub beantragen, Überstunden melden, wie Urlaubstage gezählt werden, häufige Fragen.",
      "Beim ersten Öffnen erscheint eine kurze Begrüßung mit Verweis auf die Anleitung.",
      "Leitungen und Administratoren finden dort zusätzliche Abschnitte zu ihren Funktionen.",
    ],
  },
  {
    version:"2026.08.15",
    datum:"15. August 2026",
    titel:"Änderungsprotokoll",
    punkte:[
      "Administratoren finden unter „🔍 Protokoll“ eine lückenlose Aufzeichnung aller Änderungen mit Datum, Uhrzeit und Benutzername.",
      "Erfasst werden Mitarbeiterdaten, Urlaubseinträge, Genehmigungen, Überstundenanträge, Urlaubskonten und Positionen.",
      "Das Protokoll lässt sich durchsuchen, nach jeder Spalte sortieren und als CSV-Datei ausgeben.",
      "Vor dem Bearbeiten der Positionen erscheint jetzt ein Warnhinweis zu den Folgen einer Änderung.",
    ],
  },
  {
    version:"2026.08.14",
    datum:"14. August 2026",
    titel:"Positionen selbst verwalten",
    punkte:[
      "Administratoren können Positionen jetzt selbst anlegen, umbenennen und löschen — unter Mitarbeiter über „⚙️ Positionen“.",
      "Neue Positionen: Hausmeister und Fahrdienst/Taxi. Beide werden ausschließlich von der Geschäftsleitung betreut.",
      "Entfallen sind WG Ohorn und Intensivpflege Steina.",
    ],
  },
  {
    version:"2026.08.12",
    datum:"12. August 2026",
    titel:"Sparten Therapie und Pflege",
    punkte:[
      "Der Urlaubsplaner unterscheidet jetzt zwischen den Sparten Therapie und Pflege.",
      "Die Physiotherapie ist nach Standorten getrennt: Königsbrück, Pulsnitz und Kamenz mit jeweils eigener Teamleitung.",
      "Neu in der Pflege: Pflegedienstleitung sowie Teamleitungen für Ambulante Pflege, WG Königsbrück, WG Ohorn, WG Kamenz, Intensivpflege Steina und Intensivpflege Kamenz.",
      "Neue Positionen: Buchhaltung, Reinigungskraft und Haushaltspflege.",
      "Die Praxisleitung betreut die gesamte Therapie, die Pflegedienstleitung die gesamte Pflege. Geschäftsleitung und Buchhaltung sieht ausschließlich die Geschäftsleitung.",
    ],
  },
  {
    version:"2026.08.11",
    datum:"11. August 2026",
    titel:"Jahresplanung, Überstunden und Pauschalkräfte",
    punkte:[
      "Urlaubsanspruch und Resturlaub werden ab sofort für jedes Kalenderjahr getrennt geführt. Beim Jahreswechsel wird nicht verbrauchter Urlaub als Resturlaub übertragen.",
      "Neue Abgabefrist: Bis zum 30.11. müssen mindestens 90 % des Urlaubs für das Folgejahr verplant sein. Oben erscheint ein Countdown mit Fortschrittsbalken.",
      "Resturlaub aus dem Vorjahr wird bei einem Antrag automatisch zuerst verbraucht.",
      "Freizeitausgleich kann jederzeit beantragt werden, ohne den Urlaubsanspruch zu belasten.",
      "Mitarbeiter können eine Änderung ihrer Überstunden beantragen; die Leitung genehmigt oder lehnt ab.",
      "Neue Position „Rezeption“ sowie Pauschalkräfte ohne feste Stundenzahl und ohne Urlaubsanspruch.",
      "Fronleichnam lässt sich je Mitarbeiter als Feiertag hinterlegen (Landkreis Bautzen).",
    ],
  },
];
const AKTUELLE_VERSION=CHANGELOG[0].version;
// Alle Einträge, die neuer sind als die zuletzt bestätigte Version
function neueEintraege(gelesen){
  if(!gelesen)return CHANGELOG;
  return CHANGELOG.filter(e=>e.version>gelesen);
}

// ─── Abgabefrist für die Jahresurlaubsplanung ────────────────────────────────
// Frist und Mindestanteil kommen aus den Betriebseinstellungen; je Mitarbeiter
// kann davon abgewichen werden (Felder frist_datum und mindest_prozent).
// "regeln" ist das Ergebnis von regelnFuer(mitarbeiter)
function fristFuer(planJahr,regeln,u){
  if(u?.frist_datum){
    const[y,m,d]=String(u.frist_datum).split("-").map(Number);
    return new Date(y,m-1,d,23,59,59);
  }
  return new Date(planJahr-1,(regeln?.frist_monat??11)-1,regeln?.frist_tag??30,23,59,59);
}
const mindestAnteil=regeln=>Math.max(0,Math.min(100,regeln?.mindest_prozent??90))/100;
const ueberstundenErlaubt=regeln=>regeln?.ueberstunden_erlaubt!==false;
function fristRest(planJahr,regeln,u){
  const ms=fristFuer(planJahr,regeln,u).getTime()-Date.now();
  if(ms<=0)return null;
  const tage=Math.floor(ms/86400000);
  const stunden=Math.floor((ms%86400000)/3600000);
  const minuten=Math.floor((ms%3600000)/60000);
  return{ms,tage,stunden,minuten};
}

// ─── Adresse der App ─────────────────────────────────────────────────────────
// Wird aus dem Browser abgeleitet, nicht fest eingetragen. Dadurch stimmt sie
// nach einem Umzug auf ein anderes Konto oder Repository automatisch weiter.
const APP_URL=(()=>{
  try{
    const basis=(import.meta.env&&import.meta.env.BASE_URL)||"/";
    return window.location.origin+basis;
  }catch(e){
    return (typeof window!=="undefined"&&window.location)?window.location.href:"";
  }
})();

// ─── Entwürfe sichern ────────────────────────────────────────────────────────
// iOS verwirft die Seite bei Speicherdruck und lädt sie neu. Alle Eingaben wären
// dann verloren. Deshalb werden offene Formulare laufend zwischengespeichert
// und nach einem Neustart wiederhergestellt.
const ENTWURF_KEY="up_entwurf";
function entwurfSpeichern(daten){
  try{localStorage.setItem(ENTWURF_KEY,JSON.stringify({zeit:Date.now(),daten}));}catch(e){}
}
function entwurfLesen(){
  try{
    const roh=localStorage.getItem(ENTWURF_KEY);
    if(!roh)return null;
    const o=JSON.parse(roh);
    // Entwürfe älter als 2 Stunden verwerfen
    if(Date.now()-o.zeit>2*60*60*1000){localStorage.removeItem(ENTWURF_KEY);return null;}
    return o.daten;
  }catch(e){return null;}
}
function entwurfLoeschen(){try{localStorage.removeItem(ENTWURF_KEY);}catch(e){}}

// Nur iOS/iPadOS friert HTTPS-Verbindungen beim Wechsel in den Hintergrund ein.
// Auf Windows, macOS und Android bleibt die Verbindung bestehen — dort darf die
// App beim Tabwechsel weder neu laden noch den Ladebildschirm zeigen.
const IST_IOS=(()=>{
  if(typeof navigator==="undefined")return false;
  const ua=navigator.userAgent||"";
  return /iPad|iPhone|iPod/.test(ua)
    ||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);  // iPadOS
})();

// Pauschalkraft: keine feste Wochenstundenzahl, kein fester Urlaubsanspruch
const istPauschal=u=>!!u?.pauschal;
// Pauschalkraft, deren Urlaub keine Genehmigung der Leitung braucht.
// Für sie heißt es „eintragen“ statt „beantragen“ — es gibt keinen Antrag.
const ohneGenehmigungspflicht=u=>!!u?.pauschal&&u?.genehmigung_noetig===false;
const TYP_LABEL={urlaub:"Urlaub",resturlaub:"Resturlaub",ueberstunden:"Freizeitausgleich"};
const ROLLEN=[["mitarbeiter","Mitarbeiter"],["admin","Administrator"]];
const rolleLabel=r=>r==="admin"?"Administrator":"Mitarbeiter";
const ca=(hex,a)=>{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;};
const lighten=(hex,f=0.4)=>{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`#${Math.round(r+(255-r)*f).toString(16).padStart(2,"0")}${Math.round(g+(255-g)*f).toString(16).padStart(2,"0")}${Math.round(b+(255-b)*f).toString(16).padStart(2,"0")}`;};
const PRINT_STYLE=`@media print{body *{visibility:hidden!important;}.pt,.pt *{visibility:visible!important;}.pt{position:fixed;left:0;top:0;width:100%;height:100%;background:#fff;z-index:9999;}@page{margin-top:6mm;margin-bottom:6mm;size:A4 landscape;margin:6mm;}}`;

// ═══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);       // eigenes Profil
  const [profiles,setProfiles]=useState([]);        // alle Profile
  const [entries,setEntries]=useState([]);           // alle sichtbaren Einträge
  const [loading,setLoading]=useState(true);
  const [year,setYear]=useState(new Date().getFullYear());
  const [bundesland,setBundesland]=useState("SN");
  const [showFerien,setShowFerien]=useState(true);
  const [showFeiertage,setShowFeiertage]=useState(true);
  const [kalBereich,setKalBereich]=useState("alle");   // Bereichsfilter im Kalender (nur Leitung)
  const [ueAntraege,setUeAntraege]=useState([]);       // Überstundenanträge
  const [jahreskonten,setJahreskonten]=useState([]);   // Urlaubsanspruch je Jahr
  const [neuerungenZu,setNeuerungenZu]=useState(false); // in dieser Sitzung weggeklickt
  const [willkommenZu,setWillkommenZu]=useState(false);  // Begrüßung weggeklickt
  // Wurde die Begrüßung schon einmal angezeigt? (geräteweise gespeichert)
  const willkommenGesehen=willkommenZu||(()=>{try{return !!localStorage.getItem("up_willkommen");}catch(e){return true;}})();
  const [fristTick,setFristTick]=useState(0);          // aktualisiert den Countdown
  useEffect(()=>{const t=setInterval(()=>setFristTick(x=>x+1),60000);return()=>clearInterval(t);},[]);
  // Für welches Jahr muss geplant werden? Bis zum 30.11. für das Folgejahr,
  // danach ist die Planung des Folgejahres abgeschlossen.
  const heuteJetzt=new Date();
  const planJahr=heuteJetzt.getFullYear()+1;
  const schmal=useSchmal();                            // Handy-Ansicht?
  const [view,setView]=useState("kalender");
  const [modal,setModal]=useState(null);
  const [entwurfHinweis,setEntwurfHinweis]=useState(false);
  const [tooltip,setTooltip]=useState(null);
  const [profileDirty,setProfileDirty]=useState(false);
  const [pendingView,setPendingView]=useState(null);
  const [myNotifications,setMyNotifications]=useState([]);
  const [pendingJumpYear,setPendingJumpYear]=useState(null);
  const [dashRefresh,setDashRefresh]=useState(0);
  const [printMode,setPrintMode]=useState(null);
  const [notif,setNotif]=useState(null);
  const styleRef=useRef(false);
  const profileLoadedRef=useRef(false);
  const [dbError,setDbError]=useState(false);

  if(!styleRef.current){
    const s=document.createElement("style");
    s.textContent=PRINT_STYLE+`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Nunito+Sans:wght@400;500;600;700&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Nunito Sans',sans-serif;background:#f0f4f0;color:#2d3a2e;}input,select,textarea{font-family:inherit;}button{cursor:pointer;font-family:inherit;}::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:#e8f0e8;}::-webkit-scrollbar-thumb{background:#7ab529;border-radius:3px;}`;
    document.head.appendChild(s);
    styleRef.current=true;
  }

  const isAdmin=profile?.role==="admin";
  const isLeitung=istLeitung(profile);
  AKT_BL=bundesland;   // Feiertagslogik der Urlaubsberechnung auf das gewählte Bundesland setzen
  // Nur Geschäfts-/Praxisleitung und Administratoren sehen alle Bereiche und dürfen umschalten
  const darfBereichFiltern=isAdmin||["alle","sparte"].includes(posInfo(profile?.position).scope);
  // Regeln dürfen Administratoren sowie Geschäfts-, Praxis- und Pflegedienstleitung ändern
  const darfRegeln=isLeitung;   // Leitungen setzen Regeln für ihren Verantwortungsbereich

  // ── Session-Init ──────────────────────────────────────────────────
  // Sitzung abgelaufen? Neuer Kalendertag ODER älter als 24 Stunden → neu anmelden
  function sessionAbgelaufen(sess){
    // ACHTUNG: "expires_at" ist die Gültigkeit des Zugriffstokens (eine Stunde)
    // und NICHT das Ende der Sitzung. Supabase erneuert es im Hintergrund selbst.
    // Es darf deshalb hier nicht geprüft werden — sonst wird man nach einer
    // Stunde Nutzung fälschlich mit dem Hinweis "neuer Tag" abgemeldet.
    const last=sess?.user?.last_sign_in_at;
    if(!last)return false;
    const anmeldung=new Date(last);
    if(isNaN(anmeldung.getTime()))return false;
    if(Date.now()-anmeldung.getTime()>24*60*60*1000)return true;      // älter als 24 h
    const heute=new Date();
    return anmeldung.getFullYear()!==heute.getFullYear()
        || anmeldung.getMonth()!==heute.getMonth()
        || anmeldung.getDate()!==heute.getDate();                       // anderer Kalendertag
  }

  // Harte Zeitgrenze: ein hängender Netzwerkaufruf blockiert sonst dauerhaft
  // (genau das passiert beim Wechsel WLAN → Mobilfunk: die alte Verbindung antwortet nie mehr)
  function mitZeitlimit(promise,ms=8000){
    return Promise.race([
      promise,
      new Promise((_,ab)=>setTimeout(()=>ab(new Error("Zeitüberschreitung")),ms)),
    ]);
  }
  // Netzwerkaufruf mit mehreren Versuchen — fängt schlafende Verbindungen nach App-Wechsel ab
  async function mitWiederholung(fn,versuche=3,limit=8000){
    let letzterFehler;
    for(let i=0;i<versuche;i++){
      try{return await mitZeitlimit(Promise.resolve().then(fn),limit);}
      catch(e){letzterFehler=e;if(i<versuche-1)await new Promise(r=>setTimeout(r,700*(i+1)));}
    }
    throw letzterFehler;
  }

  const bootRef=useRef(false);
  async function boot(){
    if(bootRef.current)return;          // kein paralleler Doppelstart
    bootRef.current=true;
    setDbError(false);
    setLoading(true);
    try{
      // ZUERST ohne Netzwerk prüfen: liegt die letzte Anmeldung vor dem heutigen Tag,
      // ist die Sitzung ohnehin hinfällig. Dann gar nicht erst versuchen, das
      // abgelaufene Token zu erneuern — genau dabei blieb die App bisher stehen.
      const gespeichert=sessionAusSpeicher();
      // Nur beim Start: liegt die Gültigkeit sehr weit zurück, ist auch das
      // Erneuerungstoken hinüber — dann direkt zur Anmeldung, ohne Wartezeit.
      const langeTot=gespeichert?.expires_at
        &&Date.now()-gespeichert.expires_at*1000>7*24*60*60*1000;
      if(gespeichert&&(langeTot||sessionAbgelaufen(gespeichert))){
        signOutHart();
        try{signOut();}catch(e){}
        setSession(null);setProfile(null);setProfiles([]);setEntries([]);
        profileLoadedRef.current=false;
        setLoading(false);
        return;
      }
      if(!gespeichert){setSession(null);setLoading(false);return;}

      const sess=await mitWiederholung(()=>getSession(),2,5000);
      if(!sess){setLoading(false);return;}
      if(sessionAbgelaufen(sess)){
        signOutHart();
        try{signOut();}catch(e){}
        setSession(null);setProfile(null);setProfiles([]);setEntries([]);
        profileLoadedRef.current=false;
        setLoading(false);
        return;
      }
      setSession(sess);
      await loadAll(sess.user.id);   // setzt loading selbst zurück, sobald das Profil da ist
    }catch(e){
      // Ohne gültige gespeicherte Sitzung ist die Anmeldemaske die richtige Antwort
      if(!sessionAusSpeicher()){
        setSession(null);
        setLoading(false);
      }else if(neustartMitSchutz()){
        // Seite wird neu geladen — dabei entsteht eine frische Verbindung
      }else{
        if(document.visibilityState==="visible")setDbError(true);
        setLoading(false);
      }
    }finally{
      bootRef.current=false;
    }
  }

  useEffect(()=>{
    boot();

    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,sess)=>{
      // USER_UPDATED (nach Passwortänderung): NUR wenn Profil schon geladen ist,
      // ignorieren um must_change_password Schleife zu vermeiden.
      if(event==="USER_UPDATED"&&profileLoadedRef.current){
        setSession(sess);
        return;
      }
      // Abmeldung
      if(!sess){
        setSession(null);setProfile(null);setProfiles([]);setEntries([]);
        setLoading(false);profileLoadedRef.current=false;
        return;
      }
      // Anmeldung / initiale Session / Token-Refresh: Profil laden
      setSession(sess);
      await loadAll(sess.user.id);
    });
    return()=>{subscription.unsubscribe();};
  },[]);

  // ── Rückkehr aus dem Hintergrund: automatisch neu verbinden ───────
  const dbErrorRef=useRef(false);
  const sessionRef=useRef(null);
  const profileRef=useRef(null);
  const modalOffenRef=useRef(false);
  const ladeRef=useRef(true);
  useEffect(()=>{ladeRef.current=loading;},[loading]);
  useEffect(()=>{dbErrorRef.current=dbError;},[dbError]);
  useEffect(()=>{sessionRef.current=session;},[session]);
  useEffect(()=>{profileRef.current=profile;},[profile]);
  useEffect(()=>{modalOffenRef.current=!!modal;},[modal]);
  // Offenes Fenster sichern, damit es einen Neustart übersteht
  useEffect(()=>{
    if(modal&&["addUser","editUser","addEntry","editEntry"].includes(modal.type)){
      entwurfSpeichern({typ:modal.type,daten:modal.data||null,felder:null});
    }else if(!modal){
      // Nur löschen, wenn kein Formular offen ist
      const e=entwurfLesen();
      if(e&&!e.felder)entwurfLoeschen();
    }
  },[modal]);

  // Nach dem Start prüfen, ob ein Entwurf wiederhergestellt werden kann
  useEffect(()=>{
    if(loading||!profile||modal)return;
    const e=entwurfLesen();
    if(e&&e.typ&&e.felder)setEntwurfHinweis(true);
  },[loading,profile]);

  // iOS/Safari hält nach dem Einfrieren der App die alte HTTPS-Verbindung offen,
  // obwohl sie längst tot ist. Neue Anfragen reihen sich daran an und antworten nie.
  // Nur ein vollständiger Seiten-Neustart baut eine frische Verbindung auf.
  function neustartMitSchutz(mindestAbstand=12000){
    try{
      const letzter=Number(sessionStorage.getItem("up_letzter_neustart")||0);
      if(Date.now()-letzter<mindestAbstand)return false;   // Schutz vor Neustart-Schleifen
      sessionStorage.setItem("up_letzter_neustart",String(Date.now()));
    }catch(e){}
    window.location.reload();
    return true;
  }
  // Wie lange lag die App im Hintergrund?
  const verstecktSeit=useRef(0);

  useEffect(()=>{
    async function beiRueckkehr(){
      if(document.visibilityState!=="visible"){
        verstecktSeit.current=Date.now();       // App wandert in den Hintergrund
        return;
      }
      const pause=verstecktSeit.current?Date.now()-verstecktSeit.current:0;
      verstecktSeit.current=0;
      const sess=sessionRef.current;

      // Ist gerade ein Fenster geöffnet (z. B. Mitarbeiter anlegen)? Dann NICHTS tun,
      // was Eingaben vernichten könnte — kein Neuladen, kein Ladebildschirm.
      if(modalOffenRef.current)return;

      // Niemand angemeldet? Dann steht die Anmeldemaske auf dem Bildschirm.
      // Hier gibt es nichts aufzufrischen — ein Neustart würde nur die bereits
      // eingetippte E-Mail und das Passwort löschen.
      if(!sess&&!sessionAusSpeicher())return;

      // Neuer Tag angebrochen, während die App im Hintergrund lag → abmelden
      if(sess&&sessionAbgelaufen(sess)){
        try{sessionStorage.setItem("up_tageswechsel","1");}catch(e){}
        signOutHart();
        try{signOut();}catch(e){}
        window.location.reload();
        return;
      }

      // Nur iOS: nach längerer Pause ist die Verbindung tot → sauberer Neustart.
      // Auf allen anderen Geräten bleibt die Verbindung bestehen.
      if(IST_IOS&&pause>60000&&sess&&!sessionAbgelaufen(sess)){
        if(neustartMitSchutz())return;
      }

      // Kurzer Verbindungstest — läuft im Hintergrund, ohne Ladebildschirm
      let lebt=false;
      try{
        await mitZeitlimit(getProfile((sess||sessionAusSpeicher())?.user?.id),IST_IOS?3000:6000);
        lebt=true;
      }catch(e){lebt=false;}

      if(!lebt){
        // Nur iOS braucht den harten Neustart; sonst still im Hintergrund neu verbinden
        if(IST_IOS&&neustartMitSchutz())return;
        if(!sess||ladeRef.current||dbErrorRef.current){await boot();return;}
        try{await loadEntries(istLeitung(profileRef.current),sess.user.id);}catch(e){}
        return;
      }

      // Verbindung steht: hängengebliebenen Start abschließen bzw. Daten auffrischen
      if(!sess||ladeRef.current||dbErrorRef.current){await boot();return;}
      try{await loadEntries(istLeitung(profileRef.current),sess.user.id);}catch(e){}
    }
    // Netzverbindung ist zurück → sofort neu verbinden
    function beiOnline(){
      if(dbErrorRef.current||ladeRef.current){bootRef.current=false;boot();}
      else beiRueckkehr();
    }
    document.addEventListener("visibilitychange",beiRueckkehr);
    window.addEventListener("pagehide",()=>{verstecktSeit.current=Date.now();});
    window.addEventListener("pageshow",beiRueckkehr);
    window.addEventListener("online",beiOnline);
    return()=>{
      document.removeEventListener("visibilitychange",beiRueckkehr);
      window.removeEventListener("pageshow",beiRueckkehr);
      window.removeEventListener("online",beiOnline);
    };
  },[]);

  // Amtliche Feiertage/Ferien laden, sobald Jahr oder Bundesland wechseln
  const [kalTick,setKalTick]=useState(0);
  useEffect(()=>{
    if(!bundesland||loading)return;   // erst wenn die App steht
    let aktiv=true;
    (async()=>{
      let neu=false;
      for(const y of [year-1,year,year+1]){
        const ok=await ladeKalenderJahr(bundesland,y);
        neu=neu||ok;
      }
      if(aktiv&&neu)setKalTick(t=>t+1);
    })();
    return()=>{aktiv=false;};
  },[bundesland,year,loading]);

  // Fehlerbild: alle 5 Sekunden selbst einen neuen Versuch starten,
  // damit sich die App nach einem Netzwechsel von allein wieder fängt
  const [wiederVersuch,setWiederVersuch]=useState(0);
  useEffect(()=>{
    if(!dbError)return;
    setWiederVersuch(0);
    const t=setInterval(()=>{
      setWiederVersuch(n=>n+1);
      bootRef.current=false;
      boot();
    },5000);
    return()=>clearInterval(t);
  },[dbError]);

  // Nach 8 Sekunden Ladezeit die Notausgänge einblenden
  const [langesLaden,setLangesLaden]=useState(false);
  useEffect(()=>{
    if(!loading){setLangesLaden(false);return;}
    const t=setTimeout(()=>setLangesLaden(true),8000);
    return()=>clearTimeout(t);
  },[loading]);

  // Wachhund: bleibt der Ladebildschirm länger als 20 Sekunden stehen, Fehlermeldung zeigen
  useEffect(()=>{
    if(!loading)return;
    const t=setTimeout(()=>{
      if(!ladeRef.current)return;
      bootRef.current=false;
      // Ohne gespeicherte Sitzung ist die Anmeldemaske die richtige Antwort —
      // ein Neustart würde hier nur eine Schleife erzeugen.
      if(!sessionAusSpeicher()){setLoading(false);setSession(null);return;}
      if(IST_IOS&&neustartMitSchutz())return;
      setLoading(false);setDbError(true);
    },10000);
    return()=>clearTimeout(t);
  },[loading]);

  // Tageswechsel auch bei durchgehend geöffneter App erkennen (Prüfung jede Minute)
  useEffect(()=>{
    if(!session)return;
    const t=setInterval(()=>{
      if(!sessionAbgelaufen(sessionRef.current))return;
      // Nicht auf den Server warten: die Sitzung lokal löschen und neu starten.
      // Ein hängender Abmeldeaufruf hat die App sonst blockiert.
      try{sessionStorage.setItem("up_tageswechsel","1");}catch(e){}
      signOutHart();
      try{signOut();}catch(e){}
      window.location.reload();
    },60000);
    return()=>clearInterval(t);
  },[session]);

  // Beim Start wird NUR das Nötigste abgewartet: das eigene Profil.
  // Alles andere (Kollegen, Einträge, Benachrichtigungen, Anträge, Konten,
  // Positionen) lädt danach im Hintergrund nach. Dadurch steht die App
  // nach einem einzigen Aufruf bereit, statt nach einer Kette von sechs.
  async function loadAll(userId){
    // Ist das Profil aus der letzten Sitzung bekannt, sofort damit starten und
    // nur im Hintergrund auffrischen. Dann erscheint gar kein Ladebildschirm.
    const zwischen=(()=>{try{return JSON.parse(localStorage.getItem("up_profil")||"null");}catch(e){return null;}})();
    if(zwischen&&zwischen.id===userId){
      setProfile(zwischen);
      profileLoadedRef.current=true;
      setLoading(false);
      getProfile(userId).then(pr=>{
        setProfile(pr);
        try{localStorage.setItem("up_profil",JSON.stringify(pr));}catch(e){}
      }).catch(()=>{});
      const leitung=istLeitung(zwischen);
      getAllProfiles().then(setProfiles).catch(()=>{});
      loadEntries(leitung,userId).catch(()=>{});
      getMyNotifications(userId).then(setMyNotifications).catch(()=>{});
      return;
    }
    setLoading(true);
    try{
      const prof=await getProfile(userId);
      try{localStorage.setItem("up_profil",JSON.stringify(prof));}catch(e){}
      setProfile(prof);
      profileLoadedRef.current=true;
      setLoading(false);                 // ← App ist ab hier bedienbar

      // Restliche Daten parallel und ohne Blockade nachladen.
      // Schlägt eines davon fehl, bleibt die App trotzdem nutzbar.
      const leitung=istLeitung(prof);
      getAllProfiles().then(setProfiles).catch(()=>{});
      loadEntries(leitung,userId).catch(()=>{});
      getMyNotifications(userId).then(setMyNotifications).catch(()=>{});
      return;
    }catch(e){
      // JWT-Zeitfehler: Token neu holen und nochmal versuchen
      if(e.message?.includes("JWT")||e.message?.includes("future")||e.message?.includes("expired")){
        try{
          await supabase.auth.refreshSession();
          const prof=await getProfile(userId);
          setProfile(prof);
          profileLoadedRef.current=true;
          getAllProfiles().then(setProfiles).catch(()=>{});
          loadEntries(istLeitung(prof),userId).catch(()=>{});
          getMyNotifications(userId).then(setMyNotifications).catch(()=>{});
        }catch(e2){notify(e2.message,"warn");}
      } else {
        notify(e.message,"warn");
      }
    }
    finally{setLoading(false);}
  }

  // Auto-Refresh: Einträge alle 30 Sekunden neu laden
  const prevPendingRef=useRef(0);
  useEffect(()=>{
    if(!session)return;
    const interval=setInterval(async()=>{
      try{
        // Laden ohne Spinner
        let newEntries=[];
        ladeUeAntraege();
        if(isLeitung){
          newEntries=await getAllEntries();
          setEntries(newEntries);
          // Neue ausstehende Einträge? → Benachrichtigung
          const newPending=newEntries.filter(e=>e.status==="pending").length;
          if(newPending>prevPendingRef.current&&prevPendingRef.current>=0){
            const diff=newPending-prevPendingRef.current;
            notify(`🔔 ${diff} neuer Urlaubsantrag eingegangen!`,"warn");
          }
          prevPendingRef.current=newPending;
        }else{
          // Trainer: eigene + bestätigte anderer
          const[mine,confirmed]=await Promise.all([
            getMyEntries(session.user.id),
            getConfirmedEntries()
          ]);
          // Prüfen ob eigene Einträge status-Änderung hatten
          const prevOwn=entries.filter(e=>e.user_id===session.user.id);
          mine.forEach(newE=>{
            const oldE=prevOwn.find(o=>o.id===newE.id);
            if(oldE&&oldE.status!==newE.status){
              if(newE.status==="confirmed")notify("✅ Dein Urlaubsantrag wurde bestätigt!","success");
              if(newE.status==="rejected")notify("❌ Dein Urlaubsantrag wurde abgelehnt.","warn");
            }
          });
          // Eigene Notifications neu laden
          const notifs=await getMyNotifications(session.user.id);
          setMyNotifications(notifs);
          const myIds=new Set(mine.map(e=>e.id));
          const others=confirmed.filter(e=>e.user_id!==session.user.id&&!myIds.has(e.id));
          const myProf=profiles.find(p=>p.id===session.user.id)||profile;
          setEntries([...mine.map(e=>({...e,profiles:myProf})),...others]);
        }
      }catch(e){}
    },30000);
    return()=>clearInterval(interval);
  },[session,isLeitung,profile]);

  async function loadEntries(isAdm,userId){
    try{
      if(isAdm){
        const all=await getAllEntries();
        setEntries(all);
      }else{
        const[mine,confirmed]=await Promise.all([getMyEntries(userId),getConfirmedEntries()]);
        const myIds=new Set(mine.map(e=>e.id));
        const others=confirmed.filter(e=>e.user_id!==userId&&!myIds.has(e.id));
        const myProf=profiles.find(p=>p.id===userId)||await getProfile(userId);
        const mineRich=mine.map(e=>({...e,profiles:myProf}));
        setEntries([...mineRich,...others]);
      }
    }catch(e){
      // JWT-Fehler still ignorieren — loadAll kümmert sich ums Retry
      if(!e.message?.includes("JWT")&&!e.message?.includes("future")){
        notify(e.message,"warn");
      }
    }
  }

  function notify(msg,type="success"){setNotif({msg,type});setTimeout(()=>setNotif(null),5000);}

  // ── Auth ──────────────────────────────────────────────────────────
  async function handleLogin(email,password){
    // WICHTIG: Hier NICHT setLoading(true) — sonst verschwindet die Anmeldemaske
    // samt Eingaben, und eine Fehlermeldung hätte niemanden mehr, der sie anzeigt.
    // Den Wartezustand zeigt der Anmelde-Knopf selbst an.
    setDbError(false);
    try{
      const data=await signIn(email,password);
      const userId=data?.user?.id||(await getSession())?.user?.id;
      if(!userId)throw new Error("Anmeldung fehlgeschlagen — keine Sitzung erhalten.");
      // Erst jetzt umschalten: ab hier ist die Anmeldung geglückt
      setLoading(true);
      setSession(data?.session||await getSession());
      await loadAll(userId);
    }catch(e){
      setLoading(false);
      throw e;                 // LoginScreen zeigt die Meldung an
    }
  }
  async function handleLogout(){
    try{localStorage.removeItem("up_profil");}catch(e){}
    entwurfLoeschen();
    await signOut();
    setView("kalender");
  }

  // ── Profile CRUD ──────────────────────────────────────────────────
  // Felder, über deren Änderung der Mitarbeiter informiert wird
  const MELDEFELDER={
    urlaubstage:"Urlaubstage pro Jahr",
    ueberstunden:"Überstunden",
    resturlaub:"Resturlaub aus dem Vorjahr",
    wochenstunden:"Wochenarbeitszeit",
    arbeitstage_woche:"Arbeitstage pro Woche",
    position:"Position",
    role:"Berechtigung",
  };
  // Überstundenanträge laden (RLS liefert nur Eigene bzw. die geführten Mitarbeiter)
  const prevUeRef=useRef(-1);
  const ueFehlerGemeldet=useRef(false);
  async function ladeUeAntraege(){
    try{
      const liste=await getUeberstundenAntraege();
      setUeAntraege(liste);
      // Neue offene Anträge fremder Mitarbeiter? → Hinweis für die Leitung
      const offen=liste.filter(a=>a.status==="pending"&&a.user_id!==session?.user?.id).length;
      if(prevUeRef.current>=0&&offen>prevUeRef.current){
        notify(`🔔 ${offen-prevUeRef.current} neuer Überstundenantrag eingegangen!`,"warn");
      }
      prevUeRef.current=offen;
    }catch(e){
      // Fehler nicht mehr verschlucken — sonst bleibt die Liste unerklärt leer
      if(!ueFehlerGemeldet.current){
        ueFehlerGemeldet.current=true;
        notify("Überstundenanträge konnten nicht geladen werden: "+e.message,"warn");
      }
    }
  }
  async function ladeJahreskonten(){
    try{setJahreskonten(await getJahreskonten());}catch(e){/* Tabelle evtl. noch nicht angelegt */}
  }
  const [posTick,setPosTick]=useState(0);   // erzwingt Neuaufbau nach Katalogänderung
  const REGEL_VORGABE={frist_tag:30,frist_monat:11,mindest_prozent:90,ueberstunden_erlaubt:true};
  const [regelSaetze,setRegelSaetze]=useState([]);   // je Geltungsbereich
  const [zusatzrechte,setZusatzrechte]=useState([]);
  async function ladeEinstellungen(){
    try{setRegelSaetze(await getEinstellungen()||[]);}catch(e){/* Tabelle evtl. neu */}
    try{setZusatzrechte(await getZusatzrechte()||[]);}catch(e){}
  }
  // Gültige Regeln für eine Person: Bereich → Sparte → global → Vorgabe
  function regelnFuer(u){
    const pi=posInfo(u?.position);
    const finde=g=>regelSaetze.find(r=>r.geltung===g);
    const satz=finde("bereich:"+pi.bereich)||finde("sparte:"+pi.sparte)||finde("global")||{};
    return{
      frist_tag:satz.frist_tag??REGEL_VORGABE.frist_tag,
      frist_monat:satz.frist_monat??REGEL_VORGABE.frist_monat,
      mindest_prozent:u?.mindest_prozent??satz.mindest_prozent??REGEL_VORGABE.mindest_prozent,
      ueberstunden_erlaubt:u?.ueberstunden_erlaubt??satz.ueberstunden_erlaubt??REGEL_VORGABE.ueberstunden_erlaubt,
      quelle:satz.geltung||"vorgabe",
    };
  }
  async function ladePositionen(){
    try{
      if(uebernehmePositionen(await getPositionen()))setPosTick(t=>t+1);
    }catch(e){/* Tabelle fehlt → eingebauter Standardkatalog bleibt aktiv */}
  }
  useEffect(()=>{
    if(!session||!profile)return;
    // Nacheinander mit kurzem Versatz, damit der Start nicht von einer
    // Welle gleichzeitiger Anfragen ausgebremst wird.
    const t0=setTimeout(()=>ladeEinstellungen(),80);
    const t1=setTimeout(()=>ladePositionen(),150);
    const t2=setTimeout(()=>ladeJahreskonten(),400);
    const t3=setTimeout(()=>ladeUeAntraege(),700);
    return()=>{clearTimeout(t0);clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  },[session,profile]);

  async function handleUeAntrag(stunden,grund){
    try{
      await createUeberstundenAntrag(session.user.id,stunden,grund);
      await ladeUeAntraege();
      notify("Überstundenantrag eingereicht – die Leitung entscheidet.");
    }catch(e){notify("Antrag fehlgeschlagen: "+e.message,"warn");}
  }
  async function handleUeEntscheiden(id,status,hinweis){
    try{
      const erg=await decideUeberstundenAntrag(id,status,hinweis);
      await ladeUeAntraege();
      const profs=await getAllProfiles();
      setProfiles(profs);
      const eigen=profs.find(p=>p.id===session.user.id);
      if(eigen)setProfile(eigen);
      setDashRefresh(x=>x+1);       // Dashboard-Karten neu berechnen
      if(status==="confirmed"){
        const neu=erg&&erg.ueberstunden_neu!==undefined?erg.ueberstunden_neu:null;
        notify(neu!==null
          ? "Überstunden übernommen – Konto steht jetzt auf "+fmtT(neu)+" Tagen."
          : "Überstunden übernommen.");
      }else{
        notify("Antrag abgelehnt.");
      }
    }catch(e){
      // Fehler deutlich und dauerhaft anzeigen, nicht nur kurz einblenden
      window.alert("Der Antrag konnte nicht verbucht werden:\n\n"+e.message);
      notify("Nicht verbucht: "+e.message,"warn");
    }
  }
  async function handleUeZuruecknehmen(id){
    try{
      await deleteUeberstundenAntrag(id);
      await ladeUeAntraege();
      notify("Antrag zurückgezogen.");
    }catch(e){notify("Fehlgeschlagen: "+e.message,"warn");}
  }

  async function handleUpdateProfile(id,data,jahr){
    const vorher=profiles.find(x=>x.id===id)||null;
    // Urlaubsanspruch und Resturlaub gehören ins Jahreskonto, nicht ins Profil
    if(jahr&&!data.pauschal&&(data.urlaubstage!==undefined||data.resturlaub!==undefined)){
      try{
        await setJahreskonto(id,jahr,Number(data.urlaubstage)||0,Number(data.resturlaub)||0);
        await ladeJahreskonten();
      }catch(e){notify("Jahreskonto nicht gespeichert: "+e.message,"warn");}
    }
    const p=await updateProfile(id,data);
    setProfiles(prev=>prev.map(x=>x.id===id?p:x));
    if(id===profile?.id)setProfile(p);

    // Hat eine Leitung fremde Stammdaten geändert? Dann den Mitarbeiter informieren.
    if(vorher&&id!==profile?.id){
      const geaendert=Object.keys(MELDEFELDER)
        .filter(f=>f in data&&String(vorher[f]??"")!==String(p[f]??""))
        .map(f=>{
          const alt=f==="position"?posLabel(vorher[f],p.geschlecht)
                   :f==="role"?rolleLabel(vorher[f]):String(vorher[f]??"—");
          const neu=f==="position"?posLabel(p[f],p.geschlecht)
                   :f==="role"?rolleLabel(p[f]):String(p[f]??"—");
          return MELDEFELDER[f]+": "+alt+" → "+neu;
        });
      if(geaendert.length>0){
        const wer=[profile?.vorname,profile?.nachname].filter(Boolean).join(" ")||"Die Leitung";
        try{
          await createNotification(id,
            wer+" hat deine Stammdaten geändert — "+geaendert.join(" · "),"info");
        }catch(e){/* Benachrichtigung ist kein Grund, das Speichern scheitern zu lassen */}
      }
    }
    notify("Gespeichert.");
  }
  async function handleCreateUser(data){
    await createUser(data);
    const profs=await getAllProfiles();
    setProfiles(profs);
    notify("Mitarbeiter angelegt. Er kann sich nun anmelden.");
  }
  async function handleDeleteUser(id){
    try{
      await deleteUser(id);
      setProfiles(prev=>prev.filter(p=>p.id!==id));
      setEntries(prev=>prev.filter(e=>e.user_id!==id));
      notify("Mitarbeiter vollständig gelöscht (Zugang, Profil und Einträge).");
    }catch(e){
      notify("Löschen fehlgeschlagen: "+e.message,"warn");
    }
  }

  // ── Entries CRUD ──────────────────────────────────────────────────
  async function handleCreateEntry(data){
    const{user_id,type,von,bis,note}=data;
    // Doppelbuchung verhindern (zweite Sicherung, falls der Dialog umgangen wurde)
    const schonVorhanden=entries.filter(e=>
      e.user_id===user_id&&e.status!=="rejected"&&von<=e.bis&&bis>=e.von);
    if(schonVorhanden.length>0){
      notify("Für diesen Zeitraum besteht bereits ein Eintrag. Es wurde nichts gespeichert.","warn");
      return;
    }
    const zielProfil=profiles.find(p=>p.id===user_id)||null;
    // Wer den Zielmitarbeiter führen darf, trägt direkt bestätigt ein (eigener Urlaub nicht)
    // Pauschalkräfte ohne Genehmigungspflicht tragen frei ein — ohne Antrag.
    const ohneGenehmigung=istPauschal(zielProfil)&&zielProfil?.genehmigung_noetig===false;
    const sofortBestaetigt=isAdmin||ohneGenehmigung
      ||(user_id!==profile?.id&&canManage(profile,zielProfil,zusatzrechte));
    // Konfliktcheck (Mitarbeiter)
    if(!sofortBestaetigt){
      // Nur Überschneidungen im eigenen Fachbereich sind relevant
      const zb=posInfo(zielProfil?.position).bereich;
      const conflicts=(await checkConflicts(user_id,von,bis)).filter(c=>bereichVon(c.user_id)===zb);
      if(conflicts.length>0){
        notify(`Im Bereich ${BEREICH_NAME[zb]||"deines Teams"} ist im gewählten Zeitraum bereits Urlaub eingetragen. Der Antrag wurde gestellt – die Leitung entscheidet.`,"warn");
      }
    }
    const e=await createEntry({user_id,type,von,bis,note});
    if(sofortBestaetigt){await setEntryStatus(e.id,"confirmed");}
    await loadEntries(isLeitung,session.user.id);
    notify(ohneGenehmigung&&user_id===profile?.id
      ? "Urlaub eingetragen."
      : sofortBestaetigt?"Eintrag bestätigt gespeichert.":"Urlaubsantrag eingereicht – wartet auf Genehmigung.");
  }
  async function handleUpdateEntry(id,data){
    await updateEntry(id,data);
    await loadEntries(isLeitung,session.user.id);
    notify("Eintrag aktualisiert.");
  }
  async function handleSetStatus(id,status){
    if(status==="confirmed"){
      const entry=entries.find(e=>e.id===id);
      if(entry){
        const zb=bereichVon(entry.user_id);
        const conflicts=(await checkConflicts(entry.user_id,entry.von,entry.bis))
          .filter(c=>bereichVon(c.user_id)===zb);
        if(conflicts.length>0){
          const names=conflicts.map(c=>c.profiles?.vorname||"jemand").join(", ");
          if(!window.confirm(`Überschneidung im Bereich ${BEREICH_NAME[zb]||"–"} mit: ${names}.\n\nTrotzdem bestätigen?`))return;
        }
      }
      await setEntryStatus(id,status);
      // Mitarbeiter benachrichtigen
      const e=entries.find(x=>x.id===id);
      if(e)await createNotification(e.user_id,`Dein Urlaubsantrag (${fmtDE(e.von)} – ${fmtDE(e.bis)}) wurde bestätigt. ✅`,"confirmed",id);
    } else if(status==="rejected"){
      // Ablehnungsgrund abfragen
      const grund=window.prompt("Optional: Begründung für die Ablehnung (wird dem Mitarbeiter mitgeteilt):");
      if(grund===null)return; // Abbrechen
      await setEntryStatus(id,status);
      const e=entries.find(x=>x.id===id);
      if(e){
        const msg=grund?.trim()
          ?`Dein Urlaubsantrag (${fmtDE(e.von)} – ${fmtDE(e.bis)}) wurde abgelehnt. Begründung: ${grund}`
          :`Dein Urlaubsantrag (${fmtDE(e.von)} – ${fmtDE(e.bis)}) wurde leider abgelehnt.`;
        await createNotification(e.user_id,msg,"rejected",id);
      }
    } else {
      await setEntryStatus(id,status);
    }
    await loadEntries(isLeitung,session.user.id);
    notify(status==="confirmed"?"✅ Eintrag bestätigt!":"❌ Eintrag abgelehnt.","success");
  }
  async function handleDeleteEntry(id, adminNote=""){
    const e=entries.find(x=>x.id===id);
    await deleteEntry(id);
    // Mitarbeiter benachrichtigen wenn Admin einen fremden Eintrag löscht
    if(e&&isLeitung&&e.user_id!==session.user.id){
      const msg=adminNote?.trim()
        ?`Dein Urlaubseintrag (${fmtDE(e.von)} – ${fmtDE(e.bis)}) wurde vom Admin gelöscht. Hinweis: ${adminNote}`
        :`Dein Urlaubseintrag (${fmtDE(e.von)} – ${fmtDE(e.bis)}) wurde vom Admin gelöscht.`;
      await createNotification(e.user_id,msg,"rejected");
    }
    await loadEntries(isLeitung,session.user.id);
    notify("Eintrag gelöscht.");
  }
  async function handleAdminResetPw(userId,newPw){
    const{error}=await supabase.rpc("admin_reset_password",{target_user_id:userId,new_password:newPw});
    if(error)throw new Error("Passwort konnte nicht zurückgesetzt werden: "+error.message);
  }
  async function handleChangePw(currentPw,newPw){
    // Supabase: zuerst neu-anmelden zum Verifizieren, dann updaten
    const{error:loginErr}=await supabase.auth.signInWithPassword({email:profile.email,password:currentPw});
    if(loginErr)throw new Error("Aktuelles Passwort falsch.");
    const{error}=await supabase.auth.updateUser({password:newPw});
    if(error)throw new Error(error.message);
  }

  function handlePrint(mode){
    if(mode==="kalender"){
      // Kalender: in neuem Fenster drucken für garantiertes Querformat
      setPrintMode("kalender_window");
      return;
    }
    setPrintMode(mode);
    setTimeout(()=>{
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          window.print();
          setTimeout(()=>setPrintMode(null),1000);
        });
      });
    },400);
  }

  // Kalender: bestätigte + eigene pending
  // Gehört diese Person zum aktuell gewählten Bereichsfilter?
  function imKalenderFilter(u){
    if(!u)return false;
    if(!darfBereichFiltern)return true;
    return passtZuFilter(u,kalBereich);
  }
  function calEntries(){
    const sichtbar=entries.filter(e=>{
      if(e.user_id===session?.user.id)return true;              // eigene immer
      if(e.status!=="confirmed")return false;                    // fremde nur bestätigt
      return canSee(profile,profiles.find(p=>p.id===e.user_id),zusatzrechte);
    });
    return sichtbar.filter(e=>imKalenderFilter(profiles.find(p=>p.id===e.user_id)));
  }
  // Profiles mit ihren Einträgen zusammenführen
  function profilesWithEntries(){
    // Urlaubsanspruch und Resturlaub aus dem Jahreskonto des angezeigten Jahres
    // überschreiben die alten Profilwerte — so rechnen alle Ansichten jahresgenau.
    const basis=profiles.length>0?profiles:(profile?[profile]:[]);
    return basis.map(p=>{
      const k=kontoFuer(p,year);
      return{
        ...p,
        urlaubstage:istPauschal(p)?0:k.urlaubstage,
        resturlaub:istPauschal(p)?0:k.resturlaub,
        kontoEigen:k.eigen,
        entries:entries.filter(e=>e.user_id===p.id)
      };
    });
  }

  const stateName=BUNDESLAENDER.find(b=>b[0]===bundesland)?.[1]||"";
  const offeneUeAntraege=(ueAntraege||[]).filter(a=>
    a.status==="pending"&&darfEntscheiden(profile,profiles.find(p=>p.id===a.user_id),zusatzrechte));
  const pendingCount=entries.filter(e=>e.status==="pending"&&darfEntscheiden(profile,profiles.find(p=>p.id===e.user_id),zusatzrechte)).length
    +offeneUeAntraege.length;

  if(dbError)return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
      <div style={{fontSize:44}}>⚠️</div>
      <div style={{color:"#f1f5f9",fontSize:17,fontWeight:700,textAlign:"center"}}>Datenbank nicht erreichbar</div>
      <div style={{color:"#94a3b8",fontSize:14,textAlign:"center",maxWidth:420,lineHeight:1.5}}>
        Die Verbindung ist unterbrochen. Das passiert meist kurz nach einem Wechsel zwischen WLAN und Mobilfunk.
      </div>
      <div style={{color:"#64748b",fontSize:13,textAlign:"center"}}>
        Es wird automatisch weiter versucht{wiederVersuch>0?" ("+wiederVersuch+". Versuch)":""}…
      </div>
      <button onClick={()=>{setDbError(false);setLoading(true);window.location.reload();}} style={{marginTop:8,background:"#5a8a1f",color:"#fff",border:"none",borderRadius:10,padding:"12px 28px",fontSize:15,fontWeight:700,cursor:"pointer"}}>
        Jetzt neu verbinden
      </button>
    </div>
  );
  if(loading)return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:20,textAlign:"center"}}>
      <div style={{fontSize:40}}>📅</div>
      <div style={{color:"#64748b",fontSize:14}}>Verbindung wird hergestellt…</div>
      {/* Notausgänge erst anbieten, wenn es wirklich zu lange dauert */}
      {langesLaden&&(<>
        <button onClick={()=>{bootRef.current=false;setLoading(false);setDbError(false);setTimeout(()=>boot(),50);}}
          style={{marginTop:8,background:"none",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer"}}>
          Neu verbinden
        </button>
        <button onClick={()=>{signOutHart();try{signOut();}catch(e){}window.location.reload();}}
          style={{background:"none",border:"none",color:"#475569",fontSize:12,cursor:"pointer",textDecoration:"underline",padding:8}}>
          Abmelden und neu starten
        </button>
      </>)}
    </div>
  );
  if(!session)return <LoginScreen onLogin={handleLogin}/>;

  // Session existiert aber Profil fehlt → Fehlermeldung statt Endlos-Schleife
  if(session&&!profile&&!loading){
    return (
      <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
        <div style={{fontSize:44}}>⚠️</div>
        <div style={{color:"#f1f5f9",fontSize:17,fontWeight:700,textAlign:"center"}}>Profil konnte nicht geladen werden</div>
        <div style={{color:"#94a3b8",fontSize:14,textAlign:"center",maxWidth:440,lineHeight:1.5}}>
          Die Anmeldung war erfolgreich, aber es konnte kein Benutzerprofil gefunden werden. Bitte wende dich an den Administrator.
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button onClick={async()=>{setLoading(true);const s=await getSession();if(s)await loadAll(s.user.id);else setLoading(false);}} style={{background:"#5a8a1f",color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Erneut versuchen
          </button>
          <button onClick={async()=>{await signOut();setSession(null);setProfile(null);profileLoadedRef.current=false;}} style={{background:"#334155",color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  // Einmalpasswort: Mitarbeiter muss neues Passwort setzen
  if(profile?.must_change_password){
    return <ForceChangePassword user={profile} onDone={async(newPw)=>{
      // WICHTIG: Reihenfolge — zuerst Flag in DB löschen, DANN Passwort ändern
      // (updateUser löst onAuthStateChange aus das das Profil neu lädt)
      try{
        // 1. Flag zuerst in der DB zurücksetzen
        await clearMustChangePassword(profile.id);
        // 2. Lokalen State sofort aktualisieren
        setProfile(p=>({...p,must_change_password:false}));
        // 3. Dann das Passwort ändern
        const{error}=await supabase.auth.updateUser({password:newPw});
        if(error){
          // Passwort-Änderung fehlgeschlagen → Flag wieder setzen wäre falsch,
          // da User schon durch ist. Nur Fehler zeigen.
          throw new Error(error.message);
        }
        notify("✅ Passwort erfolgreich geändert! Willkommen.");
      }catch(e){
        // Bei Fehler: Flag bleibt false (User kann normal weiterarbeiten)
        // aber Fehlermeldung zeigen
        throw e;
      }
    }}/>;
  }

  // Navigation mit Ungespeichert-Prüfung
  function handleNavClick(id){
    if(view==="profil"&&profileDirty&&id!=="profil"){
      setPendingView(id); // Dialog öffnen
    } else {
      setView(id);
    }
  }

  const navItems=isLeitung
    ?[["kalender","📅 Kalender"],["dashboard","📊 Dashboard"],["mitarbeiter","👥 Mitarbeiter"],["eintraege","📋 Urlaubseinträge"],
      ...(isAdmin?[]:[["meinurlaub","🏖 Mein Urlaub"]]),
      ["feiertage","🗓 Ferien & Feiertage"],
      ...(isAdmin?[["protokoll","🔍 Protokoll"]]:[]),
      ["profil","👤 Profil"],["hilfe","❓ Anleitung"]]
    :[["kalender","📅 Kalender"],["dashboard","📊 Dashboard"],["meinurlaub","🏖 Mein Urlaub"],["feiertage","🗓 Ferien & Feiertage"],["profil","👤 Profil"],["hilfe","❓ Anleitung"]];

  // Die Kollegenliste kommt eventuell erst kurz nach dem Start an —
  // bis dahin steht wenigstens das eigene Profil zur Verfügung.
  const pwu=profilesWithEntries();
  // Mitarbeiter, die die angemeldete Person führen darf (inkl. sich selbst)
  const meineLeute=pwu.filter(u=>canSee(profile,u,zusatzrechte));
  // Nur diese dürfen auch bearbeitet werden
  const meineBearbeitbaren=pwu.filter(u=>canManage(profile,u,zusatzrechte));
  // Urlaubsanspruch einer Person für ein bestimmtes Jahr
  function kontoFuer(u,jahr){
    if(!u)return{urlaubstage:0,resturlaub:0,eigen:false};
    if(istPauschal(u))return{urlaubstage:0,resturlaub:0,eigen:true};
    const k=jahreskonten.find(x=>x.user_id===u.id&&Number(x.jahr)===Number(jahr));
    if(k)return{urlaubstage:Number(k.urlaubstage)||0,resturlaub:Number(k.resturlaub)||0,eigen:true};
    // Rückfall auf die alten Profilwerte, solange kein Jahreskonto besteht
    return{urlaubstage:Number(u.urlaubstage)||0,resturlaub:Number(u.resturlaub)||0,eigen:false};
  }
  // Verbrauch und Planungsstand einer Person in einem Jahr
  function planungFuer(u,jahr){
    const k=kontoFuer(u,jahr);
    const js=String(jahr);
    const ej=(u?.entries||[]).filter(e=>(e.von?.startsWith(js)||e.bis?.startsWith(js))&&e.status!=="rejected");
    const genutztUrlaub=eDays(ej,"urlaub",u), genutztRest=eDays(ej,"resturlaub",u);
    const anspruch=k.urlaubstage+k.resturlaub;
    const verplant=genutztUrlaub+genutztRest;
    return{...k,anspruch,verplant,genutztUrlaub,genutztRest,
           genutztUeber:eDays(ej,"ueberstunden",u),
           anteil:anspruch>0?verplant/anspruch:1};
  }

  // Fachbereich einer Person — Grundlage für Überschneidungen
  const bereichVon=id=>posInfo(profiles.find(p=>p.id===id)?.position).bereich;

  return(
    <div style={S.app}>
      {/* HEADER */}
      <header style={S.header}>
        <div style={S.hL}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="TZ Westlausitz" style={{height:44,width:"auto",filter:"brightness(0) invert(1)"}}/>
            <div style={{borderLeft:"1px solid rgba(255,255,255,0.3)",paddingLeft:12}}>
              <div style={S.logoSub}>Urlaubsplaner</div>
            </div>
          </div>
          <div style={S.yearCtrl}>
            <button style={S.yBtn} onClick={()=>setYear(y=>y-1)}>‹</button>
            <span style={S.yLbl}>{year}</span>
            <button style={S.yBtn} onClick={()=>setYear(y=>y+1)}>›</button>
          </div>
          <select value={bundesland} onChange={e=>setBundesland(e.target.value)} style={S.blSel}>
            {BUNDESLAENDER.filter(b=>b[0]).map(([c,n])=><option key={c} value={c}>{n}</option>)}
          </select>
        </div>
        <div style={S.hR}>
          <div style={S.uBadge}>
            <div style={{...S.av,background:profile?.color||"#2563EB"}}>{profile?.vorname?.[0]||"?"}</div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#f1f5f9"}}>{profile?.vorname} {profile?.nachname}</div>
              <div style={{fontSize:10,color:isAdmin?"#fbbf24":"#64748b"}}>{posLabel(profile?.position,profile?.geschlecht)}{isAdmin?" · Administrator":""}</div>
            </div>
          </div>
          <button style={S.pBtn} onClick={()=>handlePrint("kalender")} title="Kalender">🖨</button>
          <button style={{...S.pBtn,background:"#1e3a5f"}} onClick={()=>handlePrint("liste")} title="Liste">📋</button>
          <button style={{...S.pBtn,background:"#7f1d1d",color:"#fca5a5"}} onClick={handleLogout}>Abmelden</button>
        </div>
      </header>

      {/* NAV */}
      <nav style={S.nav}>
        {navItems.map(([id,lbl])=>(
          <button key={id} style={{...S.navBtn,...(view===id?S.navAct:{})}} onClick={()=>handleNavClick(id)}>{lbl}</button>
        ))}
        {isLeitung&&pendingCount>0&&<button onClick={()=>{
          const firstPending=entries.filter(e=>e.status==="pending")
            .sort((a,b)=>a.von.localeCompare(b.von))[0];
          if(firstPending?.von){
            const py=parseInt(firstPending.von.substring(0,4));
            setYear(py);
            setPendingJumpYear(py);
          }
          setView("eintraege");
        }} style={{...S.pendBadge,cursor:"pointer",border:"none"}}>{pendingCount} ausstehend ▶</button>}
        <div style={{...S.legend,...(schmal?{marginLeft:0,alignItems:"stretch",width:"100%",gap:4}:{})}}>
          {/* Zeile 1: Mitarbeiterfarben */}
          <div style={{...S.legRow,...(schmal?{flexWrap:"nowrap",overflowX:"auto",justifyContent:"flex-start",gap:10,paddingBottom:2}:{})}}>
            {pwu.filter(u=>canSee(profile,u,zusatzrechte)&&imKalenderFilter(u)
                &&u.entries.some(e=>e.status==="confirmed"
                  &&(e.von?.startsWith(String(year))||e.bis?.startsWith(String(year))))).map(u=>(
              <div key={u.id} style={S.legItem}><div style={{...S.legDot,background:u.color}}/><span>{u.vorname}</span></div>
            ))}
          </div>
          {/* Zeile 2: Bereichsfilter — nur für Geschäfts-/Praxisleitung und Administratoren */}
          {darfBereichFiltern&&view==="kalender"&&(
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",justifyContent:schmal?"flex-start":"flex-end"}}>
              {/* Schnellwahl: nur die drei obersten Ebenen als Knöpfe */}
              {[["alle","👥 Alle"],["sparte:therapie","🩺 Therapie"],["sparte:pflege","🏠 Pflege"]].map(([k,lbl])=>(
                <button key={k} onClick={()=>setKalBereich(k)} style={{
                  background:kalBereich===k?"#e8f3d6":"none",cursor:"pointer",
                  border:"1px solid "+(kalBereich===k?"#7ab529":"#cbd5e1"),
                  borderRadius:14,padding:"3px 10px",transition:"all .15s",
                  opacity:kalBereich===k?1:0.6,
                  fontSize:11,fontWeight:700,color:kalBereich===k?"#4a6b0f":"#94a3b8",whiteSpace:"nowrap",
                }}>{lbl}</button>
              ))}
              {/* Feinauswahl über ein Aufklappmenü — spart auf großen Bildschirmen viel Platz */}
              <select value={kalBereich} onChange={e=>setKalBereich(e.target.value)}
                title="Einzelnen Bereich auswählen"
                style={{background:kalBereich==="alle"?"#f8faf0":"#e8f3d6",
                  border:"1.5px solid "+(kalBereich==="alle"?"#c8d890":"#7ab529"),
                  borderRadius:14,padding:"4px 10px",fontSize:11,fontWeight:700,
                  color:"#4a6b0f",maxWidth:"100%",outline:"none",cursor:"pointer"}}>
                {FILTER_GRUPPEN.map(([gruppe,opts])=>(
                  <optgroup key={gruppe} label={gruppe}>
                    {opts.map(([k,lbl])=><option key={k} value={k}>{lbl}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
          {/* Zeile 3: Ferien- und Feiertagsanzeige */}
          <div style={{...S.legRow,...(schmal?{justifyContent:"flex-start"}:{})}}>
          {/* Ferien Toggle — klickbar */}
          <button onClick={()=>setShowFerien(v=>!v)} style={{
            display:"flex",alignItems:"center",gap:5,background:"none",cursor:"pointer",
            border:"1px solid "+(showFerien?"#f9a8d4":"#cbd5e1"),
            borderRadius:14,padding:"3px 9px",transition:"all .15s",
            opacity:showFerien?1:0.45,
          }} title={showFerien?"Ferien ausblenden":"Ferien einblenden"}>
            <div style={{...S.legDot,background:showFerien?"#fce7f3":"#e2e8f0",border:"1px solid "+(showFerien?"#f9a8d4":"#cbd5e1")}}/>
            <span style={{fontSize:11,color:showFerien?"#9d174d":"#94a3b8",fontWeight:600}}>
              {showFerien?"🌸 Ferien":"— Ferien"}
            </span>
          </button>
          {/* Feiertage Toggle — klickbar */}
          <button onClick={()=>setShowFeiertage(v=>!v)} style={{
            display:"flex",alignItems:"center",gap:5,background:"none",cursor:"pointer",
            border:"1px solid "+(showFeiertage?"#c9a07a":"#cbd5e1"),
            borderRadius:14,padding:"3px 9px",transition:"all .15s",
            opacity:showFeiertage?1:0.45,
          }} title={showFeiertage?"Feiertage ausblenden":"Feiertage einblenden"}>
            <div style={{...S.legDot,background:showFeiertage?"#d4b896":"#e2e8f0",border:"1px solid "+(showFeiertage?"#c9a07a":"#cbd5e1")}}/>
            <span style={{fontSize:11,color:showFeiertage?"#5c3d1a":"#94a3b8",fontWeight:600}}>
              {showFeiertage?"🎉 Feiertag":"— Feiertag"}
            </span>
          </button>
          </div>
        </div>
      </nav>

      {/* Mitarbeiter-Benachrichtigungen (persistent) */}
      {myNotifications.length>0&&(
        <div style={{background:"#f0fdf4",borderLeft:"4px solid #22c55e",padding:"10px 16px",display:"flex",flexDirection:"column",gap:6}}>
          {myNotifications.map(n=>(
            <div key={n.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div>
                <span style={{fontSize:13,color:"#15803d",fontWeight:600}}>{n.type==="confirmed"?"✅":n.type==="rejected"?"❌":n.type==="change_request"?"🔄":"ℹ️"} {n.message}</span>
                <span style={{fontSize:11,color:"#86efac",marginLeft:8}}>{new Date(n.created_at).toLocaleDateString("de-DE")}</span>
              </div>
              <button onClick={async()=>{await markNotificationRead(n.id);setMyNotifications(p=>p.filter(x=>x.id!==n.id));}} style={{background:"none",border:"1px solid #86efac",color:"#15803d",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",flexShrink:0}}>
                ✓ Gelesen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* NOTIFICATION — JWT-Fehler werden unterdrückt */}
      {notif&&!notif.msg?.includes("JWT")&&!notif.msg?.includes("future")&&(
        <div style={{...S.notif,background:notif.type==="warn"?"#fff7ed":"#f7fce8",borderColor:notif.type==="warn"?"#f0932b":"#7ab529",color:notif.type==="warn"?"#9a3412":"#4a6b0f"}}>
          {notif.type==="warn"?"⚠️":"✅"} {notif.msg}
        </div>
      )}

      {/* Wiederherstellung nach einem Neustart durch das Betriebssystem */}
      {entwurfHinweis&&(()=>{
        const e=entwurfLesen();
        if(!e)return null;
        const was=e.typ==="addUser"?"Neuer Mitarbeiter"
                 :e.typ==="editUser"?"Mitarbeiter bearbeiten":"Formular";
        const name=[e.felder?.vorname,e.felder?.nachname].filter(Boolean).join(" ");
        return(
          <div style={{background:"#fff7ed",border:"1.5px solid #f0932b",borderRadius:10,
            padding:"12px 14px",margin:"0 0 16px",display:"flex",alignItems:"center",
            gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:18}}>💾</span>
            <div style={{flex:"1 1 220px",minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:"#92400e"}}>
                Nicht gespeicherte Eingaben gefunden
              </div>
              <div style={{fontSize:12,color:"#b45309"}}>
                „{was}“{name?" – "+name:""}. Möchtest du dort weitermachen?
              </div>
            </div>
            <button style={{...S.savBtn,background:"#f0932b",padding:"7px 16px",fontSize:13}}
              onClick={()=>{
                setEntwurfHinweis(false);
                setModal({type:e.typ,data:e.daten,entwurf:e});
              }}>Weitermachen</button>
            <button style={{...S.canBtn,padding:"7px 14px",fontSize:13}}
              onClick={()=>{entwurfLoeschen();setEntwurfHinweis(false);}}>Verwerfen</button>
          </div>
        );
      })()}

      {/* Begrüßung beim ersten Öffnen */}
      {profile&&!willkommenGesehen&&(
        <div style={S.overlay}>
          <div style={{...S.modal,maxWidth:480}}>
            <div style={S.mHd}>
              <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>
                👋 Willkommen{profile.vorname?", "+profile.vorname:""}!
              </span>
            </div>
            <div style={{...S.mBd,fontSize:13,color:"#2d3a2e",lineHeight:1.6}}>
              <p style={{marginTop:0}}>
                Schön, dass du da bist. Der Urlaubsplaner ist die zentrale Stelle für alle
                Urlaubsanträge im Therapie- &amp; Pflegezentrum Westlausitz.
              </p>
              <p style={{marginBottom:0}}>
                Wir haben eine kurze Anleitung vorbereitet: Urlaub beantragen, Überstunden melden,
                wie Urlaubstage gezählt werden und was bis wann eingetragen sein muss.
                Du findest sie jederzeit oben unter <strong>„❓ Anleitung“</strong>.
              </p>
            </div>
            <div style={S.mFt}>
              <button style={S.savBtn} onClick={()=>{
                try{localStorage.setItem("up_willkommen","1");}catch(e){}
                setWillkommenZu(true);setView("hilfe");
              }}>Anleitung öffnen</button>
              <button style={S.canBtn} onClick={()=>{
                try{localStorage.setItem("up_willkommen","1");}catch(e){}
                setWillkommenZu(true);
              }}>Später</button>
            </div>
          </div>
        </div>
      )}

      {/* Hinweis auf Neuerungen nach einem Update */}
      {profile&&willkommenGesehen&&!neuerungenZu&&neueEintraege(profile.changelog_version).length>0&&(
        <NeuerungenModal
          eintraege={neueEintraege(profile.changelog_version)}
          onGelesen={async()=>{
            try{
              const p=await updateProfile(profile.id,{changelog_version:AKTUELLE_VERSION});
              setProfile(p);
              setProfiles(prev=>prev.map(x=>x.id===p.id?{...x,...p}:x));
            }catch(e){notify("Hinweis konnte nicht gespeichert werden: "+e.message,"warn");}
            setNeuerungenZu(true);
          }}
          onSpaeter={()=>setNeuerungenZu(true)}/>
      )}

      {/* MAIN */}
      <main key={"main"+posTick} style={S.main} onClick={()=>setTooltip(null)}>
        {/* Abgabefrist für die Jahresplanung */}
        <FristBanner planJahr={planJahr} tick={fristTick}
          eigene={profile&&!istPauschal(profile)?planungFuer(pwu.find(u=>u.id===session.user.id)||profile,planJahr):null}
          offeneLeute={isLeitung?meineLeute.filter(u=>!istPauschal(u)&&planungFuer(u,planJahr).anteil<mindestAnteil(regelnFuer(u))):[]}
          regeln={regelnFuer(pwu.find(u=>u.id===session.user.id)||profile)} user={pwu.find(u=>u.id===session.user.id)||profile}
          istLeitung={isLeitung} darfBereichFiltern={darfBereichFiltern}
          onPlanen={()=>{
            // Direkt in die Planung des betroffenen Jahres springen und
            // den Antragsdialog für die eigene Person gleich öffnen.
            if(year!==planJahr)setYear(planJahr);
            setView(isLeitung?"eintraege":"meinurlaub");
            setModal({type:"addEntry",data:{userId:session.user.id}});
          }}/>
        {view==="kalender"&&<KalView key={"kal"+kalTick} year={year} entries={calEntries()} profiles={profiles} bl={bundesland} showFerien={showFerien} showFeiertage={showFeiertage} onTip={setTooltip} offTip={()=>setTooltip(null)}/>}
        {view==="dashboard"&&<DashView users={isLeitung?meineLeute:(pwu.find(u=>u.id===session.user.id)?pwu.filter(u=>u.id===session.user.id):(profile?[{...profile,entries:entries.filter(e=>e.user_id===session.user.id)}]:[]))} isAdmin={isLeitung} viewer={profile} year={year} refreshKey={dashRefresh} onEdit={u=>setModal({type:"editUser",data:u})} onResetPwForUser={(d)=>setModal({type:"resetPw",data:d})}/>}
        {view==="mitarbeiter"&&isLeitung&&<MitView users={meineLeute} bearbeitbar={meineBearbeitbaren.map(u=>u.id)} viewer={profile} canDelete={isAdmin}
          onPositionen={isAdmin?()=>setModal({type:"positionen"}):null}
          onRegeln={darfRegeln?()=>setModal({type:"einstellungen"}):null}
          onKonto={u=>setModal({type:"uekonto",data:u})}
          onRechte={(isAdmin||posInfo(profile?.position).scope==="alle")?u=>setModal({type:"rechte",data:u}):null}
          onAdd={()=>setModal({type:"addUser"})} onEdit={u=>setModal({type:"editUser",data:u})} onDelete={async id=>{const u=profiles.find(p=>p.id===id);const nm=u?[u.vorname,u.nachname].filter(Boolean).join(" "):"Dieser Mitarbeiter";if(window.confirm(nm+" wird endgültig gelöscht:\n\n• Zugang (Anmeldung)\n• Profil\n• alle Urlaubseinträge\n\nDas kann nicht rückgängig gemacht werden. Fortfahren?"))await handleDeleteUser(id);}}/>}
        {view==="eintraege"&&isLeitung&&<EintAdmin viewer={profile} rechte={zusatzrechte} darfBereichFiltern={darfBereichFiltern} ueAntraege={ueAntraege.filter(a=>a.user_id!==profile?.id||isAdmin||posInfo(profile?.position).scope==="alle")} onUeEntscheiden={handleUeEntscheiden} entries={entries.filter(e=>canSee(profile,profiles.find(p=>p.id===e.user_id),zusatzrechte))} profiles={profiles} year={pendingJumpYear||year} onStatus={handleSetStatus} onDelete={async(id,note)=>{if(window.confirm("Eintrag wirklich löschen?"))await handleDeleteEntry(id,note);}} onAdd={uid=>setModal({type:"addEntry",data:{userId:uid}})} onEdit={(uid,e)=>setModal({type:"editEntry",data:{userId:uid,entry:e}})}/>}
        {view==="meinurlaub"&&!isAdmin&&<MeinUrlaub user={pwu.find(u=>u.id===session.user.id)||profile} year={year} ueAntraege={ueAntraege} onUeAntrag={handleUeAntrag} onUeZurueck={handleUeZuruecknehmen} onAdd={()=>setModal({type:"addEntry",data:{userId:session.user.id}})} onEdit={e=>setModal({type:"editEntry",data:{userId:session.user.id,entry:e}})} onDelete={async(id,note)=>{if(window.confirm("Antrag löschen?"))await handleDeleteEntry(id,note);}} onRequestChange={e=>setModal({type:"changeRequest",data:{entry:e}})} onRequestDelete={e=>setModal({type:"deleteRequest",data:{entry:e}})}/>}
        {view==="hilfe"&&<HilfeView user={profile} istLeitung={isLeitung} isAdmin={isAdmin}/>}
        {view==="protokoll"&&isAdmin&&<ProtokollView/>}
        {view==="feiertage"&&<FerView key={"fer"+kalTick} year={year} state={bundesland} stateName={stateName}/>}
        {view==="profil"&&<ProfView user={pwu.find(u=>u.id===session?.user.id)||profile} onSave={async(id,d)=>{await handleUpdateProfile(id,d);setProfileDirty(false);}} onChangePw={handleChangePw} onDirtyChange={setProfileDirty}/>}
      </main>

      {/* TOOLTIP */}
      {tooltip&&(
        <div style={{position:"fixed",left:Math.min(tooltip.x+14,window.innerWidth-250),top:Math.max(tooltip.y-8,60),background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",zIndex:3000,boxShadow:"0 12px 32px rgba(0,0,0,0.5)",pointerEvents:"none",maxWidth:250}}>
          <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:6}}>{tooltip.date}</div>
          {tooltip.lines.map((l,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}><div style={{width:8,height:8,borderRadius:"50%",background:l.color,flexShrink:0}}/><span style={{fontSize:12,color:"#f1f5f9"}}>{l.text}</span></div>)}
        </div>
      )}

      {/* Dialog: Ungespeicherte Profiländerungen */}
      {pendingView&&(
        <div style={{position:"fixed",inset:0,background:"rgba(45,58,46,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(4px)"}}>
          <div style={{background:"#fff",borderRadius:16,padding:28,width:380,maxWidth:"90vw",border:"1px solid #d5e8a0",boxShadow:"0 20px 60px rgba(61,122,79,0.18)",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>💾</div>
            <div style={{fontSize:17,fontWeight:800,color:"#2d3a2e",marginBottom:8,fontFamily:"'Nunito',sans-serif"}}>Ungespeicherte Änderungen</div>
            <div style={{fontSize:14,color:"#5a6b4a",marginBottom:24,lineHeight:1.6}}>Du hast Änderungen in deinem Profil vorgenommen. Möchtest du diese speichern oder verwerfen?</div>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button style={{...S.savBtn,minWidth:120}} onClick={async()=>{
                // Speichern dann wechseln - ProfView muss save triggern
                // Wir setzen pendingView und schicken ein Custom-Event
                window.dispatchEvent(new CustomEvent("profil-save-and-leave",{detail:{target:pendingView}}));
                setPendingView(null);
              }}>💾 Speichern</button>
              <button style={{background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer",minWidth:120}} onClick={()=>{
                setProfileDirty(false);
                setView(pendingView);
                setPendingView(null);
              }}>🗑 Verwerfen</button>
              <button style={{...S.canBtn,minWidth:120}} onClick={()=>setPendingView(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {modal?.type==="resetPw"&&<ResetPwModal
        user={modal.data.user}
        requestId={modal.data.requestId}
        onDone={async(reqId)=>{if(reqId){try{await dismissResetRequest(reqId);}catch(e){}}setDashRefresh(k=>k+1);notify("✅ Passwort zurückgesetzt! Nachricht kopiert.");}}
        onClose={()=>setModal(null)}
      />}
      {modal?.type==="einstellungen"&&<EinstellungenModal
        saetze={regelSaetze}
        darfGlobal={isAdmin||posInfo(profile?.position).scope==="alle"}
        eigeneGeltung={(()=>{
          const pi=posInfo(profile?.position);
          if(pi.scope==="sparte")return{wert:"sparte:"+pi.sparte,text:(SPARTEN[pi.sparte]||"Sparte")+" (ganze Sparte)"};
          if(pi.scope==="bereich")return{wert:"bereich:"+pi.bereich,text:BEREICH_NAME[pi.bereich]||pi.bereich};
          return{wert:"global",text:"Gesamter Betrieb"};
        })()}
        onSpeichern={async(g,w)=>{await saveEinstellungen(g,w);await ladeEinstellungen();notify("Regeln gespeichert.");}}
        onLoeschen={async g=>{await deleteEinstellung(g);await ladeEinstellungen();notify("Regeln zurückgesetzt.");}}
        onClose={()=>setModal(null)}/>}
      {modal?.type==="uekonto"&&<UeKontoModal user={modal.data} onClose={()=>setModal(null)}/>}
      {modal?.type==="rechte"&&<ZusatzrechteModal user={modal.data}
        onGeaendert={async()=>{await ladeEinstellungen();await loadAll(session.user.id);}}
        onClose={()=>setModal(null)}/>}
      {modal?.type==="positionen"&&<PosVerwaltung profiles={profiles}
        onClose={()=>setModal(null)}
        onGeaendert={async()=>{await ladePositionen();}}/>}
      {modal?.type==="addUser"&&<UserModal title="Neuer Mitarbeiter" isAdmin entwurf={modal.entwurf} onSave={async d=>{await handleCreateUser(d);setModal(null);}} onClose={()=>setModal(null)}/>}
      {modal?.type==="editUser"&&<UserModal title="Mitarbeiter bearbeiten" jahrHinweis={year} entwurf={modal.entwurf}
        initial={{...modal.data,...(istPauschal(modal.data)?{}:{urlaubstage:kontoFuer(modal.data,year).urlaubstage,resturlaub:kontoFuer(modal.data,year).resturlaub})}}
        isAdmin
        belegteFarben={(()=>{
          // Nur Kollegen im selben Fachbereich zählen — bereichsübergreifend
          // dürfen Farben mehrfach vorkommen.
          const eigenerBereich=posInfo(modal.data?.position).bereich;
          return profiles
            .filter(p=>p.id!==modal.data?.id&&p.color
              &&posInfo(p.position).bereich===eigenerBereich)
            .map(p=>({farbe:p.color,name:[p.vorname,p.nachname].filter(Boolean).join(" ")}));
        })()}
        onSave={async d=>{await handleUpdateProfile(modal.data.id,{...d,id:modal.data.id},year);setModal(null);}}
        onClose={()=>setModal(null)} onResetPw={handleAdminResetPw}/>}
      {/* Änderungsantrag für bestätigte Einträge */}
      {modal?.type==="changeRequest"&&(
        <ChangeRequestModal
          entry={modal.data.entry}
          year={year}
          onSave={async(newVon,newBis,grund)=>{
            // Bestehenden Eintrag auf "pending" zurücksetzen mit neuem Zeitraum
            await updateEntry(modal.data.entry.id,{von:newVon,bis:newBis,status:"pending",note:`Änderungsantrag: ${grund||"Neuer Zeitraum gewünscht"}`});
            // Admin benachrichtigen (via pending-count)
            await loadEntries(false,session.user.id);
            setModal(null);
            notify("Änderungsantrag gestellt — wartet auf Genehmigung.");
          }}
          onClose={()=>setModal(null)}
        />
      )}
      {/* Stornierungsantrag */}
      {modal?.type==="deleteRequest"&&(
        <DeleteRequestModal
          entry={modal.data.entry}
          onSave={async(grund)=>{
            // Status auf "pending" + Notiz für Stornierung
            await updateEntry(modal.data.entry.id,{status:"pending",note:`Stornierungsantrag: ${grund||"Stornierung gewünscht"}`});
            await loadEntries(false,session.user.id);
            setModal(null);
            notify("Stornierungsantrag gestellt — wartet auf Genehmigung.");
          }}
          onClose={()=>setModal(null)}
        />
      )}

      {modal?.type==="addEntry"&&<EntryModal title={ohneGenehmigungspflicht(pwu.find(u=>u.id===modal.data.userId))?"Urlaub eintragen":"Urlaubsantrag"} year={year} isAdmin={isAdmin} allEntries={entries} currentUserId={session?.user.id}
        bereichVon={bereichVon} zielBereich={bereichVon(modal.data.userId)} zielUserId={modal.data.userId}
        zielUser={pwu.find(u=>u.id===modal.data.userId)}
        ueErlaubt={ueberstundenErlaubt(regelnFuer(pwu.find(u=>u.id===modal.data.userId)))}
        kontingent={(()=>{
          const u=pwu.find(x=>x.id===modal.data.userId);
          if(!u||istPauschal(u))return null;   // Pauschalkräfte haben kein Kontingent
          const pl=planungFuer(u,year);
          return{urlaubstage:pl.urlaubstage,resturlaub:pl.resturlaub,
                 ueberstunden:Number(u.ueberstunden)||0,stdProTag:stdProTag(u),
                 genutztUrlaub:pl.genutztUrlaub,genutztRest:pl.genutztRest,genutztUeber:pl.genutztUeber};
        })()}
        onSave={async pakete=>{
          for(const d of (Array.isArray(pakete)?pakete:[pakete])){
            await handleCreateEntry({...d,user_id:modal.data.userId});
          }
          setModal(null);
        }} onClose={()=>setModal(null)}/>}
      {modal?.type==="editEntry"&&<EntryModal title="Eintrag bearbeiten" year={year} isAdmin={isAdmin} initial={modal.data.entry} allEntries={entries} currentUserId={modal.data.entry?.user_id} bereichVon={bereichVon} zielBereich={bereichVon(modal.data.entry?.user_id)} zielUserId={modal.data.entry?.user_id} zielUser={pwu.find(u=>u.id===modal.data.entry?.user_id)} onSave={async d=>{await handleUpdateEntry(modal.data.entry.id,Array.isArray(d)?d[0]:d);setModal(null);}} onClose={()=>setModal(null)}/>}

      {/* PRINT */}
      {(printMode==="kalender"||printMode==="kalender_window")&&<PrintKal year={year} entries={calEntries().filter(e=>e.status==="confirmed")} profiles={profiles} state={bundesland} stateName={stateName} useNewWindow={printMode==="kalender_window"} onClose={()=>setPrintMode(null)}/>}
      {printMode==="liste"&&<PrintList year={year} users={meineLeute} stateName={stateName} onClose={()=>setPrintMode(null)}/>}
    </div>
  );
}


// ─── Erzwungener Passwort-Wechsel (Einmalpasswort) ───────────────────────────
function ForceChangePassword({user,onDone}){
  const[pw,setPw]=useState("");
  const[pw2,setPw2]=useState("");
  const[err,setErr]=useState("");
  const[busy,setBusy]=useState(false);
  const[showPw,setShowPw]=useState(false);

  // Passwort-Regeln prüfen
  const checks={
    len:pw.length>=8,
    upper:/[A-Z]/.test(pw),
    lower:/[a-z]/.test(pw),
    digit:/[0-9]/.test(pw),
  };
  const allOk=checks.len&&checks.upper&&checks.lower&&checks.digit;

  async function submit(){
    if(!checks.len){setErr("Das Passwort muss mindestens 8 Zeichen haben.");return;}
    if(!checks.upper){setErr("Das Passwort muss mindestens einen Großbuchstaben enthalten.");return;}
    if(!checks.lower){setErr("Das Passwort muss mindestens einen Kleinbuchstaben enthalten.");return;}
    if(!checks.digit){setErr("Das Passwort muss mindestens eine Zahl enthalten.");return;}
    if(pw!==pw2){setErr("Die Passwörter stimmen nicht überein.");return;}
    setBusy(true);setErr("");
    try{await onDone(pw);}
    catch(e){
      let msg=e.message||"Fehler beim Ändern des Passworts.";
      if(msg.includes("different from the old")){
        msg="Bitte wähle ein anderes Passwort als dein aktuelles Einmalpasswort.";
      }else if(msg.toLowerCase().includes("weak")||msg.includes("at least")){
        msg="Das Passwort ist zu schwach. Bitte erfülle alle Regeln unten.";
      }
      setErr(msg);setBusy(false);
    }
  }

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#e8f5eb 0%,#f0f4f0 50%,#e0efe3 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:16,padding:40,width:440,maxWidth:"90vw",border:"1px solid #d4e6d8",boxShadow:"0 20px 60px rgba(61,122,79,0.15)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:8}}>🔐</div>
          <div style={{fontSize:20,fontWeight:800,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>Neues Passwort festlegen</div>
          <div style={{fontSize:13,color:"#6b8f74",marginTop:8,lineHeight:1.5}}>
            Hallo {user?.vorname}, das Passwort, mit dem du dich gerade angemeldet hast,
            ist der Leitung bekannt — sie hat es für dich vergeben. Bitte lege deshalb jetzt
            ein eigenes fest, das nur du kennst. Danach wirst du nicht wieder danach gefragt.
          </div>
        </div>
        <div style={{marginBottom:14,position:"relative"}}>
          <label style={S.lbl}>Neues Passwort</label>
          <input style={S.inp} type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Mindestens 6 Zeichen" autoFocus/>
          <button onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:10,top:27,background:"none",border:"none",color:"#8aaa5f",cursor:"pointer"}}>{showPw?"🙈":"👁"}</button>
        </div>
        <div style={{marginBottom:14}}>
          <label style={S.lbl}>Passwort bestätigen</label>
          <input style={S.inp} type={showPw?"text":"password"} value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&allOk&&submit()}/>
        </div>
        {/* Passwort-Regeln */}
        <div style={{background:"#f8faf0",border:"1px solid #d5e8a0",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#5a6b4a",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.04em"}}>Passwort-Anforderungen</div>
          {[
            ["len","Mindestens 8 Zeichen"],
            ["upper","Mindestens ein Großbuchstabe (A-Z)"],
            ["lower","Mindestens ein Kleinbuchstabe (a-z)"],
            ["digit","Mindestens eine Zahl (0-9)"],
          ].map(([key,label])=>(
            <div key={key} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,marginBottom:4,color:checks[key]?"#15803d":"#94a3b8"}}>
              <span style={{fontSize:14}}>{checks[key]?"✅":"⬜"}</span>
              <span style={{textDecoration:checks[key]?"none":"none"}}>{label}</span>
            </div>
          ))}
          <div style={{fontSize:11,color:"#8aaa5f",marginTop:6,fontStyle:"italic"}}>Sonderzeichen (!,@,# …) sind erlaubt und erhöhen die Sicherheit.</div>
        </div>
        {err&&<div style={{fontSize:12,color:"#f87171",marginBottom:14,padding:"8px 12px",background:"rgba(248,113,113,0.1)",borderRadius:6}}>{err}</div>}
        <button style={{...S.savBtn,width:"100%",padding:"11px 0",fontSize:14,opacity:(busy||!allOk||pw!==pw2)?0.5:1,cursor:(busy||!allOk||pw!==pw2)?"not-allowed":"pointer"}} onClick={submit} disabled={busy||!allOk||pw!==pw2}>
          {busy?"Wird gespeichert…":"Passwort festlegen & fortfahren"}
        </button>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
// ─── Anmeldesperre nach Fehlversuchen (pro Gerät) ───────────────────────────
const SPERR_KEY="up_login_sperre";
const MAX_VERSUCHE=3, SPERRDAUER=30*60*1000;   // 30 Minuten
function ladeSperre(){
  try{return JSON.parse(localStorage.getItem(SPERR_KEY))||{n:0,bis:0};}
  catch(e){return{n:0,bis:0};}
}
function speichereSperre(v){try{localStorage.setItem(SPERR_KEY,JSON.stringify(v));}catch(e){}}
function loescheSperre(){try{localStorage.removeItem(SPERR_KEY);}catch(e){}}

function LoginScreen({onLogin}){
  // Wurde wegen Tageswechsel abgemeldet? Dann einmalig erklären, warum.
  const [tageswechsel]=useState(()=>{
    try{
      const v=sessionStorage.getItem("up_tageswechsel");
      if(v)sessionStorage.removeItem("up_tageswechsel");
      return !!v;
    }catch(e){return false;}
  });
  // iOS verwirft die Seite beim App-Wechsel. Damit die eingetippte Adresse
  // nicht verloren geht, wird sie zwischengespeichert — das Passwort niemals.
  const [email,setEmail]=useState(()=>{
    try{return localStorage.getItem("up_login_email")||"";}catch(e){return "";}
  });
  useEffect(()=>{
    try{
      if(email.trim())localStorage.setItem("up_login_email",email.trim());
      else localStorage.removeItem("up_login_email");
    }catch(e){}
  },[email]);
  const [pw,setPw]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);
  const [sperre,setSperre]=useState(ladeSperre());
  const [jetzt,setJetzt]=useState(Date.now());
  const gesperrt=sperre.bis>jetzt;
  const restMin=Math.max(1,Math.ceil((sperre.bis-jetzt)/60000));
  useEffect(()=>{const t=setInterval(()=>setJetzt(Date.now()),1000);return()=>clearInterval(t);},[]);
  const [forgotMode,setForgotMode]=useState(false);
  const [forgotEmail,setForgotEmail]=useState("");
  const [forgotSent,setForgotSent]=useState(false);

  async function submit(){
    if(gesperrt){setErr("Zu viele Fehlversuche. Bitte in "+restMin+" Minuten erneut versuchen.");return;}
    if(!email.trim()){setErr("Bitte E-Mail-Adresse eingeben.");return;}
    if(!email.includes("@")){setErr("Das ist keine gültige E-Mail-Adresse.");return;}
    if(!pw){setErr("Bitte Passwort eingeben.");return;}
    setBusy(true);setErr("");
    try{
      await onLogin(email.trim().toLowerCase(),pw);
      loescheSperre();setSperre({n:0,bis:0});
    }catch(e){
      const roh=(e.message||"").toLowerCase();
      let text;
      if(roh.includes("invalid login")||roh.includes("credentials")||roh.includes("invalid_grant"))
        text="E-Mail-Adresse oder Passwort ist falsch.";
      else if(roh.includes("zeitüberschreitung"))
        text="Der Server antwortet nicht. Bitte Internetverbindung prüfen und erneut versuchen.";
      else if(roh.includes("keine sitzung"))
        text="Die Anmeldung konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
      else if(roh.includes("email not confirmed"))
        text="Dieses Konto ist noch nicht freigeschaltet. Bitte an die Praxisleitung wenden.";
      else if(roh.includes("rate limit")||roh.includes("too many"))
        text="Zu viele Anmeldeversuche. Bitte einige Minuten warten.";
      else if(roh.includes("failed to fetch")||roh.includes("zeitüberschreitung")||roh.includes("network"))
        text="Keine Verbindung zum Server. Bitte Internetverbindung prüfen.";
      else text=e.message||"Anmeldung fehlgeschlagen.";

      const n=sperre.n+1;
      if(n>=MAX_VERSUCHE){
        const neu={n:0,bis:Date.now()+SPERRDAUER};
        speichereSperre(neu);setSperre(neu);
        setErr("Dreimal falsch angemeldet. Die Eingabe ist für 30 Minuten gesperrt.");
      }else{
        const neu={n,bis:0};
        speichereSperre(neu);setSperre(neu);
        setErr(text+" Noch "+(MAX_VERSUCHE-n)+" "+((MAX_VERSUCHE-n)===1?"Versuch":"Versuche")+".");
      }
    }finally{setBusy(false);}
  }

  async function sendForgotRequest(){
    if(!forgotEmail){setErr("Bitte E-Mail eingeben.");return;}
    setBusy(true);setErr("");
    try{
      await requestPasswordReset(forgotEmail);
      setForgotSent(true);
    }catch(e){setErr("Anfrage konnte nicht gesendet werden.");}
    finally{setBusy(false);}
  }

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#e8f5eb 0%,#f0f4f0 50%,#e0efe3 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,boxSizing:"border-box"}}>
      <div style={{background:"#ffffff",borderRadius:16,padding:"32px 24px",width:420,maxWidth:"calc(100vw - 32px)",boxSizing:"border-box",border:"1px solid #d5e8a0",boxShadow:"0 20px 60px rgba(61,122,79,0.15)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="TZ Westlausitz" style={{maxWidth:"100%",width:"auto",height:"auto",maxHeight:80,display:"block",margin:"0 auto 8px"}}/>
          <div style={{fontSize:13,color:"#5a6b4a",marginTop:8,fontWeight:600,letterSpacing:"0.02em"}}>Urlaubsplaner</div>
          {tageswechsel&&(
            <div style={{fontSize:12,color:"#92400e",background:"#fff7ed",border:"1px solid #fcd9b0",
              borderRadius:8,padding:"8px 12px",marginTop:12,textAlign:"left"}}>
              Ein neuer Tag hat begonnen — aus Sicherheitsgründen ist eine erneute Anmeldung nötig.
            </div>
          )}
        </div>

        {!forgotMode?(
          <>
            <div style={{marginBottom:14}}><label style={S.lbl}>E-Mail</label><input style={S.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoFocus placeholder="name@tz-westlausitz.de"/></div>
            <div style={{marginBottom:8,position:"relative"}}><label style={S.lbl}>Passwort</label><input style={S.inp} type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/><button onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:10,top:27,background:"none",border:"none",color:"#64748b",cursor:"pointer"}}>{showPw?"🙈":"👁"}</button></div>
            <div style={{textAlign:"right",marginBottom:16}}>
              <button onClick={()=>{setForgotMode(true);setForgotEmail(email);setErr("");}} style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Passwort vergessen?</button>
            </div>
            {err&&(
              <div role="alert" style={{fontSize:13,color:"#b91c1c",marginBottom:14,
                padding:"11px 13px",background:"#fef2f2",borderRadius:8,
                border:"1.5px solid #fca5a5",fontWeight:600,lineHeight:1.45}}>
                ⚠️ {err}
              </div>
            )}
            <button style={{...S.savBtn,width:"100%",padding:"11px 0",fontSize:14,opacity:(busy||gesperrt)?0.5:1,cursor:gesperrt?"not-allowed":"pointer"}} onClick={submit} disabled={busy||gesperrt}>{gesperrt?("Gesperrt – noch "+restMin+" Min."):(busy?"Anmelden…":"Anmelden")}</button>
          </>
        ):(
          <>
            {!forgotSent?(
              <>
                <div style={{fontSize:14,color:"#5a6b4a",marginBottom:16,lineHeight:1.5}}>
                  Gib deine E-Mail-Adresse ein. Der Administrator wird benachrichtigt und setzt dein Passwort zurück.
                </div>
                <div style={{marginBottom:14}}><label style={S.lbl}>E-Mail-Adresse</label><input style={S.inp} type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} autoFocus/></div>
                {err&&<div style={{fontSize:12,color:"#f87171",marginBottom:12,padding:"8px 12px",background:"rgba(248,113,113,0.1)",borderRadius:6}}>{err}</div>}
                <button style={{...S.savBtn,width:"100%",padding:"11px 0",fontSize:14,opacity:busy?0.6:1,marginBottom:10}} onClick={sendForgotRequest} disabled={busy}>{busy?"Senden…":"Anfrage senden"}</button>
                <button onClick={()=>{setForgotMode(false);setErr("");}} style={{width:"100%",background:"none",border:"none",color:"#64748b",fontSize:13,cursor:"pointer",padding:"8px 0"}}>← Zurück zum Login</button>
              </>
            ):(
              <>
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{fontSize:40,marginBottom:12}}>✅</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#2d3a2e",marginBottom:8}}>Anfrage gesendet!</div>
                  <div style={{fontSize:13,color:"#5a6b4a",lineHeight:1.6}}>Der Administrator wurde benachrichtigt und wird dein Passwort in Kürze zurücksetzen.</div>
                </div>
                <button onClick={()=>{setForgotMode(false);setForgotSent(false);setErr("");}} style={{...S.savBtn,width:"100%",padding:"11px 0",fontSize:14,marginTop:16}}>← Zurück zum Login</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Kalender ─────────────────────────────────────────────────────────────────
function KalView({year,entries,profiles,bl,showFerien=true,showFeiertage=true,onTip,offTip}){
  return(<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>{MONTHS.map((_,m)=><MonthCard key={m} year={year} month={m} entries={entries} profiles={profiles} bl={bl} showFerien={showFerien} showFeiertage={showFeiertage} onTip={onTip} offTip={offTip}/>)}</div>);
}
function MonthCard({year,month,entries,profiles,bl,showFerien=true,showFeiertage=true,onTip,offTip}){
  const d=dimM(year,month),f=fwdM(year,month);
  const cells=[];for(let i=0;i<f;i++)cells.push(null);for(let x=1;x<=d;x++)cells.push(x);while(cells.length%7!==0)cells.push(null);
  return(
    <div style={S.mCard}>
      <div style={S.mTitle}>{MONTHS[month]} {year}</div>
      <div style={S.cGrid}>
        {DAYS_SHORT.map(x=><div key={x} style={S.dHd}>{x}</div>)}
        {cells.map((day,i)=>{
          if(!day)return<div key={i}/>;
          const wk=isWE(year,month,day),iso=toISO(year,month,day);
          const feiRaw=isFT(iso,bl,year),ferRaw=isFer(iso,bl,year);
          const fei=showFeiertage?feiRaw:null;
          const fer=showFerien?ferRaw:null;
          const mk=[],pend=[];
          for(const e of entries){
            if(iso>=e.von&&iso<=e.bis){
              const prof=profiles.find(p=>p.id===e.user_id)||e.profiles;
              const color=prof?.color||"#2563EB";
              const name=prof?.vorname||"?";
              if(e.status==="confirmed")mk.push({color,type:e.type,name});
              else if(e.status==="pending")pend.push({color,name});
            }
          }
          let bg="transparent",tc=wk?"#b0c8b5":"#6b8f74";
          if(mk.length===1){bg=ca(mk[0].color,mk[0].type==="ueberstunden"?0.3:0.75);tc="#fff";}
          else if(mk.length>1){bg=`linear-gradient(135deg,${mk.map((m,i)=>`${ca(m.color,0.72)} ${i*100/mk.length}% ${(i+1)*100/mk.length}%`).join(",")})`;tc="#fff";}
          else if(pend.length>0){bg=ca(pend[0].color,0.18);}
          else if(fei&&!fer){bg="#d4b896";tc="#5c3d1a";}
          else if(fer&&!fei){bg="#fce7f3";tc="#9d174d";}
          else if(fei&&fer){bg="linear-gradient(135deg,#fce7f3 50%,#d4b896 50%)";tc="#7c2d4e";}
          function hEnter(ev){
            const lines=[],TL={urlaub:"Urlaub",resturlaub:"Resturlaub",ueberstunden:"Freizeitausgleich"};
            if(fei)lines.push({color:"#c9a07a",text:"🎉 "+fei});
            if(fer)lines.push({color:"#f9a8d4",text:"🌸 "+fer});
            mk.forEach(m=>lines.push({color:m.color,text:`${m.name} · ${TL[m.type]||m.type}`}));
            pend.forEach(m=>lines.push({color:m.color,text:`⏳ ${m.name} (ausstehend)`}));
            if(lines.length)onTip({x:ev.clientX,y:ev.clientY,date:`${wday(iso)}, ${fmtDE(iso)}`,lines});
          }
          return(
            <div key={i} onMouseEnter={hEnter} onMouseLeave={offTip} style={{...S.dCell,color:tc,background:bg,fontSize:10,fontWeight:mk.length>0?600:400,outline:(!mk.length&&fei)?"1px solid #c9a07a":(!mk.length&&fer&&!fei)?"1px solid #f9a8d4":"none",outlineOffset:"-1px",border:pend.length>0&&!mk.length?"1px dashed "+ca(pend[0].color,0.5):"none",cursor:(mk.length||fei||fer||pend.length)?"help":"default"}}>
              {day}
              {mk.length>1&&<div style={{display:"flex",gap:1,justifyContent:"center",marginTop:1}}>{mk.map((m,mi)=><div key={mi} style={{width:3,height:3,borderRadius:"50%",background:m.color}}/>)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Kopfleiste der Druckfenster ─────────────────────────────────────────────
// Safari auf iPad und iPhone führt window.print() beim Laden nicht zuverlässig
// aus. Deshalb steht neben dem Schließen-Knopf immer ein Druck-Knopf bereit.
// Über den Druckdialog lässt sich die Seite auch als PDF sichern.
const DRUCK_KNOEPFE=
  "<style>"
 +".np,.dp{position:fixed;top:10px;z-index:9999;color:#fff;border:none;border-radius:8px;"
 +"padding:8px 18px;font-size:14px;font-weight:700;cursor:pointer;"
 +"box-shadow:0 2px 8px rgba(0,0,0,0.3);font-family:sans-serif;}"
 +".np{right:14px;background:#dc2626;}"
 +".dp{right:152px;background:#5a8a1f;}"
 +"@media print{.np,.dp{display:none!important;}}"
 +"@media(max-width:560px){.dp{right:14px;top:56px;}}"
 +"</style>"
 +"<button class=dp onclick=window.print()>Drucken / PDF</button>"
 +"<button class=np onclick=window.close()>Schliessen</button>";

// ─── PDF-Druck für Urlaubsübersicht ──────────────────────────────────────────
async function printUserPDF(u, year) {
  const yStr = String(year);
  const imJahr = (u.entries || []).filter(e => e.von?.startsWith(yStr) || e.bis?.startsWith(yStr));
  // Freizeitausgleich ist rechtlich kein Urlaub und gehört nicht auf diesen Beleg
  const zeilenDaten = imJahr.filter(e => e.type !== "ueberstunden")
    .sort((a, b) => a.von.localeCompare(b.von));
  const urlT = eDays(imJahr, "urlaub", u), rstT = eDays(imJahr, "resturlaub", u);
  const genommen = urlT + rstT;
  const gesamt = u.urlaubstage || 0;
  const rest = gesamt - genommen;
  const TL = { urlaub: "Urlaub", resturlaub: "Resturlaub", ueberstunden: "Freizeitausgleich" };
  const fde = s => s ? new Date(s).toLocaleDateString("de-DE") : "";
  const heute = new Date().toLocaleDateString("de-DE");
  const pausch = istPauschal(u);

  const summen = pausch
    ? [{ wert: fmtT(genommen), text: "Freie Tage in " + yStr + " eingetragen" }]
    : [
        { wert: fmtT(gesamt), text: "Urlaubstage gesamt" },
        { wert: fmtT(genommen), text: "Genommen" },
        { wert: fmtT(rest), text: "Verbleibend", warnung: rest < 0 },
      ];

  const daten = {
    firma: "Therapie- & Pflegezentrum Westlausitz",
    titel: "Urlaubsübersicht " + yStr,
    mitarbeiter: ((u.vorname || "") + " " + (u.nachname || "")).trim(),
    position: posLabel(u.position, u.geschlecht),
    erstellt: heute,
    hinweis: pausch ? "Pauschalkraft — kein festes Urlaubskontingent" : "",
    summen,
    spalten: ["Typ", "Von", "Bis", "Tage", "Beantragt", "Status"],
    breiten: [105, 82, 82, 45, 82, 94],
    zeilen: zeilenDaten.map(e => [
      TL[e.type] || e.type,
      fde(e.von),
      fde(e.bis),
      fmtT(countWD(e.von, e.bis, u)),
      e.created_at ? new Date(e.created_at).toLocaleDateString("de-DE") : "",
      e.status === "confirmed" ? "Bestätigt" : "Ausstehend",
    ]),
    status: zeilenDaten.map(e => e.status === "confirmed" ? "ok" : "offen"),
  };

  try {
    const blob = urlaubsUebersichtPdf(daten);
    const name = "Urlaub_" + yStr + "_" + (u.nachname || "") + "_" + (u.vorname || "");
    await pdfAusgeben(blob, name.replace(/[^A-Za-z0-9_-]/g, "_") + ".pdf");
  } catch (e) {
    window.alert("Die PDF-Datei konnte nicht erstellt werden: " + (e?.message || e));
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashView({users,isAdmin,viewer,year,onEdit,onResetPwForUser,refreshKey=0}){
  const istEchterAdmin=viewer?.role==="admin";
  const[resetRequests,setResetRequests]=useState([]);
  const[loadingReq,setLoadingReq]=useState(false);

  useEffect(()=>{
    if(!istEchterAdmin)return;
    setLoadingReq(true);
    getPasswordResetRequests().then(d=>setResetRequests(d||[])).catch(()=>{}).finally(()=>setLoadingReq(false));
  },[istEchterAdmin,refreshKey]);

  async function handleDismiss(id){
    await dismissResetRequest(id);
    setResetRequests(p=>p.filter(r=>r.id!==id));
  }
  const TL={urlaub:"Urlaub",resturlaub:"Resturlaub",ueberstunden:"Freizeitausgleich"};
  return(
    <div>
      <h2 style={S.pgT}>Dashboard {year}</h2>

      {/* ── Passwort-Reset-Anfragen (nur Admin) ── */}
      {istEchterAdmin&&resetRequests.length>0&&(
        <div style={{background:"#fff7ed",borderRadius:12,border:"2px solid #f0932b",padding:16,marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:14,color:"#92400e",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>🔔</span>
            Passwort-Reset-Anfragen ({resetRequests.length})
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {resetRequests.map(r=>(
              <div key={r.id} style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"1px solid #fde68a",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:"#92400e"}}>📧 {r.email}</div>
                  <div style={{fontSize:11,color:"#b45309"}}>{new Date(r.requested_at).toLocaleString("de-DE")}</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{
                    const user=users.find(u=>u.email===r.email);
                    if(user)onResetPwForUser({user,requestId:r.id});
                  }} style={{background:"#f0932b",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    🔑 Passwort zurücksetzen
                  </button>
                  <button onClick={()=>handleDismiss(r.id)}
                    style={{background:"#f8faf0",color:"#5a6b4a",border:"1px solid #d5e8a0",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>
                    ✓ Erledigt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {istEchterAdmin&&resetRequests.length===0&&!loadingReq&&(
        <div style={{fontSize:12,color:"#8aaa5f",marginBottom:12}}>✅ Keine offenen Passwort-Reset-Anfragen</div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:16}}>
        {users.map(u=>{
          const yearStr=String(year);
          const entries=(u.entries||[]).filter(e=>e.von?.startsWith(yearStr)||e.bis?.startsWith(yearStr));
          const urlU=eDays(entries,"urlaub",u),rstU=eDays(entries,"resturlaub",u),ueU=eDays(entries,"ueberstunden",u);
          const total=urlU+rstU,rem=(u.urlaubstage||30)-total,ueRem=(u.ueberstunden||0)-ueU;
          const pend=entries.filter(e=>e.status==="pending").length;
          return(
            <div key={u.id} style={{...S.card,borderTop:`4px solid ${u.color||"#3d7a4f"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{...S.av,width:40,height:40,fontSize:16,background:u.color||"#2563EB"}}>{u.vorname?.[0]||"?"}</div>
                  <div><div style={{fontWeight:700,fontSize:15,color:"#2d3a2e"}}>{u.vorname} {u.nachname}</div><div style={{fontSize:11,color:"#5a6b4a",fontWeight:500}}>{posLabel(u.position,u.geschlecht)}</div></div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>printUserPDF(u,year)} style={{...S.icnBtn,background:"#475569",color:"#fff",border:"none"}} title="Urlaub als PDF drucken">🖨</button>
                  {isAdmin&&<button style={S.icnBtn} onClick={()=>onEdit(u)}>✏️</button>}
                </div>
              </div>
              {istPauschal(u)?(
                <div style={{background:"#fff7ed",border:"1px solid #fcd9b0",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#92400e"}}>Pauschalkraft</div>
                  <div style={{fontSize:12,color:"#b45309"}}>{fmtT(total)} freie Tage in {year} eingetragen · kein festes Kontingent</div>
                </div>
              ):(<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
                <StatBox label="Urlaub" val={total} total={u.urlaubstage||30} color={u.color||"#2563EB"}/>
                <StatBox label="Überstunden" val={fmtT(ueU)} total={u.ueberstunden||0} color={lighten(u.color||"#2563EB",0.3)}/>
              </div>
              <div style={{fontSize:11,color:"#5a6b4a",marginBottom:10,lineHeight:1.5}}>
                🏖 <strong>{fmtT(total)} / {u.urlaubstage||30}</strong> Urlaubstage
                {rstU>0&&<> · davon {fmtT(rstU)} Resturlaub</>}
                {ueU>0&&<> &nbsp;|&nbsp; ⏱ zusätzlich <strong>{fmtT(ueU)} T</strong> Freizeitausgleich
                  {stdProTag(u)>0&&<> ({fmtStd(ueU*stdProTag(u))} Std.)</>}</>}
              </div>
              </>)}
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:entries.length>0?10:0}}>
                {!istPauschal(u)&&rstU>0&&<Chip text={`↩ Resturlaub: ${fmtT(rstU)}T`} bg={ca(u.color||"#2563EB",0.12)} col={lighten(u.color||"#2563EB",0.2)}/>}
                {!istPauschal(u)&&<Chip text={rem>=0?`✅ Noch: ${fmtT(rem)}T`:`⚠ Überzogen: ${fmtT(Math.abs(rem))}T`} bg={rem<0?"rgba(248,113,113,0.15)":"rgba(100,116,139,0.12)"} col={rem<0?"#f87171":"#94a3b8"}/>}
                {!istPauschal(u)&&(u.ueberstunden||0)>0&&<Chip text={ueRem>=0?`⏱ ÜS-Rest: ${fmtT(ueRem)}T`:`⏱ ÜS+: ${fmtT(Math.abs(ueRem))}T`} bg="rgba(139,92,246,0.12)" col="#a78bfa"/>}
                {pend>0&&<Chip text={`⏳ ${pend} ausstehend`} bg="rgba(251,191,36,0.12)" col="#fbbf24"/>}
              </div>
              {entries.length>0&&(
                <div style={{maxHeight:160,overflowY:"auto"}}>
                  {[...entries].sort((a,b)=>a.von.localeCompare(b.von)).map(e=>(
                    <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #0f172a"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:u.color||"#2563EB",flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:12,color:"#2d3a2e",fontWeight:500}}>{fmtDE(e.von)} – {fmtDE(e.bis)}</div>
                          <div style={{fontSize:10,color:"#5a6b4a"}}>{TL[e.type]||e.type} · {fmtT(countWD(e.von,e.bis))} T</div>
                        </div>
                      </div>
                      <StBadge status={e.status}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function StatBox({label,val,total,color}){const p=total>0?Math.min(100,Math.round(val/total*100)):0;return(<div style={{background:"#f8faf0",borderRadius:8,padding:"9px 11px",border:"1px solid #edf5ee"}}><div style={{fontSize:10,color:"#5a6b4a",marginBottom:3,fontWeight:600}}>{label}</div><div style={{fontSize:14,fontWeight:700,color:"#2d3a2e"}}>{fmtT(val)}<span style={{color:"#8aaa5f",fontWeight:400,fontSize:12}}> / {total}</span></div><div style={{marginTop:5,height:4,background:"#d4e6d8",borderRadius:2}}><div style={{height:"100%",width:p+"%",background:color,borderRadius:2}}/></div></div>);}
function Chip({text,bg,col}){return<span style={{fontSize:11,background:bg,color:col,borderRadius:20,padding:"3px 9px",whiteSpace:"nowrap",fontWeight:600}}>{text}</span>;}
// ─── Countdown und Fortschritt der Jahresplanung ─────────────────────────────
function FristBanner({planJahr,eigene,offeneLeute=[],istLeitung,onPlanen,tick,darfBereichFiltern,regeln,user}){
  const rest=fristRest(planJahr,regeln,user);
  const anteilSoll=mindestAnteil(regeln);
  const erfuellt=eigene?eigene.anteil>=anteilSoll:true;
  const abgelaufen=!rest;
  const [bereich,setBereich]=useState("alle");
  const gefilterteLeute=offeneLeute.filter(u=>!darfBereichFiltern||passtZuFilter(u,bereich));
  // Nach Fristablauf und bei erfüllter Planung nichts anzeigen, wenn auch im Team alles passt
  if(abgelaufen&&erfuellt&&offeneLeute.length===0)return null;
  const dringend=rest&&rest.tage<=30;
  // Farbe der eigenen Planung — unabhängig vom Stand im Team
  const farbe=erfuellt?"#5a8a1f":(abgelaufen||dringend?"#dc2626":"#f0932b");
  const hg   =erfuellt?"#f7fce8":(abgelaufen||dringend?"#fef2f2":"#fff7ed");
  const prozent=eigene?Math.min(100,Math.round(eigene.anteil*100)):100;
  return(
    <div style={{background:hg,border:"1.5px solid "+farbe,borderRadius:12,padding:"14px 16px",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:eigene?10:0}}>
        <span style={{fontSize:20}}>{erfuellt?"✅":abgelaufen?"⛔":"🗓"}</span>
        <div style={{fontWeight:800,fontSize:15,color:farbe}}>
          Urlaubsplanung {planJahr}
        </div>
        <div style={{marginLeft:"auto",fontSize:13,fontWeight:700,color:farbe,fontVariantNumeric:"tabular-nums"}}>
          {abgelaufen
            ? "Abgabefrist abgelaufen"
            : rest.tage>0
              ? `noch ${rest.tage} ${rest.tage===1?"Tag":"Tage"} · ${rest.stunden} Std.`
              : `noch ${rest.stunden} Std. ${rest.minuten} Min.`}
        </div>
      </div>

      {eigene&&(
        <>
          <div style={{fontSize:13,color:"#5a6b4a",marginBottom:8}}>
            Bis zum <strong>{fristFuer(planJahr,regeln,user).toLocaleDateString("de-DE")}</strong> müssen mindestens {Math.round(anteilSoll*100)} % des
            Jahresurlaubs verplant sein. Du hast <strong>{fmtT(eigene.verplant)}</strong> von {fmtT(eigene.anspruch)} Tagen
            eingetragen ({prozent} %){eigene.anspruch>0&&eigene.anteil<anteilSoll
              ? ` — es fehlen noch ${fmtT(Math.max(0,Math.ceil((eigene.anspruch*anteilSoll-eigene.verplant)*2)/2))} Tage.`
              : "."}
            <div style={{fontSize:12,color:"#5a6b4a",marginTop:3}}>
              Aufteilung: {fmtT(eigene.genutztUrlaub)} Jahresurlaub
              {eigene.genutztRest>0&&<> · {fmtT(eigene.genutztRest)} Resturlaub aus dem Vorjahr</>}
              {eigene.genutztUeber>0&&<> · zusätzlich {fmtT(eigene.genutztUeber)} Tage Freizeitausgleich (zählen nicht zum Urlaubsanspruch)</>}
            </div>
          </div>
          {/* Balken mit Verlauf: rot → orange → gelb → grün, gefüllt bis zum erreichten Anteil */}
          <div style={{height:11,borderRadius:6,marginBottom:10,position:"relative",overflow:"hidden",
            background:"linear-gradient(90deg,#dc2626 0%,#f0932b 40%,#facc15 65%,#7ab529 88%,#4d7c0f 100%)"}}>
            <div style={{position:"absolute",left:prozent+"%",right:0,top:0,bottom:0,
              background:"#e6ebdc",transition:"left .35s ease"}}/>
            <div style={{position:"absolute",left:"calc("+Math.round(anteilSoll*100)+"% - 1px)",top:0,bottom:0,
              width:2,background:"#2d3a2e",opacity:0.55}} title={"Mindestens "+Math.round(anteilSoll*100)+" % müssen verplant sein"}/>
          </div>
          {!erfuellt&&(
            <button onClick={onPlanen} style={{...S.savBtn,background:farbe,padding:"8px 18px",fontSize:13}}>
              Jetzt Urlaub für {planJahr} planen
            </button>
          )}
        </>
      )}

      {istLeitung&&offeneLeute.length>0&&(
        <div style={{marginTop:eigene?12:8,paddingTop:10,borderTop:"1px solid rgba(0,0,0,0.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:"#92400e"}}>
              Noch offen im Team ({gefilterteLeute.length}{bereich!=="alle"?" von "+offeneLeute.length:""}):
            </div>
            {darfBereichFiltern&&(
              <select value={bereich} onChange={e=>setBereich(e.target.value)}
                style={{marginLeft:"auto",background:bereich==="alle"?"#fff":"#fef3c7",
                  border:"1px solid #fcd9b0",borderRadius:12,padding:"3px 9px",
                  fontSize:11,fontWeight:700,color:"#92400e",outline:"none"}}>
                {FILTER_GRUPPEN.map(([gruppe,opts])=>(
                  <optgroup key={gruppe} label={gruppe}>
                    {opts.map(([k,l])=><option key={k} value={k}>{l}</option>)}
                  </optgroup>
                ))}
              </select>
            )}
          </div>
          {gefilterteLeute.length===0?(
            <div style={{fontSize:11,color:"#4a6b0f"}}>✅ In diesem Bereich haben alle ausreichend geplant.</div>
          ):(
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {gefilterteLeute.map(u=>(
                <span key={u.id} style={{fontSize:11,background:"#fff",border:"1px solid #fcd9b0",borderRadius:10,padding:"3px 9px",color:"#92400e",fontWeight:600}}>
                  {u.vorname} {u.nachname}
                  <span style={{opacity:0.7,fontWeight:400}}> · {BEREICH_NAME[posInfo(u.position).bereich]||"Leitung"}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hinweis auf Neuerungen ──────────────────────────────────────────────────
function NeuerungenModal({eintraege,onGelesen,onSpaeter}){
  const [busy,setBusy]=useState(false);
  if(!eintraege||eintraege.length===0)return null;
  return(
    <div style={S.overlay}>
      <div style={{...S.modal,maxWidth:560}}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>
            ✨ Das ist neu
          </span>
        </div>
        <div style={{padding:"16px 20px",maxHeight:"55vh",overflowY:"auto"}}>
          {eintraege.map(e=>(
            <div key={e.version} style={{marginBottom:18}}>
              <div style={{fontWeight:700,fontSize:14,color:"#4a6b0f"}}>{e.titel}</div>
              <div style={{fontSize:11,color:"#8aaa5f",marginBottom:8}}>{e.datum}</div>
              <ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>
                {e.punkte.map((p,i)=>(
                  <li key={i} style={{fontSize:13,color:"#2d3a2e",lineHeight:1.45}}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{...S.mFt,flexWrap:"wrap"}}>
          <button style={{...S.savBtn,opacity:busy?0.6:1}} disabled={busy}
            onClick={async()=>{setBusy(true);try{await onGelesen();}finally{setBusy(false);}}}>
            Verstanden
          </button>
          <button style={S.canBtn} onClick={onSpaeter}>Später lesen</button>
        </div>
        <div style={{padding:"0 20px 14px",fontSize:11,color:"#8aaa5f"}}>
          „Später lesen“ zeigt den Hinweis bei der nächsten Anmeldung erneut.
        </div>
      </div>
    </div>
  );
}

// ─── Rückfrage bei ungespeicherten Änderungen ────────────────────────────────
function SpeichernFrage({onSpeichern,onVerwerfen,onZurueck,busy}){
  return(
    <div style={{...S.overlay,zIndex:1600}}>
      <div style={{...S.modal,maxWidth:400}}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>
            Ungespeicherte Änderungen
          </span>
        </div>
        <div style={{padding:"16px 22px",fontSize:13,color:"#5a6b4a",lineHeight:1.5}}>
          Es gibt Änderungen, die noch nicht gespeichert wurden.
          Möchtest du sie speichern oder verwerfen?
        </div>
        <div style={{...S.mFt,flexWrap:"wrap"}}>
          <button style={{...S.savBtn,opacity:busy?0.6:1}} disabled={busy} onClick={onSpeichern}>
            {busy?"Speichert…":"Speichern"}
          </button>
          <button style={{...S.canBtn,color:"#b91c1c",borderColor:"#fca5a5"}} onClick={onVerwerfen}>
            Verwerfen
          </button>
          <button style={{...S.canBtn,marginLeft:"auto"}} onClick={onZurueck}>
            Zurück
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Positionen verwalten (nur Administratoren) ──────────────────────────────
function PosVerwaltung({onClose,onGeaendert,profiles}){
  const [gewarnt,setGewarnt]=useState(false);   // Warnhinweis bestätigt?
  const [liste,setListe]=useState([]);
  const [laden,setLaden]=useState(true);
  const [fehler,setFehler]=useState("");
  const [bearbeitet,setBearbeitet]=useState(null);   // Position im Formular
  const [busy,setBusy]=useState(false);

  async function neuLaden(){
    setLaden(true);setFehler("");
    try{setListe(await getPositionen());}
    catch(e){setFehler(e.message);}
    finally{setLaden(false);}
  }
  // Erst nach Bestätigung des Warnhinweises laden
  useEffect(()=>{if(gewarnt)neuLaden();},[gewarnt]);

  const leer={key:"",label_m:"",label_w:"",label_d:"",sparte:"therapie",
              bereich:"",bereich_name:"",scope:"selbst",sortierung:900};
  const anzahlMitarbeiter=k=>profiles.filter(p=>p.position===k).length;

  async function speichern(){
    const p=bearbeitet;
    if(!p.key.trim()){setFehler("Bitte ein Kürzel angeben (z. B. hausmeister).");return;}
    if(!/^[a-z0-9_]+$/.test(p.key)){setFehler("Das Kürzel darf nur Kleinbuchstaben, Ziffern und _ enthalten.");return;}
    if(!p.label_m.trim()){setFehler("Bitte eine Bezeichnung angeben.");return;}
    if(p.scope==="bereich"&&!p.bereich.trim()){setFehler("Teamleitungen brauchen einen Bereich.");return;}
    setBusy(true);setFehler("");
    try{
      await savePosition({...p,
        key:p.key.trim(),
        bereich:p.bereich.trim()||null,
        bereich_name:p.bereich_name.trim()||null,
        label_w:p.label_w.trim()||p.label_m.trim(),
        label_d:p.label_d.trim()||p.label_m.trim(),
        sortierung:parseInt(p.sortierung)||900});
      setBearbeitet(null);
      await neuLaden();
      await onGeaendert();
    }catch(e){setFehler(e.message);}
    finally{setBusy(false);}
  }

  async function loeschen(pos){
    const n=anzahlMitarbeiter(pos.key);
    if(n>0){
      window.alert("Diese Position ist noch "+n+" Mitarbeiter"+(n===1?"":"n")+
        " zugewiesen. Bitte diese zuerst auf eine andere Position umstellen.");
      return;
    }
    if(!window.confirm("Position „"+pos.label_m+"“ wirklich löschen?"))return;
    setBusy(true);
    try{await deletePosition(pos.key);await neuLaden();await onGeaendert();}
    catch(e){setFehler(e.message);}
    finally{setBusy(false);}
  }

  const nachSparte=sp=>liste.filter(p=>p.sparte===sp)
    .sort((a,b)=>(a.sortierung||0)-(b.sortierung||0));

  // ── Warnhinweis vor dem Betreten ──────────────────────────────────
  if(!gewarnt)return(
    <div style={S.overlay}>
      <div style={{...S.modal,maxWidth:540}}>
        <div style={{...S.mHd,borderBottom:"1px solid #fcd9b0",background:"#fff7ed"}}>
          <span style={{fontWeight:800,fontSize:16,color:"#92400e",fontFamily:"'Nunito',sans-serif"}}>
            ⚠️ Achtung: Änderungen wirken sofort
          </span>
        </div>
        <div style={{...S.mBd,fontSize:13,color:"#2d3a2e",lineHeight:1.6}}>
          <p style={{marginTop:0}}>
            Die Positionen steuern, <strong>wer wessen Urlaub sehen und genehmigen darf</strong>.
            Änderungen hier greifen unmittelbar für alle Benutzer.
          </p>
          <div style={{background:"#fff7ed",border:"1px solid #fcd9b0",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontWeight:700,color:"#92400e",marginBottom:6,fontSize:13}}>Bitte beachte:</div>
            <ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:6,color:"#b45309",fontSize:12.5}}>
              <li>Wird die <strong>Reichweite</strong> geändert, erhalten oder verlieren Mitarbeiter sofort Zugriff auf fremde Daten.</li>
              <li>Wird das <strong>Bereichskürzel</strong> geändert, passt die Zuordnung zwischen Teamleitung und Mitarbeitern nicht mehr — die Leitung verliert die Zuständigkeit.</li>
              <li>Eine <strong>gelöschte Position</strong> lässt sich nicht wiederherstellen. Positionen mit zugewiesenen Mitarbeitern sind gesperrt.</li>
              <li>Geschäftsleitung, Praxisleitung und Pflegedienstleitung sind fest hinterlegt und können nicht gelöscht werden.</li>
            </ul>
          </div>
          <div style={{fontSize:12,color:"#8aaa5f"}}>
            Alle Änderungen werden mit Datum, Uhrzeit und Benutzername im Änderungsprotokoll festgehalten.
          </div>
        </div>
        <div style={S.mFt}>
          <button style={{...S.savBtn,background:"#f0932b"}} onClick={()=>setGewarnt(true)}>
            Verstanden
          </button>
          <button style={S.canBtn} onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={S.overlay}>
      <div style={{...S.modal,width:700}}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>
            ⚙️ Positionen verwalten
          </span>
          <button style={S.clsBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.mBd}>
          {fehler&&(
            <div style={{fontSize:12,color:"#b91c1c",background:"#fef2f2",border:"1px solid #fca5a5",
              borderRadius:6,padding:"8px 10px",marginBottom:12}}>⚠️ {fehler}</div>
          )}

          {bearbeitet?(
            <div style={{background:"#f8faf0",border:"1.5px solid #7ab529",borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:14,color:"#2d3a2e",marginBottom:10}}>
                {liste.some(x=>x.key===bearbeitet.key)?"Position bearbeiten":"Neue Position"}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div><label style={S.lbl}>Kürzel (technisch)</label>
                  <input style={{...S.inp,...(liste.some(x=>x.key===bearbeitet.key)?{background:"#f1f5f0",color:"#8aaa5f"}:{})}}
                    value={bearbeitet.key} readOnly={liste.some(x=>x.key===bearbeitet.key)}
                    placeholder="z. B. hausmeister"
                    onChange={e=>setBearbeitet(p=>({...p,key:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")}))}/>
                </div>
                <div><label style={S.lbl}>Sparte</label>
                  <select style={S.inp} value={bearbeitet.sparte}
                    onChange={e=>setBearbeitet(p=>({...p,sparte:e.target.value}))}>
                    {Object.entries(SPARTEN).map(([k,l])=><option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                <div><label style={S.lbl}>Bezeichnung (männlich)</label>
                  <input style={S.inp} value={bearbeitet.label_m} placeholder="Hausmeister"
                    onChange={e=>setBearbeitet(p=>({...p,label_m:e.target.value}))}/>
                </div>
                <div><label style={S.lbl}>weiblich</label>
                  <input style={S.inp} value={bearbeitet.label_w} placeholder="Hausmeisterin"
                    onChange={e=>setBearbeitet(p=>({...p,label_w:e.target.value}))}/>
                </div>
                <div><label style={S.lbl}>divers</label>
                  <input style={S.inp} value={bearbeitet.label_d} placeholder="Hausmeister/in"
                    onChange={e=>setBearbeitet(p=>({...p,label_d:e.target.value}))}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                <div><label style={S.lbl}>Reichweite</label>
                  <select style={S.inp} value={bearbeitet.scope}
                    onChange={e=>setBearbeitet(p=>({...p,scope:e.target.value}))}>
                    <option value="selbst">Mitarbeiter (nur sich selbst)</option>
                    <option value="bereich">Teamleitung (eigener Bereich)</option>
                    <option value="sparte">Leitung (ganze Sparte)</option>
                    <option value="alle">Geschäftsleitung (alle)</option>
                  </select>
                </div>
                <div><label style={S.lbl}>Bereich (Kürzel)</label>
                  <input style={S.inp} value={bearbeitet.bereich} placeholder="z. B. hausmeister"
                    onChange={e=>setBearbeitet(p=>({...p,bereich:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")}))}/>
                </div>
                <div><label style={S.lbl}>Reihenfolge</label>
                  <input style={S.inp} type="number" value={bearbeitet.sortierung}
                    onChange={e=>setBearbeitet(p=>({...p,sortierung:e.target.value}))}/>
                </div>
              </div>
              <div style={{fontSize:11,color:"#8aaa5f",marginBottom:10,lineHeight:1.5}}>
                Der <strong>Bereich</strong> verbindet Teamleitung und Mitarbeiter: Beide brauchen dasselbe
                Bereichskürzel, damit die Leitung zuständig ist. Bleibt das Feld leer, ist nur die
                Sparten- bzw. Geschäftsleitung zuständig.
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={{...S.savBtn,opacity:busy?0.6:1}} disabled={busy} onClick={speichern}>
                  {busy?"Speichert…":"Speichern"}
                </button>
                <button style={S.canBtn} onClick={()=>{setBearbeitet(null);setFehler("");}}>Abbrechen</button>
              </div>
            </div>
          ):(
            <button style={{...S.addBtn,marginBottom:14}}
              onClick={()=>{setBearbeitet(leer);setFehler("");}}>+ Neue Position</button>
          )}

          {laden?<div style={{fontSize:13,color:"#8aaa5f"}}>Wird geladen…</div>:
            Object.entries(SPARTEN).map(([sp,lbl])=>(
              <div key={sp} style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:800,color:"#4a6b0f",marginBottom:6,
                  textTransform:"uppercase",letterSpacing:"0.05em"}}>{lbl}</div>
                {nachSparte(sp).length===0?(
                  <div style={{fontSize:12,color:"#8aaa5f"}}>Keine Positionen.</div>
                ):nachSparte(sp).map(pos=>{
                  const anzahl=anzahlMitarbeiter(pos.key);
                  return(
                    <div key={pos.key} style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
                      borderBottom:"1px solid #edf5ee",padding:"7px 0"}}>
                      <span style={{fontSize:13,color:"#2d3a2e",fontWeight:600,flex:"1 1 200px",minWidth:0}}>
                        {pos.label_m}
                        <span style={{fontSize:11,color:"#8aaa5f",fontWeight:400}}>
                          {" · "}{pos.scope==="alle"?"alle":pos.scope==="sparte"?"ganze Sparte":
                            pos.scope==="bereich"?"Bereich "+(pos.bereich||"–"):"nur sich selbst"}
                          {anzahl>0?" · "+anzahl+" MA":""}
                        </span>
                      </span>
                      <button style={S.icnBtn} title="Bearbeiten"
                        onClick={()=>{setBearbeitet({...leer,...pos,
                          bereich:pos.bereich||"",bereich_name:pos.bereich_name||"",
                          label_w:pos.label_w||"",label_d:pos.label_d||""});setFehler("");}}>✏️</button>
                      <button style={{...S.icnBtn,color:anzahl>0?"#cbd5e1":"#f87171"}}
                        title={anzahl>0?"Noch zugewiesen":"Löschen"}
                        onClick={()=>loeschen(pos)}>🗑</button>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>

        <div style={S.mFt}>
          <button style={S.canBtn} onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

// ─── Änderungsprotokoll (nur Administratoren) ────────────────────────────────
const PROT_AKTION={erstellt:["Erstellt","#15803d","#dcfce7"],geaendert:["Geändert","#92400e","#fef3c7"],
  geloescht:["Gelöscht","#991b1b","#fee2e2"],genehmigt:["Genehmigt","#15803d","#dcfce7"],
  abgelehnt:["Abgelehnt","#991b1b","#fee2e2"]};

function ProtokollView(){
  const [zeilen,setZeilen]=useState([]);
  const [laden,setLaden]=useState(true);
  const [fehler,setFehler]=useState("");
  const [suche,setSuche]=useState("");
  const [bereichF,setBereichF]=useState("");
  const [aktionF,setAktionF]=useState("");
  const [sortSpalte,setSortSpalte]=useState("zeitpunkt");
  const [sortAuf,setSortAuf]=useState(false);
  const schmal=useSchmal();

  async function neuLaden(){
    setLaden(true);setFehler("");
    try{setZeilen(await getProtokoll({limit:1000}));}
    catch(e){setFehler(e.message);}
    finally{setLaden(false);}
  }
  useEffect(()=>{neuLaden();},[]);

  const bereiche=[...new Set(zeilen.map(z=>z.bereich).filter(Boolean))].sort();
  const aktionen=[...new Set(zeilen.map(z=>z.aktion).filter(Boolean))].sort();

  const gefiltert=zeilen.filter(z=>{
    if(bereichF&&z.bereich!==bereichF)return false;
    if(aktionF&&z.aktion!==aktionF)return false;
    if(!suche.trim())return true;
    const q=suche.toLowerCase();
    return [z.benutzer_name,z.betrifft,z.beschreibung,z.bereich,z.aktion]
      .some(v=>(v||"").toLowerCase().includes(q));
  }).sort((a,b)=>{
    const richtung=sortAuf?1:-1;
    const wa=a[sortSpalte]??"",wb=b[sortSpalte]??"";
    if(sortSpalte==="zeitpunkt")return richtung*(new Date(wa)-new Date(wb));
    return richtung*String(wa).localeCompare(String(wb),"de");
  });

  function sortiereNach(sp){
    if(sortSpalte===sp)setSortAuf(v=>!v);
    else{setSortSpalte(sp);setSortAuf(sp!=="zeitpunkt");}
  }
  const pfeil=sp=>sortSpalte===sp?(sortAuf?" ▲":" ▼"):"";
  const zeitText=z=>new Date(z).toLocaleString("de-DE",
    {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});

  function exportieren(){
    const kopf="Zeitpunkt;Benutzer;Bereich;Aktion;Betrifft;Beschreibung";
    const csv=[kopf,...gefiltert.map(z=>[zeitText(z.zeitpunkt),z.benutzer_name,z.bereich,
      z.aktion,z.betrifft,(z.beschreibung||"").replace(/[;\n]/g," ")].join(";"))].join("\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;a.download="Aenderungsprotokoll.csv";a.click();
    URL.revokeObjectURL(url);
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={S.pgT}>Änderungsprotokoll</h2>
          <div style={{fontSize:12,color:"#8aaa5f"}}>
            {gefiltert.length} von {zeilen.length} Einträgen · nur für Administratoren sichtbar
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button style={S.canBtn} onClick={neuLaden}>🔄 Aktualisieren</button>
          <button style={S.canBtn} onClick={exportieren}>⬇ CSV</button>
        </div>
      </div>

      {fehler&&(
        <div style={{fontSize:12,color:"#b91c1c",background:"#fef2f2",border:"1px solid #fca5a5",
          borderRadius:6,padding:"8px 10px",marginBottom:12}}>⚠️ {fehler}</div>
      )}

      {/* Suche und Filter */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        <input style={{...S.inp,flex:"1 1 240px",maxWidth:400}} value={suche}
          onChange={e=>setSuche(e.target.value)}
          placeholder="🔍 Suchen nach Name, Beschreibung, Bereich …"/>
        <select style={{...S.inp,width:"auto",minWidth:140}} value={bereichF}
          onChange={e=>setBereichF(e.target.value)}>
          <option value="">Alle Bereiche</option>
          {bereiche.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <select style={{...S.inp,width:"auto",minWidth:130}} value={aktionF}
          onChange={e=>setAktionF(e.target.value)}>
          <option value="">Alle Aktionen</option>
          {aktionen.map(a=><option key={a} value={a}>{(PROT_AKTION[a]||[a])[0]}</option>)}
        </select>
        {(suche||bereichF||aktionF)&&(
          <button style={{background:"none",border:"none",color:"#8aaa5f",fontSize:12,
            cursor:"pointer",textDecoration:"underline"}}
            onClick={()=>{setSuche("");setBereichF("");setAktionF("");}}>zurücksetzen</button>
        )}
      </div>

      {laden?(
        <div style={{fontSize:13,color:"#8aaa5f"}}>Wird geladen…</div>
      ):gefiltert.length===0?(
        <div style={{background:"#fff",border:"1px dashed #d5e8a0",borderRadius:10,
          padding:"18px",fontSize:13,color:"#8aaa5f"}}>
          Keine Einträge gefunden.
        </div>
      ):schmal?(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {gefiltert.map(z=>{
            const[lbl,col,bg]=PROT_AKTION[z.aktion]||[z.aktion,"#5a6b4a","#f0f4f0"];
            return(
              <div key={z.id} style={{background:"#fff",border:"1px solid #d5e8a0",
                borderRadius:10,padding:"10px 12px"}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                  <span style={{fontSize:10,background:bg,color:col,borderRadius:20,
                    padding:"3px 9px",fontWeight:700}}>{lbl}</span>
                  <strong style={{fontSize:13,color:"#2d3a2e"}}>{z.bereich}</strong>
                  <span style={{marginLeft:"auto",fontSize:11,color:"#8aaa5f",fontFamily:"monospace"}}>
                    {zeitText(z.zeitpunkt)}
                  </span>
                </div>
                {z.betrifft&&<div style={{fontSize:13,color:"#2d3a2e",fontWeight:600}}>{z.betrifft}</div>}
                <div style={{fontSize:12,color:"#5a6b4a",marginTop:2}}>{z.beschreibung}</div>
                <div style={{fontSize:11,color:"#8aaa5f",marginTop:4}}>durch {z.benutzer_name||"System"}</div>
              </div>
            );
          })}
        </div>
      ):(
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #d5e8a0",
          overflowX:"auto",boxShadow:"0 1px 4px rgba(61,122,79,0.06)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
            <thead><tr>
              {[["zeitpunkt","Zeitpunkt"],["benutzer_name","Durch"],["bereich","Bereich"],
                ["aktion","Aktion"],["betrifft","Betrifft"],["beschreibung","Beschreibung"]].map(([sp,lbl])=>(
                <th key={sp} style={{...S.th,cursor:"pointer",userSelect:"none"}}
                  onClick={()=>sortiereNach(sp)} title="Zum Sortieren klicken">{lbl}{pfeil(sp)}</th>
              ))}
            </tr></thead>
            <tbody>
              {gefiltert.map(z=>{
                const[lbl,col,bg]=PROT_AKTION[z.aktion]||[z.aktion,"#5a6b4a","#f0f4f0"];
                return(
                  <tr key={z.id} style={{borderBottom:"1px solid #edf5ee"}}>
                    <td style={{...S.td,fontFamily:"monospace",fontSize:12,whiteSpace:"nowrap"}}>
                      {zeitText(z.zeitpunkt)}</td>
                    <td style={{...S.td,fontSize:12}}>{z.benutzer_name||"System"}</td>
                    <td style={{...S.td,fontSize:12}}>{z.bereich}</td>
                    <td style={S.td}>
                      <span style={{fontSize:10,background:bg,color:col,borderRadius:20,
                        padding:"3px 9px",fontWeight:700,whiteSpace:"nowrap"}}>{lbl}</span>
                    </td>
                    <td style={{...S.td,fontSize:12,fontWeight:600}}>{z.betrifft}</td>
                    <td style={{...S.td,fontSize:12,color:"#5a6b4a"}}>{z.beschreibung}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Anleitung / Hilfe ───────────────────────────────────────────────────────
function HilfeAbschnitt({titel,offenStart=false,children}){
  const [offen,setOffen]=useState(offenStart);
  return(
    <div style={{background:"#fff",border:"1px solid #d5e8a0",borderRadius:10,marginBottom:10,overflow:"hidden"}}>
      <button onClick={()=>setOffen(v=>!v)} style={{width:"100%",textAlign:"left",background:offen?"#f7fce8":"#fff",
        border:"none",padding:"13px 15px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,
        fontSize:14,fontWeight:700,color:"#2d3a2e",fontFamily:"inherit"}}>
        <span style={{fontSize:13,color:"#7ab529",transform:offen?"rotate(90deg)":"none",transition:"transform .15s"}}>▶</span>
        {titel}
      </button>
      {offen&&(
        <div style={{padding:"4px 16px 16px",fontSize:13,color:"#2d3a2e",lineHeight:1.65}}>
          {children}
        </div>
      )}
    </div>
  );
}

function HilfeView({user,istLeitung,isAdmin}){
  const P={margin:"0 0 10px"};
  const LI={marginBottom:6};
  const Hinweis=({children,farbe="#4a6b0f",hg="#f7fce8",rand="#d5e8a0"})=>(
    <div style={{background:hg,border:"1px solid "+rand,borderRadius:8,padding:"10px 12px",
      fontSize:12.5,color:farbe,margin:"10px 0"}}>{children}</div>
  );
  return(
    <div style={{maxWidth:860}}>
      <h2 style={S.pgT}>Anleitung</h2>
      <div style={{fontSize:13,color:"#8aaa5f",marginBottom:18}}>
        Alles Wichtige zum Urlaubsplaner. Du kannst diese Seite jederzeit über „❓ Anleitung“ erneut aufrufen.
      </div>

      <HilfeAbschnitt titel="🚀 Erste Schritte" offenStart>
        <p style={P}>
          Willkommen{user?.vorname?", "+user.vorname:""}! Der Urlaubsplaner ist die zentrale Stelle für
          Urlaubsanträge im Therapie- &amp; Pflegezentrum Westlausitz.
        </p>
        <ol style={{paddingLeft:20,margin:"0 0 10px"}}>
          <li style={LI}><strong>Passwort ändern:</strong> Beim ersten Anmelden wirst du aufgefordert,
            ein eigenes Passwort zu vergeben. Das Startpasswort von der Leitung gilt danach nicht mehr.</li>
          <li style={LI}><strong>Profil prüfen:</strong> Sieh unter „👤 Profil“ nach, ob Name, Geburtsdatum
            und Arbeitszeit stimmen.</li>
          <li style={LI}><strong>Urlaub eintragen:</strong> Unter „🏖 Mein Urlaub“ stellst du deine Anträge.</li>
        </ol>
        <Hinweis>
          💡 Tipp: Leg dir den Urlaubsplaner auf den Startbildschirm. Auf dem iPhone oder iPad über
          das Teilen-Symbol → „Zum Home-Bildschirm“, unter Android über das Menü → „App installieren“.
          Dann startet er wie eine normale App.
        </Hinweis>
      </HilfeAbschnitt>

      <HilfeAbschnitt titel="🏖 Urlaub beantragen">
        <p style={P}>Gehe auf „🏖 Mein Urlaub“ und dann auf <strong>+ Urlaub beantragen</strong>.</p>
        <ol style={{paddingLeft:20,margin:"0 0 10px"}}>
          <li style={LI}>Wähle zuerst <strong>Von</strong> und <strong>Bis</strong>. Der Antrag umfasst
            immer den gesamten Zeitraum, auch Wochenenden und Feiertage — diese kosten aber keinen Urlaubstag.</li>
          <li style={LI}>Entscheide, <strong>wovon abgezogen</strong> werden soll: vom Urlaub oder als
            Freizeitausgleich von deinem Überstundenkonto.</li>
          <li style={LI}>Unter „So wird gebucht“ siehst du genau, welche Tage von welchem Konto abgehen.</li>
          <li style={LI}>Mit <strong>Beantragen</strong> geht der Antrag an deine Leitung.</li>
        </ol>
        <p style={P}>
          Der Eintrag steht zunächst auf <strong>⏳ Ausstehend</strong>. Sobald die Leitung entschieden hat,
          wird daraus <strong>✓ Bestätigt</strong> oder <strong>✗ Abgelehnt</strong>. Du bekommst darüber
          eine Benachrichtigung.
        </p>
        <Hinweis>
          ↩ <strong>Resturlaub zuerst:</strong> Hast du Resturlaub aus dem Vorjahr, wird dieser automatisch
          zuerst verbraucht — er verfällt sonst als Erstes. Der Zeitraum wird dafür gegebenenfalls in
          zwei Einträge geteilt. Das ist gewollt und kein Fehler.
        </Hinweis>
      </HilfeAbschnitt>

      <HilfeAbschnitt titel="📅 Wie Urlaubstage gezählt werden">
        <ul style={{paddingLeft:20,margin:"0 0 10px"}}>
          <li style={LI}>Samstage und Sonntage kosten <strong>keinen</strong> Urlaubstag.</li>
          <li style={LI}>Gesetzliche Feiertage kosten <strong>keinen</strong> Urlaubstag.</li>
          <li style={LI}><strong>Heiligabend</strong> und <strong>Silvester</strong> zählen als
            <strong> halber Tag</strong>.</li>
          <li style={LI}>Ein Urlaubstag entspricht deiner täglichen Arbeitszeit — bei 40 Stunden auf
            5 Tage also 8 Stunden.</li>
        </ul>
        <p style={P}>
          Im Antragsfenster steht immer, wie viele Tage der gewählte Zeitraum tatsächlich kostet und
          welche Feiertage darin liegen.
        </p>
      </HilfeAbschnitt>

      <HilfeAbschnitt titel="⏱ Überstunden und Freizeitausgleich">
        <p style={P}>
          Über „⏱ Überstunden melden“ beantragst du eine Änderung deines Kontos: eine
          <strong> positive Zahl</strong> für geleistete Mehrarbeit, eine <strong>negative Zahl</strong>
          für Abbau. Die Leitung prüft und genehmigt.
        </p>
        <p style={P}>
          Genehmigte Überstunden kannst du jederzeit als <strong>Freizeitausgleich</strong> nehmen —
          wähle beim Antrag einfach „⏱ Freizeitausgleich“. Dein Urlaubsanspruch bleibt davon unberührt.
          Rechtlich sind das keine Urlaubstage, sondern Ausgleich für geleistete Mehrarbeit.
        </p>
        <Hinweis>
          Deine gestellten Anträge findest du mit Status unter „🏖 Mein Urlaub“. Solange sie offen sind,
          kannst du sie mit dem 🗑-Symbol zurückziehen.
        </Hinweis>
      </HilfeAbschnitt>

      <HilfeAbschnitt titel="🗓 Abgabefrist für die Jahresplanung">
        <p style={P}>
          Bis zum <strong>30. November</strong> müssen mindestens <strong>90 %</strong> des Urlaubs für
          das kommende Jahr eingetragen sein. Oben auf jeder Seite siehst du einen Countdown und einen
          Fortschrittsbalken.
        </p>
        <p style={P}>
          Der Balken wird grün, sobald du die 90 % erreichst. Die schwarze Linie markiert genau diese Grenze.
        </p>
      </HilfeAbschnitt>

      <HilfeAbschnitt titel="📅 Kalender und Dashboard">
        <p style={P}>
          Der <strong>Kalender</strong> zeigt das ganze Jahr auf einen Blick: dein Urlaub in deiner Farbe,
          Schulferien rosa, Feiertage beige. Über die Schalter oben rechts kannst du Ferien und Feiertage
          ein- und ausblenden.
        </p>
        <p style={P}>
          Das <strong>Dashboard</strong> fasst deine Zahlen zusammen: verbrauchte und verbleibende
          Urlaubstage, Überstundenkonto und alle Einträge des Jahres.
        </p>
        {!istLeitung&&(
          <Hinweis farbe="#5a6b4a" hg="#f8faf0" rand="#d5e8a0">
            🔒 Aus Datenschutzgründen siehst du ausschließlich deinen eigenen Urlaub. Den Urlaub von
            Kolleginnen und Kollegen sieht nur die zuständige Leitung.
          </Hinweis>
        )}
      </HilfeAbschnitt>

      <HilfeAbschnitt titel="👤 Profil und Passwort">
        <p style={P}>
          Unter „👤 Profil“ änderst du deinen Namen, dein Geburtsdatum und dein Passwort.
        </p>
        <p style={P}>
          <strong>Nicht selbst änderbar</strong> sind Urlaubstage, Überstunden, Arbeitszeit, Position
          und deine Kalenderfarbe. Diese Angaben pflegt die Leitung — wende dich bei Fragen an sie.
          Ändert die Leitung etwas, wirst du automatisch benachrichtigt.
        </p>
        <Hinweis>
          🔑 <strong>Passwort vergessen?</strong> Auf der Anmeldeseite auf „Passwort vergessen?“ tippen.
          Die Leitung setzt es dann zurück und teilt dir ein neues Startpasswort mit.
        </Hinweis>
      </HilfeAbschnitt>

      <HilfeAbschnitt titel="🔐 Anmeldung und Sicherheit">
        <ul style={{paddingLeft:20,margin:"0 0 10px"}}>
          <li style={LI}>Aus Sicherheitsgründen ist <strong>jeden Tag eine neue Anmeldung</strong> nötig.
            Am nächsten Morgen erscheint deshalb wieder die Anmeldemaske.</li>
          <li style={LI}>Nach <strong>drei Fehlversuchen</strong> ist die Eingabe für 30 Minuten gesperrt.</li>
          <li style={LI}>Alle Änderungen werden protokolliert.</li>
        </ul>
      </HilfeAbschnitt>

      {istLeitung&&(
        <HilfeAbschnitt titel="🔑 Zusätzliche Funktionen für Leitungen">
          <p style={P}>
            Als Leitung siehst du zusätzlich die Bereiche <strong>Mitarbeiter</strong> und
            <strong> Einträge</strong> — beschränkt auf die Personen, für die du zuständig bist.
          </p>
          <ul style={{paddingLeft:20,margin:"0 0 10px"}}>
            <li style={LI}><strong>Anträge entscheiden:</strong> Unter „📋 Urlaubseinträge“ stehen offene Anträge
              oben. Mit ✓ genehmigen, mit ✗ ablehnen. Die gelbe Zahl in der Kopfzeile zeigt, wie viele
              offen sind.</li>
            <li style={LI}><strong>Überschneidungen:</strong> Die App warnt, wenn im selben Fachbereich
              bereits jemand Urlaub hat. Du kannst trotzdem genehmigen.</li>
            <li style={LI}><strong>Urlaub eintragen:</strong> Über die farbigen Namensknöpfe trägst du
              direkt für einen Mitarbeiter ein — das ist sofort bestätigt.</li>
            <li style={LI}><strong>Stammdaten pflegen:</strong> Urlaubstage, Überstunden und Arbeitszeit
              änderst du im Mitarbeiter-Dialog. Achte oben auf das gewählte <strong>Jahr</strong> —
              Urlaubsansprüche gelten je Kalenderjahr.</li>
            <li style={LI}><strong>Bereichsfilter:</strong> Über die Knöpfe und das Auswahlmenü
              schränkst du Kalender und Einträge auf einen Fachbereich oder eine einzelne Person ein.</li>
          </ul>
          <Hinweis farbe="#92400e" hg="#fff7ed" rand="#fcd9b0">
            Über deinen <strong>eigenen</strong> Antrag kannst du nicht selbst entscheiden — das
            übernimmt die Praxis- oder Geschäftsleitung.
          </Hinweis>
        </HilfeAbschnitt>
      )}

      {isAdmin&&(
        <HilfeAbschnitt titel="⚙️ Zusätzliche Funktionen für Administratoren">
          <ul style={{paddingLeft:20,margin:"0 0 10px"}}>
            <li style={LI}><strong>Mitarbeiter anlegen:</strong> Unter „👥 Mitarbeiter“. Vergib ein
              Startpasswort mit mindestens 8 Zeichen; der Mitarbeiter muss es beim ersten Anmelden ändern.</li>
            <li style={LI}><strong>Positionen verwalten:</strong> Über „⚙️ Positionen“. Vorsicht — die
              Positionen steuern die Zugriffsrechte. Es erscheint vorher ein Warnhinweis.</li>
            <li style={LI}><strong>Protokoll:</strong> Unter „🔍 Protokoll“ siehst du jede Änderung mit
              Zeitpunkt und Benutzername, durchsuchbar, sortierbar und als CSV ausgebbar.</li>
            <li style={LI}><strong>Passwort zurücksetzen:</strong> Im Mitarbeiter-Dialog unter
              „Zugangsdaten“.</li>
          </ul>
        </HilfeAbschnitt>
      )}

      <HilfeAbschnitt titel="❓ Häufige Fragen">
        <p style={{...P,fontWeight:700}}>Warum werden meine Urlaubstage nicht abgezogen?</p>
        <p style={P}>Erst nach der Genehmigung durch die Leitung. Bis dahin steht der Eintrag auf „Ausstehend“.</p>

        <p style={{...P,fontWeight:700}}>Der gewählte Zeitraum zeigt 0 Tage — warum?</p>
        <p style={P}>Dann liegen darin nur Wochenenden und Feiertage. Ein Antrag ist nicht nötig.</p>

        <p style={{...P,fontWeight:700}}>Mein Antrag wurde in zwei Einträge geteilt.</p>
        <p style={P}>Das passiert, wenn Resturlaub und Jahresurlaub kombiniert werden. Zusammen ergibt
          es die richtige Gesamtzahl.</p>

        <p style={{...P,fontWeight:700}}>Ich möchte einen bestätigten Urlaub ändern.</p>
        <p style={P}>Wende dich an deine Leitung — bestätigte Einträge kannst du nicht selbst ändern.</p>

        <p style={{...P,fontWeight:700}}>Die App zeigt „Verbindung wird hergestellt“.</p>
        <p style={P}>Meist nach einem Wechsel zwischen WLAN und Mobilfunk. Die App verbindet sich von
          selbst neu; sonst hilft „Jetzt neu verbinden“.</p>
      </HilfeAbschnitt>

      <div style={{fontSize:12,color:"#8aaa5f",marginTop:16,paddingTop:14,borderTop:"1px solid #d5e8a0"}}>
        Fragen, die hier nicht beantwortet werden? Wende dich an deine Teamleitung oder die Praxisleitung.
      </div>
    </div>
  );
}

// ─── Betriebseinstellungen ───────────────────────────────────────────────────
function EinstellungenModal({saetze,eigeneGeltung,darfGlobal,onSpeichern,onLoeschen,onClose}){
  const MONATE=["Januar","Februar","März","April","Mai","Juni","Juli","August",
                "September","Oktober","November","Dezember"];
  // Welche Geltungsbereiche darf die angemeldete Person bearbeiten?
  const auswahl=darfGlobal
    ?[["global","Gesamter Betrieb"],
      ...Object.entries(SPARTEN).filter(([k])=>k!=="leitung")
        .map(([k,l])=>["sparte:"+k,l+" (ganze Sparte)"]),
      ...POSITIONEN.filter(p=>p.bereich&&p.scope==="selbst")
        .map(p=>["bereich:"+p.bereich,BEREICH_NAME[p.bereich]||p.bereich])
        .filter((v,i,a)=>a.findIndex(x=>x[0]===v[0])===i)]
    :[[eigeneGeltung.wert,eigeneGeltung.text]];

  const [geltung,setGeltung]=useState(auswahl[0][0]);
  const vorhanden=saetze.find(r=>r.geltung===geltung);
  const geerbt=(()=>{
    if(geltung==="global")return null;
    if(geltung.startsWith("bereich:")){
      const b=geltung.slice(8);
      const pos=POSITIONEN.find(p=>p.bereich===b);
      return saetze.find(r=>r.geltung==="sparte:"+pos?.sparte)||saetze.find(r=>r.geltung==="global");
    }
    return saetze.find(r=>r.geltung==="global");
  })();
  const basis=vorhanden||geerbt||{frist_tag:30,frist_monat:11,mindest_prozent:90,ueberstunden_erlaubt:true};

  const [f,setF]=useState({...basis});
  useEffect(()=>{
    const v=saetze.find(r=>r.geltung===geltung);
    const g=(()=>{
      if(geltung==="global")return null;
      if(geltung.startsWith("bereich:")){
        const b=geltung.slice(8);
        const pos=POSITIONEN.find(p=>p.bereich===b);
        return saetze.find(r=>r.geltung==="sparte:"+pos?.sparte)||saetze.find(r=>r.geltung==="global");
      }
      return saetze.find(r=>r.geltung==="global");
    })();
    setF({...(v||g||{frist_tag:30,frist_monat:11,mindest_prozent:90,ueberstunden_erlaubt:true})});
  },[geltung,saetze]);

  const [busy,setBusy]=useState(false);
  const [fehler,setFehler]=useState("");

  async function speichern(){
    setBusy(true);setFehler("");
    try{
      await onSpeichern(geltung,{
        frist_tag:parseInt(f.frist_tag)||30,
        frist_monat:parseInt(f.frist_monat)||11,
        mindest_prozent:Math.max(0,Math.min(100,parseInt(f.mindest_prozent)||0)),
        ueberstunden_erlaubt:!!f.ueberstunden_erlaubt,
      });
      onClose();
    }catch(e){setFehler(e.message);}
    finally{setBusy(false);}
  }
  async function zuruecksetzen(){
    if(!window.confirm("Eigene Regeln für diesen Bereich löschen? Danach gilt wieder die übergeordnete Vorgabe."))return;
    setBusy(true);setFehler("");
    try{await onLoeschen(geltung);onClose();}
    catch(e){setFehler(e.message);}
    finally{setBusy(false);}
  }

  return(
    <div style={S.overlay}>
      <div style={{...S.modal,maxWidth:540}}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>
            ⚙️ Regeln für die Urlaubsplanung
          </span>
          <button style={S.clsBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.mBd}>
          {fehler&&<div style={{fontSize:12,color:"#b91c1c",background:"#fef2f2",
            border:"1px solid #fca5a5",borderRadius:6,padding:"8px 10px",marginBottom:12}}>⚠️ {fehler}</div>}

          <div style={{marginBottom:16}}>
            <label style={S.lbl}>Gilt für</label>
            <select style={S.inp} value={geltung} onChange={e=>setGeltung(e.target.value)}
              disabled={auswahl.length===1}>
              {auswahl.map(([k,l])=><option key={k} value={k}>{l}</option>)}
            </select>
            <div style={{fontSize:11.5,color:vorhanden?"#4a6b0f":"#92400e",marginTop:5,lineHeight:1.5}}>
              {vorhanden
                ? "✓ Für diesen Bereich sind eigene Regeln hinterlegt."
                : "Derzeit gilt hier die übergeordnete Vorgabe. Beim Speichern werden eigene Regeln angelegt."}
            </div>
          </div>

          <div style={{fontSize:12,fontWeight:800,color:"#4a6b0f",marginBottom:8,
            textTransform:"uppercase",letterSpacing:"0.05em"}}>Abgabefrist</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:10,marginBottom:8}}>
            <div><label style={S.lbl}>Tag</label>
              <input style={S.inp} type="number" min="1" max="31" value={f.frist_tag}
                onChange={e=>setF(p=>({...p,frist_tag:e.target.value}))}/>
            </div>
            <div><label style={S.lbl}>Monat</label>
              <select style={S.inp} value={f.frist_monat}
                onChange={e=>setF(p=>({...p,frist_monat:e.target.value}))}>
                {MONATE.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{fontSize:11.5,color:"#8aaa5f",marginBottom:16,lineHeight:1.5}}>
            Bis zu diesem Tag muss der Urlaub für das <strong>Folgejahr</strong> eingetragen sein.
            Aktuell: {parseInt(f.frist_tag)||30}. {MONATE[(parseInt(f.frist_monat)||11)-1]}.
          </div>

          <div style={{fontSize:12,fontWeight:800,color:"#4a6b0f",marginBottom:8,
            textTransform:"uppercase",letterSpacing:"0.05em"}}>Mindestens zu verplanen</div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <input type="range" min="0" max="100" step="5" value={f.mindest_prozent}
              onChange={e=>setF(p=>({...p,mindest_prozent:e.target.value}))}
              style={{flex:1,accentColor:"#7ab529"}}/>
            <div style={{minWidth:64,textAlign:"right",fontSize:17,fontWeight:800,color:"#4a6b0f"}}>
              {f.mindest_prozent} %
            </div>
          </div>
          <div style={{fontSize:11.5,color:"#8aaa5f",marginBottom:16,lineHeight:1.5}}>
            Anteil des Jahresurlaubs, der bis zur Frist eingetragen sein muss.
            Bei 30 Urlaubstagen sind das <strong>{fmtT(Math.ceil(30*(parseInt(f.mindest_prozent)||0)/100*2)/2)} Tage</strong>.
          </div>

          <div style={{fontSize:12,fontWeight:800,color:"#4a6b0f",marginBottom:8,
            textTransform:"uppercase",letterSpacing:"0.05em"}}>Überstunden</div>
          <label style={{display:"flex",alignItems:"flex-start",gap:9,fontSize:13,color:"#2d3a2e",
            background:f.ueberstunden_erlaubt?"#f7fce8":"#f8faf0",
            border:"1.5px solid "+(f.ueberstunden_erlaubt?"#7ab529":"#d5e8a0"),
            borderRadius:8,padding:"11px 13px",cursor:"pointer",fontWeight:600}}>
            <input type="checkbox" checked={!!f.ueberstunden_erlaubt}
              onChange={e=>setF(p=>({...p,ueberstunden_erlaubt:e.target.checked}))}
              style={{width:17,height:17,marginTop:2,flexShrink:0}}/>
            <span>Freizeitausgleich ist erlaubt
              <div style={{fontWeight:400,fontSize:11.5,color:"#5a6b4a",marginTop:3}}>
                Mitarbeiter dürfen Überstunden als freie Tage abbauen. Ohne Haken zählen
                ausschließlich Urlaubstage; bereits eingetragene Tage bleiben bestehen.
              </div>
            </span>
          </label>

          <div style={{fontSize:11.5,color:"#8aaa5f",marginTop:16,paddingTop:12,
            borderTop:"1px solid #edf5ee",lineHeight:1.5}}>
            Bereichsregeln haben Vorrang vor Spartenregeln, diese vor der betrieblichen
            Vorgabe. Einzelne Ausnahmen lassen sich zusätzlich im Mitarbeiter-Dialog festlegen.
          </div>
        </div>
        <div style={{...S.mFt,flexWrap:"wrap"}}>
          <button style={{...S.savBtn,opacity:busy?0.6:1}} disabled={busy} onClick={speichern}>
            {busy?"Speichert…":"Speichern"}
          </button>
          {vorhanden&&geltung!=="global"&&(
            <button style={{...S.canBtn,color:"#b91c1c",borderColor:"#fca5a5"}}
              onClick={zuruecksetzen}>Auf Vorgabe zurücksetzen</button>
          )}
          <button style={{...S.canBtn,marginLeft:"auto"}} onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

// ─── Überstundenkonto eines Mitarbeiters ─────────────────────────────────────
function UeKontoModal({user,onClose}){
  const [zeilen,setZeilen]=useState([]);
  const [laden,setLaden]=useState(true);
  const [fehler,setFehler]=useState("");
  useEffect(()=>{
    (async()=>{
      try{setZeilen(await getUeKonto(user.id));}
      catch(e){setFehler(e.message);}
      finally{setLaden(false);}
    })();
  },[user.id]);
  const std=stdProTag(user);
  const ART={antrag:["Antrag","#15803d","#dcfce7"],urlaub:["Freizeitausgleich","#92400e","#fef3c7"],
             korrektur:["Korrektur","#0369a1","#e0f2fe"]};
  return(
    <div style={S.overlay}>
      <div style={{...S.modal,width:620}}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>
            ⏱ Überstundenkonto · {user.vorname} {user.nachname}
          </span>
          <button style={S.clsBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.mBd}>
          <div style={{background:"#f7fce8",border:"1px solid #d5e8a0",borderRadius:8,
            padding:"11px 13px",marginBottom:14,display:"flex",gap:16,flexWrap:"wrap"}}>
            <div><div style={{fontSize:11,color:"#5a6b4a"}}>Aktueller Stand</div>
              <div style={{fontSize:19,fontWeight:800,color:"#4a6b0f"}}>
                {fmtT(user.ueberstunden||0)} Tage
              </div></div>
            {std>0&&<div><div style={{fontSize:11,color:"#5a6b4a"}}>entspricht</div>
              <div style={{fontSize:19,fontWeight:800,color:"#4a6b0f"}}>
                {fmtStd((user.ueberstunden||0)*std)} Std.
              </div></div>}
            <div><div style={{fontSize:11,color:"#5a6b4a"}}>Bewegungen</div>
              <div style={{fontSize:19,fontWeight:800,color:"#4a6b0f"}}>{zeilen.length}</div></div>
          </div>

          {fehler&&<div style={{fontSize:12,color:"#b91c1c",background:"#fef2f2",
            border:"1px solid #fca5a5",borderRadius:6,padding:"8px 10px"}}>⚠️ {fehler}</div>}

          {laden?<div style={{fontSize:13,color:"#8aaa5f"}}>Wird geladen…</div>
          :zeilen.length===0?(
            <div style={{background:"#fff",border:"1px dashed #d5e8a0",borderRadius:8,
              padding:16,fontSize:13,color:"#8aaa5f"}}>
              Noch keine Bewegungen. Genehmigte Anträge und genommene freie Tage
              erscheinen hier automatisch.
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {zeilen.map(z=>{
                const[lbl,col,bg]=ART[z.art]||[z.art,"#5a6b4a","#f0f4f0"];
                const plus=Number(z.tage)>0;
                return(
                  <div key={z.id} style={{background:"#fff",border:"1px solid #d5e8a0",
                    borderRadius:8,padding:"9px 11px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,background:bg,color:col,borderRadius:20,
                        padding:"3px 9px",fontWeight:700}}>{lbl}</span>
                      <strong style={{fontSize:14,color:plus?"#15803d":"#b45309"}}>
                        {plus?"+":""}{fmtT(z.tage)} T
                        {z.stunden!==null&&z.stunden!==undefined&&
                          <span style={{fontWeight:400,fontSize:12}}> ({plus?"+":""}{fmtStd(z.stunden)} Std.)</span>}
                      </strong>
                      <span style={{marginLeft:"auto",fontSize:12,color:"#5a6b4a"}}>
                        Stand danach: <strong>{fmtT(z.saldo_danach)} T</strong>
                      </span>
                    </div>
                    <div style={{fontSize:12,color:"#5a6b4a",marginTop:3}}>{z.beschreibung}</div>
                    <div style={{fontSize:11,color:"#8aaa5f",marginTop:3}}>
                      {new Date(z.datum).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",
                        year:"numeric",hour:"2-digit",minute:"2-digit"})}
                      {z.erfasst_name?" · durch "+z.erfasst_name:""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={S.mFt}>
          <button style={S.canBtn} onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

// ─── Zusatzberechtigungen eines Mitarbeiters ─────────────────────────────────
function ZusatzrechteModal({user,onClose,onGeaendert}){
  const [liste,setListe]=useState([]);
  const [laden,setLaden]=useState(true);
  const [fehler,setFehler]=useState("");
  const [busy,setBusy]=useState(false);
  const [neu,setNeu]=useState({ziel_typ:"sparte",ziel_wert:"therapie",darf_bearbeiten:false});

  async function neuLaden(){
    setLaden(true);
    try{setListe((await getZusatzrechte()).filter(z=>z.user_id===user.id));}
    catch(e){setFehler(e.message);}
    finally{setLaden(false);}
  }
  useEffect(()=>{neuLaden();},[user.id]);

  const zieleFuerTyp=typ=>{
    if(typ==="sparte")return Object.entries(SPARTEN).map(([k,l])=>[k,l]);
    if(typ==="bereich")return POSITIONEN.filter(p=>p.bereich&&p.scope==="selbst")
      .map(p=>[p.bereich,BEREICH_NAME[p.bereich]||p.bereich])
      .filter((v,i,a)=>a.findIndex(x=>x[0]===v[0])===i);
    return [];
  };
  const text=z=>{
    if(z.ziel_typ==="alle")return "Alle Mitarbeiter";
    if(z.ziel_typ==="leitung")return "Alle Leitungen";
    if(z.ziel_typ==="sparte")return "Sparte "+(SPARTEN[z.ziel_wert]||z.ziel_wert);
    return "Bereich "+(BEREICH_NAME[z.ziel_wert]||z.ziel_wert);
  };

  async function hinzufuegen(){
    setBusy(true);setFehler("");
    try{
      await saveZusatzrecht({user_id:user.id,ziel_typ:neu.ziel_typ,
        ziel_wert:["alle","leitung"].includes(neu.ziel_typ)?null:neu.ziel_wert,
        darf_bearbeiten:!!neu.darf_bearbeiten});
      await neuLaden(); await onGeaendert();
    }catch(e){setFehler(e.message);}
    finally{setBusy(false);}
  }
  async function entfernen(z){
    if(!window.confirm("Berechtigung „"+text(z)+"“ entfernen?"))return;
    setBusy(true);
    try{await deleteZusatzrecht(z.id);await neuLaden();await onGeaendert();}
    catch(e){setFehler(e.message);}
    finally{setBusy(false);}
  }

  return(
    <div style={S.overlay}>
      <div style={{...S.modal,maxWidth:560}}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>
            🔑 Zusatzberechtigungen · {user.vorname} {user.nachname}
          </span>
          <button style={S.clsBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.mBd}>
          <div style={{fontSize:12.5,color:"#5a6b4a",lineHeight:1.55,marginBottom:14}}>
            Zusätzlich zur Position kann diese Person Einblick in weitere Gruppen erhalten —
            etwa die Buchhaltung, die alle Urlaube sehen soll, ohne sie zu ändern.
          </div>

          {fehler&&<div style={{fontSize:12,color:"#b91c1c",background:"#fef2f2",
            border:"1px solid #fca5a5",borderRadius:6,padding:"8px 10px",marginBottom:12}}>⚠️ {fehler}</div>}

          <div style={{background:"#f8faf0",border:"1.5px solid #d5e8a0",borderRadius:10,
            padding:12,marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:13,color:"#2d3a2e",marginBottom:9}}>Neue Berechtigung</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={S.lbl}>Gruppe</label>
                <select style={S.inp} value={neu.ziel_typ}
                  onChange={e=>{const t=e.target.value;
                    setNeu(p=>({...p,ziel_typ:t,ziel_wert:(zieleFuerTyp(t)[0]||[""])[0]}));}}>
                  <option value="alle">Alle Mitarbeiter</option>
                  <option value="leitung">Alle Leitungen</option>
                  <option value="sparte">Eine Sparte</option>
                  <option value="bereich">Ein Fachbereich</option>
                </select>
              </div>
              {!["alle","leitung"].includes(neu.ziel_typ)&&(
                <div><label style={S.lbl}>Auswahl</label>
                  <select style={S.inp} value={neu.ziel_wert}
                    onChange={e=>setNeu(p=>({...p,ziel_wert:e.target.value}))}>
                    {zieleFuerTyp(neu.ziel_typ).map(([k,l])=><option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>
            <label style={{display:"flex",alignItems:"flex-start",gap:9,fontSize:13,color:"#2d3a2e",
              cursor:"pointer",fontWeight:600,marginBottom:10}}>
              <input type="checkbox" checked={!!neu.darf_bearbeiten}
                onChange={e=>setNeu(p=>({...p,darf_bearbeiten:e.target.checked}))}
                style={{width:17,height:17,marginTop:2,flexShrink:0}}/>
              <span>Darf auch bearbeiten
                <div style={{fontWeight:400,fontSize:11.5,color:"#5a6b4a",marginTop:2}}>
                  Ohne Haken nur Leserecht: Urlaube und Stammdaten sind sichtbar,
                  aber nicht änderbar. Anträge kann diese Person dann auch nicht genehmigen.
                </div>
              </span>
            </label>
            <button style={{...S.savBtn,opacity:busy?0.6:1}} disabled={busy}
              onClick={hinzufuegen}>+ Hinzufügen</button>
          </div>

          <div style={{fontSize:12,fontWeight:800,color:"#4a6b0f",marginBottom:8,
            textTransform:"uppercase",letterSpacing:"0.05em"}}>Vergeben</div>
          {laden?<div style={{fontSize:13,color:"#8aaa5f"}}>Wird geladen…</div>
          :liste.length===0?(
            <div style={{fontSize:12.5,color:"#8aaa5f",background:"#fff",
              border:"1px dashed #d5e8a0",borderRadius:8,padding:14}}>
              Keine Zusatzberechtigungen. Es gelten allein die Rechte aus der Position.
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {liste.map(z=>(
                <div key={z.id} style={{background:"#fff",border:"1px solid #d5e8a0",
                  borderRadius:8,padding:"9px 11px",display:"flex",alignItems:"center",
                  gap:9,flexWrap:"wrap"}}>
                  <strong style={{fontSize:13,color:"#2d3a2e"}}>{text(z)}</strong>
                  <span style={{fontSize:10,borderRadius:20,padding:"3px 9px",fontWeight:700,
                    background:z.darf_bearbeiten?"#fef3c7":"#e0f2fe",
                    color:z.darf_bearbeiten?"#92400e":"#0369a1"}}>
                    {z.darf_bearbeiten?"✎ Lesen und bearbeiten":"👁 Nur lesen"}
                  </span>
                  <button style={{...S.icnBtn,color:"#f87171",marginLeft:"auto"}}
                    onClick={()=>entfernen(z)}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={S.mFt}>
          <button style={S.canBtn} onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

function StBadge({status}){const m={confirmed:["✓ Bestätigt","#15803d","#dcfce7"],pending:["⏳ Ausstehend","#92400e","#fef3c7"],rejected:["✗ Abgelehnt","#991b1b","#fee2e2"]};const[t,c,b]=m[status]||["?","#6b8f74","#f0f4f0"];return<span style={{fontSize:10,background:b,color:c,borderRadius:20,padding:"3px 9px",fontWeight:700,whiteSpace:"nowrap",border:`1px solid ${b}`}}>{t}</span>;}

// ─── Mitarbeiter ──────────────────────────────────────────────────────────────
function MitView({users,onAdd,onEdit,onDelete,viewer,canDelete=false,onPositionen,onRegeln,onKonto,onRechte,bearbeitbar=null}){
  const darfEdit=id=>!bearbeitbar||bearbeitbar.includes(id);
  const schmal=useSchmal();
  const zahlen=u=>{
    const e=u.entries||[];
    return{urlT:eDays(e,"urlaub",u)+eDays(e,"resturlaub",u),ueT:eDays(e,"ueberstunden",u),
           pend:e.filter(x=>x.status==="pending").length};
  };
  // Handy: Karten statt Tabelle
  if(schmal)return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:10,flexWrap:"wrap"}}>
        <h2 style={S.pgT}>Mitarbeiter ({users.length})</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {onRegeln&&<button style={S.canBtn} onClick={onRegeln}>⚙️ Regeln</button>}
          {onPositionen&&<button style={S.canBtn} onClick={onPositionen}>⚙️ Positionen</button>}
          {canDelete&&<button style={S.addBtn} onClick={onAdd}>+ Anlegen</button>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {users.map(u=>{
          const{urlT,ueT,pend}=zahlen(u);
          return(
            <div key={u.id} style={{background:"#fff",borderRadius:12,border:"1px solid #d5e8a0",padding:12,boxShadow:"0 2px 8px rgba(61,122,79,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}>
                <div style={{...S.av,width:34,height:34,fontSize:14,background:u.color||"#2563EB",flexShrink:0}}>{u.vorname?.[0]||"?"}</div>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#2d3a2e"}}>{u.vorname} {u.nachname}</div>
                  <div style={{fontSize:12,color:"#5a6b4a"}}>{posLabel(u.position,u.geschlecht)}</div>
                </div>
                <span style={{fontSize:10,background:u.role==="admin"?"#fef3c7":"#e0f2fe",color:u.role==="admin"?"#92400e":"#0369a1",padding:"3px 8px",borderRadius:10,fontWeight:700,whiteSpace:"nowrap"}}>{rolleLabel(u.role)}</span>
              </div>
              <div style={{fontSize:11,color:"#8aaa5f",wordBreak:"break-all",marginBottom:8}}>{u.email}</div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:12,color:"#2d3a2e",marginBottom:10}}>
                {istPauschal(u)?(
                  <span style={{color:"#92400e",fontWeight:600}}>Pauschalkraft · {fmtT(urlT)} freie Tage eingetragen</span>
                ):(<>
                  <span>🏖 Urlaub: <strong>{fmtT(urlT)} / {u.urlaubstage||30}</strong></span>
                  <span>⏱ Überstd.: <strong>{fmtT(ueT)} / {u.ueberstunden||0}</strong></span>
                  <span>🕐 {fmtStd(u.wochenstunden||0)} Std. / {u.arbeitstage_woche||5} Tage</span>
                </>)}
              </div>
              {pend>0&&<div style={{marginBottom:10}}><Chip text={`${pend} offen`} bg="#fef3c7" col="#92400e"/></div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button style={{...S.icnBtn,padding:"7px 14px"}} onClick={()=>onKonto&&onKonto(u)}>⏱ Konto</button>
                {onRechte&&<button style={{...S.icnBtn,padding:"7px 14px"}} onClick={()=>onRechte(u)}>🔑 Rechte</button>}
                {darfEdit(u.id)&&<button style={{...S.icnBtn,padding:"7px 14px"}} onClick={()=>onEdit(u)}>✏️ Bearbeiten</button>}
                {canDelete&&u.id!==viewer?.id&&<button style={{...S.icnBtn,color:"#f87171",padding:"7px 14px"}} onClick={()=>onDelete(u.id)}>🗑 Löschen</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={S.pgT}>Mitarbeiter ({users.length})</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {onRegeln&&<button style={S.canBtn} onClick={onRegeln}>⚙️ Regeln</button>}
          {onPositionen&&<button style={S.canBtn} onClick={onPositionen}>⚙️ Positionen</button>}
          {canDelete&&<button style={S.addBtn} onClick={onAdd}>+ Mitarbeiter anlegen</button>}
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #d5e8a0",overflowX:"auto",WebkitOverflowScrolling:"touch",boxShadow:"0 2px 8px rgba(61,122,79,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
          <thead><tr style={{background:"#f8faf0"}}>{["Name","Position","Berechtigung","Urlaub","Überstunden","Offen",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {users.map(u=>{
              const entries=u.entries||[];
              const urlT=eDays(entries,"urlaub",u)+eDays(entries,"resturlaub",u),ueT=eDays(entries,"ueberstunden",u),pend=entries.filter(e=>e.status==="pending").length;
              return(
                <tr key={u.id} style={{borderBottom:"1px solid #edf5ee"}}>
                  <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{...S.av,width:30,height:30,fontSize:13,background:u.color||"#2563EB"}}>{u.vorname?.[0]||"?"}</div>{u.vorname} {u.nachname}</div></td>
                  <td style={{...S.td,fontSize:12,color:"#5a6b4a"}}>{posLabel(u.position,u.geschlecht)}<div style={{fontSize:11,color:"#8aaa5f"}}>{u.email}</div></td>
                  <td style={S.td}><span style={{fontSize:11,background:u.role==="admin"?"#fef3c7":"#e0f2fe",color:u.role==="admin"?"#92400e":"#0369a1",padding:"2px 8px",borderRadius:10,fontWeight:600}}>{rolleLabel(u.role)}</span></td>
                  <td style={S.td}>{istPauschal(u)?<span style={{fontSize:11,color:"#92400e",background:"#fff7ed",borderRadius:10,padding:"2px 8px",fontWeight:600}}>Pauschal</span>:<>{fmtT(urlT)} / {u.urlaubstage||30} T</>}</td>
                  <td style={S.td}>{istPauschal(u)?"—":<>{fmtT(ueT)} / {u.ueberstunden||0} T</>}</td>
                  <td style={S.td}>{pend>0&&<Chip text={`${pend} offen`} bg="#fef3c7" col="#92400e"/>}</td>
                  <td style={S.td}><div style={{display:"flex",gap:6}}><button style={S.icnBtn} title="Überstundenkonto" onClick={()=>onKonto&&onKonto(u)}>⏱</button>{onRechte&&<button style={S.icnBtn} title="Zusatzberechtigungen" onClick={()=>onRechte(u)}>🔑</button>}{darfEdit(u.id)&&<button style={S.icnBtn} onClick={()=>onEdit(u)}>✏️</button>}{canDelete&&u.id!==viewer?.id&&<button style={{...S.icnBtn,color:"#f87171"}} onClick={()=>onDelete(u.id)}>🗑</button>}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Einträge Admin ───────────────────────────────────────────────────────────
function EintAdmin({entries,profiles,year,onStatus,onDelete,onAdd,onEdit,viewer,darfBereichFiltern,ueAntraege=[],onUeEntscheiden,rechte=[]}){
  const TL={urlaub:"Urlaub",resturlaub:"Resturlaub",ueberstunden:"Freizeitausgleich"};
  const yearStr=String(year);
  const [bereich,setBereich]=useState("alle");
  const [nurPerson,setNurPerson]=useState("");   // Filter auf einen Mitarbeiter
  const schmal=useSchmal();
  // Gehört die Person zum gewählten Fachbereich?
  const passt=uid=>{
    if(nurPerson&&uid!==nurPerson)return false;
    if(!darfBereichFiltern)return true;
    return passtZuFilter(profiles.find(p=>p.id===uid),bereich);
  };
  // Auswahlliste: nur Personen, die zum aktuellen Bereichsfilter passen
  const auswahlPersonen=profiles
    .filter(p=>!darfBereichFiltern||passtZuFilter(p,bereich))
    .sort((a,b)=>(a.nachname||"").localeCompare(b.nachname||""));
  // Passt die gewählte Person nicht mehr zum Bereich, Auswahl aufheben
  useEffect(()=>{
    if(nurPerson&&!auswahlPersonen.some(p=>p.id===nurPerson))setNurPerson("");
  },[bereich,nurPerson,auswahlPersonen.length]);
  const rich=entries
    .filter(e=>(e.von?.startsWith(yearStr)||e.bis?.startsWith(yearStr))&&passt(e.user_id))
    .map(e=>{
      const prof=profiles.find(p=>p.id===e.user_id)||e.profiles||{};
      return{...e,pName:`${prof.vorname||""} ${prof.nachname||""}`.trim(),pColor:prof.color||"#5a8a1f"};
    }).sort((a,b)=>a.von.localeCompare(b.von));
  const pend=rich.filter(e=>e.status==="pending");
  const rest=rich.filter(e=>e.status!=="pending");
  // Kollisionen eines Eintrags mit anderen Personen ermitteln
  function kollisionen(e,alle){
    return alle.filter(o=>o.id!==e.id&&o.user_id!==e.user_id&&o.status==="confirmed"&&e.von<=o.bis&&e.bis>=o.von);
  }
  // Handy: Karten statt Tabelle — nichts wird abgeschnitten
  function EKarten({rows,showAct,allEntries=[],profiles=[]}){
    if(!rows.length)return null;
    return(
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {rows.map(e=>{
          const kol=kollisionen(e,allEntries);
          return(
            <div key={e.id} style={{background:"#fff",borderRadius:10,border:"1px solid #d5e8a0",padding:12,boxShadow:"0 1px 4px rgba(61,122,79,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8,flexWrap:"wrap"}}>
                <div style={{...S.legDot,background:e.pColor}}/>
                <strong style={{fontSize:14,color:"#2d3a2e"}}>{e.pName||"Unbekannt"}</strong>
                <span style={{fontSize:11,background:ca(e.pColor,0.2),color:e.pColor,borderRadius:10,padding:"2px 8px"}}>{TL[e.type]||e.type}</span>
                <div style={{marginLeft:"auto"}}><StBadge status={e.status}/></div>
              </div>
              <div style={{fontSize:13,color:"#2d3a2e",fontFamily:"monospace",marginBottom:4}}>
                {fmtDE(e.von)} – {fmtDE(e.bis)}
                <span style={{fontFamily:"inherit",fontWeight:700,color:"#8aaa5f",marginLeft:8}}>{fmtT(countWD(e.von,e.bis))} Tage</span>
              </div>
              <div style={{fontSize:11,color:"#8aaa5f",marginBottom:6}}>
                Beantragt: {e.created_at?new Date(e.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}
              </div>
              {kol.length===0
                ?<div style={{fontSize:11,color:"#15803d",fontWeight:600,marginBottom:8}}>✅ Keine Kollision</div>
                :<div style={{background:"#fff7ed",border:"1px solid #f0932b",borderRadius:6,padding:"5px 8px",marginBottom:8}}>
                   <div style={{fontSize:11,fontWeight:700,color:"#92400e"}}>⚠ Kollision:</div>
                   {kol.map((o,i)=>{
                     const op=profiles.find(p=>p.id===o.user_id);
                     return <div key={i} style={{fontSize:11,color:"#b45309"}}>• <strong>{op?.vorname||"?"}</strong> {fmtDE(o.von)}–{fmtDE(o.bis)}</div>;
                   })}
                 </div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {showAct&&e.status==="pending"&&(
                  darfEntscheiden(viewer,profiles.find(p=>p.id===e.user_id),rechte)?(<>
                    <button style={{...S.icnBtn,background:"#dcfce7",color:"#15803d",fontSize:14,padding:"6px 14px"}} onClick={()=>onStatus(e.id,"confirmed")}>✓ Bestätigen</button>
                    <button style={{...S.icnBtn,background:"rgba(248,113,113,0.15)",color:"#f87171",fontSize:14,padding:"6px 14px"}} onClick={()=>onStatus(e.id,"rejected")}>✗ Ablehnen</button>
                  </>):<span style={{fontSize:11,color:"#8aaa5f",alignSelf:"center"}}>wartet auf Leitung</span>
                )}
                <button style={{...S.icnBtn,padding:"6px 12px"}} onClick={()=>onEdit(e.user_id,e)}>✏️ Bearbeiten</button>
                <button style={{...S.icnBtn,color:"#f87171",padding:"6px 12px"}} onClick={()=>{
                  const note=window.prompt("Möchtest du dem Mitarbeiter eine Nachricht hinterlassen? (optional)");
                  if(note!==null)onDelete(e.id,note);
                }}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  function ETable({rows,showAct,allEntries=[],profiles=[],TLmap}){
    if(!rows.length)return null;
    if(schmal)return <EKarten rows={rows} showAct={showAct} allEntries={allEntries} profiles={profiles}/>;
    return(
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #d5e8a0",overflowX:"auto",WebkitOverflowScrolling:"touch",boxShadow:"0 1px 4px rgba(61,122,79,0.06)",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
          <thead><tr style={{background:"#f8faf0"}}>{["Mitarbeiter","Typ","Von","Bis","Tage","Beantragt am","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(e=>(
              <tr key={e.id} style={{borderBottom:"1px solid #edf5ee"}}>
                <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{...S.legDot,background:e.pColor}}/>{e.pName||"Unbekannt"}</div></td>
                <td style={S.td}><span style={{fontSize:11,background:ca(e.pColor,0.2),color:e.pColor,borderRadius:10,padding:"2px 8px"}}>{TL[e.type]||e.type}</span></td>
                <td style={{...S.td,fontFamily:"monospace",fontSize:12}}>{fmtDE(e.von)}</td>
                <td style={{...S.td,fontFamily:"monospace",fontSize:12}}>{fmtDE(e.bis)}</td>
                <td style={{...S.td,fontWeight:600,color:"#8aaa5f"}}>{fmtT(countWD(e.von,e.bis))}</td>
                <td style={{...S.td,fontSize:11,color:"#8aaa5f"}}>
                  {e.created_at?new Date(e.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}
                </td>
                <td style={S.td}>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      <StBadge status={e.status}/>
                      {(()=>{
                        // Prüfe Kollision mit anderen bestätigten Einträgen
                        const conflicts=allEntries.filter(o=>
                          o.id!==e.id&&
                          o.user_id!==e.user_id&&
                          o.status==="confirmed"&&
                          e.von<=o.bis&&e.bis>=o.von
                        );
                        if(conflicts.length===0)return(
                          <span style={{fontSize:10,color:"#15803d",fontWeight:600}}>✅ Frei</span>
                        );
                        return(
                          <div style={{background:"#fff7ed",border:"1px solid #f0932b",borderRadius:6,padding:"4px 7px",marginTop:2}}>
                            <div style={{fontSize:10,fontWeight:700,color:"#92400e",marginBottom:2}}>⚠ Kollision:</div>
                            {conflicts.map((o,i)=>{
                              const op=profiles.find(p=>p.id===o.user_id);
                              return(
                                <div key={i} style={{fontSize:10,color:"#b45309",display:"flex",alignItems:"center",gap:3}}>
                                  <div style={{width:6,height:6,borderRadius:"50%",background:op?.color||"#f0932b",flexShrink:0}}/>
                                  <span><strong>{op?.vorname||"?"}</strong> {fmtDE(o.von)}–{fmtDE(o.bis)}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                <td style={S.td}>
                  <div style={{display:"flex",gap:4}}>
                    {showAct&&e.status==="pending"&&<>
                      {darfEntscheiden(viewer,profiles.find(p=>p.id===e.user_id),rechte)?(<>
                      <button style={{...S.icnBtn,background:"#dcfce7",color:"#15803d",fontSize:14}} onClick={()=>onStatus(e.id,"confirmed")} title="Bestätigen">✓</button>
                      <button style={{...S.icnBtn,background:"rgba(248,113,113,0.15)",color:"#f87171",fontSize:14}} onClick={()=>onStatus(e.id,"rejected")} title="Ablehnen">✗</button>
                      </>):(<span style={{fontSize:11,color:"#8aaa5f"}} title="Über den eigenen Antrag entscheidet die Praxis- oder Geschäftsleitung.">wartet auf Leitung</span>)}
                    </>}
                    <button style={S.icnBtn} onClick={()=>onEdit(e.user_id,e)}>✏️</button>
                    <button style={{...S.icnBtn,color:"#f87171"}} onClick={()=>{
                      const note=window.prompt("Möchtest du dem Mitarbeiter eine Nachricht hinterlassen? (optional)");
                      if(note!==null)onDelete(e.id,note);
                    }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
        <h2 style={S.pgT}>Urlaubseinträge {year}</h2>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {profiles.filter(u=>passt(u.id)).map(u=><button key={u.id} style={{...S.addBtn,background:u.color||"#2563EB",fontSize:11,padding:"6px 10px"}} onClick={()=>onAdd(u.id)}>+ {u.vorname}</button>)}
        </div>
      </div>
      {/* Fachbereichs-Filter wie im Kalender */}
      {darfBereichFiltern&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
          {[["alle","👥 Alle"],["sparte:therapie","🩺 Therapie"],["sparte:pflege","🏠 Pflege"]].map(([k,lbl])=>(
            <button key={k} onClick={()=>setBereich(k)} style={{
              background:bereich===k?"#e8f3d6":"none",cursor:"pointer",
              border:"1px solid "+(bereich===k?"#7ab529":"#cbd5e1"),
              borderRadius:14,padding:"4px 11px",transition:"all .15s",
              opacity:bereich===k?1:0.6,fontSize:12,fontWeight:700,
              color:bereich===k?"#4a6b0f":"#94a3b8",whiteSpace:"nowrap",
            }}>{lbl}</button>
          ))}
          <select value={bereich} onChange={e=>setBereich(e.target.value)}
            style={{background:bereich==="alle"?"#f8faf0":"#e8f3d6",
              border:"1.5px solid "+(bereich==="alle"?"#c8d890":"#7ab529"),borderRadius:14,
              padding:"5px 11px",fontSize:12,fontWeight:700,color:"#4a6b0f",outline:"none",
              maxWidth:"100%",cursor:"pointer"}}>
            {FILTER_GRUPPEN.map(([gruppe,opts])=>(
              <optgroup key={gruppe} label={gruppe}>
                {opts.map(([k,lbl])=><option key={k} value={k}>{lbl}</option>)}
              </optgroup>
            ))}
          </select>

          {/* Einzelnen Mitarbeiter herausgreifen */}
          <select value={nurPerson} onChange={e=>setNurPerson(e.target.value)}
            title="Nur einen Mitarbeiter anzeigen"
            style={{background:nurPerson?"#e8f3d6":"#f8faf0",
              border:"1.5px solid "+(nurPerson?"#7ab529":"#c8d890"),borderRadius:14,
              padding:"5px 11px",fontSize:12,fontWeight:700,color:"#4a6b0f",outline:"none",
              maxWidth:"100%",cursor:"pointer"}}>
            <option value="">👤 Alle Mitarbeiter</option>
            {auswahlPersonen.map(p=>(
              <option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>
            ))}
          </select>
          {nurPerson&&(
            <button onClick={()=>setNurPerson("")} title="Auswahl aufheben"
              style={{background:"none",border:"none",color:"#8aaa5f",fontSize:12,
                cursor:"pointer",textDecoration:"underline",padding:"4px 2px"}}>
              zurücksetzen
            </button>
          )}
        </div>
      )}
      {/* Offene Überstundenanträge */}
      {(()=>{
        const offen=(ueAntraege||[]).filter(a=>a.status==="pending"&&passt(a.user_id));
        if(offen.length===0)return null;
        return(
          <div style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,color:"#92400e",marginBottom:8}}>⏱ Überstundenanträge ({offen.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {offen.map(a=>{
                const u=profiles.find(p=>p.id===a.user_id);
                const std=(u?.wochenstunden||0)/(u?.arbeitstage_woche||5);
                const tage=std>0?Math.round((a.stunden/std)*100)/100:null;
                return(
                  <div key={a.id} style={{background:"#fff",border:"1.5px solid #f0932b",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                      <div style={{...S.legDot,background:u?.color||"#f0932b"}}/>
                      <strong style={{fontSize:14,color:"#2d3a2e"}}>{u?.vorname} {u?.nachname}</strong>
                      <span style={{fontSize:14,fontWeight:800,color:a.stunden<0?"#b45309":"#15803d"}}>
                        {a.stunden>0?"+":""}{fmtStd(a.stunden)} Std.
                      </span>
                      {tage!==null&&<span style={{fontSize:12,color:"#5a6b4a"}}>≙ {fmtT(tage)} Tage · Konto {fmtT(u?.ueberstunden||0)} → {fmtT(Math.round(((u?.ueberstunden||0)+tage)*100)/100)}</span>}
                    </div>
                    {a.grund&&<div style={{fontSize:12,color:"#5a6b4a",marginBottom:6}}>„{a.grund}"</div>}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <button style={{...S.icnBtn,background:"#dcfce7",color:"#15803d",padding:"6px 14px",fontWeight:700}}
                        onClick={()=>onUeEntscheiden(a.id,"confirmed",null)}>✓ Genehmigen</button>
                      <button style={{...S.icnBtn,background:"rgba(248,113,113,0.15)",color:"#f87171",padding:"6px 14px",fontWeight:700}}
                        onClick={()=>{const h=window.prompt("Grund für die Ablehnung (optional)");if(h!==null)onUeEntscheiden(a.id,"rejected",h);}}>✗ Ablehnen</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {/* Kontostand je Mitarbeiter im gewählten Jahr */}
      {(()=>{
        const relevant=profiles.filter(p=>passt(p.id)&&!p.pauschal);
        if(relevant.length===0)return null;
        return(
          <div style={{background:"#fff",border:"1px solid #d5e8a0",borderRadius:10,padding:"10px 12px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#2d3a2e",marginBottom:6}}>📊 Stand {year}</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {relevant.map(p=>{
                const eig=entries.filter(e=>e.user_id===p.id&&e.status!=="rejected"
                  &&(e.von?.startsWith(String(year))||e.bis?.startsWith(String(year))));
                const ur=eDays(eig,"urlaub",p),rs=eDays(eig,"resturlaub",p),ue=eDays(eig,"ueberstunden",p);
                const anspruch=Number(p.urlaubstage)||0;
                const offen=Math.round((anspruch-(ur+rs))*2)/2;
                const std=(Number(p.wochenstunden)||0)/(Number(p.arbeitstage_woche)||1);
                return(
                  <div key={p.id} style={{fontSize:12,color:"#5a6b4a",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{...S.legDot,background:p.color}}/>
                    <strong style={{color:"#2d3a2e",minWidth:110}}>{p.vorname} {p.nachname}</strong>
                    <span>🏖 <strong>{fmtT(ur+rs)}/{anspruch}</strong> Urlaubstage</span>
                    {rs>0&&<span style={{color:"#8aaa5f"}}>(davon {fmtT(rs)} Resturlaub)</span>}
                    <span style={{color:offen<0?"#dc2626":"#4a6b0f"}}>
                      {offen>=0?`noch ${fmtT(offen)} offen`:`${fmtT(Math.abs(offen))} zu viel`}
                    </span>
                    {ue>0&&<span style={{color:"#a78bfa"}}>⏱ zusätzlich {fmtT(ue)} T Freizeitausgleich
                      {std>0?` (${fmtStd(ue*std)} Std.)`:""} · Konto {fmtT(p.ueberstunden||0)} T</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {pend.length>0&&<><div style={{fontSize:13,fontWeight:700,color:"#92400e",marginBottom:8}}>⏳ Ausstehend ({pend.length})</div><ETable rows={pend} showAct allEntries={rich} profiles={profiles}/></>}
      {rest.length>0&&<><div style={{fontSize:13,fontWeight:700,color:"#6a9e2f",marginBottom:8}}>📋 Alle ({rest.length})</div><ETable rows={rest} allEntries={rich} profiles={profiles}/></>}
      {rich.length===0&&<div style={{color:"#475569",fontSize:14,padding:24,textAlign:"center"}}>Noch keine Einträge.</div>}
    </div>
  );
}

// ─── Mein Urlaub ─────────────────────────────────────────────────────────────
function MeinUrlaub({user,year,onAdd,onEdit,onDelete,onRequestChange,onRequestDelete,ueAntraege=[],onUeAntrag,onUeZurueck}){
  const TL={urlaub:"Urlaub",resturlaub:"Resturlaub",ueberstunden:"Freizeitausgleich"};
  const yearStr=String(year);
  const allEntries=user?.entries||[];
  // Alle Einträge für Summenberechnung, nur Jahr für Tabelle
  const entries=allEntries.filter(e=>e.von?.startsWith(yearStr)||e.bis?.startsWith(yearStr));
  const urlU=eDays(entries,"urlaub",user),rstU=eDays(entries,"resturlaub",user),ueU=eDays(entries,"ueberstunden",user);
  const[ueFormular,setUeFormular]=useState(false);
  const[ueStunden,setUeStunden]=useState("");
  const[ueGrund,setUeGrund]=useState("");
  const[ueBusy,setUeBusy]=useState(false);
  const[ueFehler,setUeFehler]=useState("");
  const meineUeAntraege=(ueAntraege||[]).filter(a=>a.user_id===user?.id);
  const stdTag=stdProTag(user);
  async function ueAbsenden(){
    const wert=parseFloat(String(ueStunden).replace(",","."));
    if(!wert||isNaN(wert)){setUeFehler("Bitte eine Stundenzahl eingeben, z. B. 4 oder -2.");return;}
    if(Math.abs(wert)>200){setUeFehler("Bitte einen realistischen Wert eingeben.");return;}
    if(!stdTag){setUeFehler("Deine Arbeitszeit ist noch nicht hinterlegt. Bitte an die Leitung wenden.");return;}
    setUeFehler("");setUeBusy(true);
    try{
      await onUeAntrag(wert,ueGrund);
      setUeStunden("");setUeGrund("");setUeFormular(false);
    }finally{setUeBusy(false);}
  }
  const rem=(user?.urlaubstage||30)-(urlU+rstU);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <h2 style={S.pgT}>Mein Urlaub</h2>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>printUserPDF(user,year)} style={{background:"#475569",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            🖨 PDF / Drucken
          </button>
          <button style={{...S.addBtn,background:user?.color||"#5a8a1f"}} onClick={onAdd}>{ohneGenehmigungspflicht(user)?"+ Urlaub eintragen":"+ Urlaub beantragen"}</button>
          {!istPauschal(user)&&<button style={{...S.canBtn,fontWeight:700}} onClick={()=>setUeFormular(v=>!v)}>⏱ Überstunden melden</button>}
        </div>
      </div>
      {istPauschal(user)&&(
        <div style={{background:"#fff7ed",border:"1.5px solid #fcd9b0",borderRadius:10,padding:"12px 14px",marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:14,color:"#92400e",marginBottom:2}}>Pauschalkraft</div>
          <div style={{fontSize:12,color:"#b45309"}}>
            Für dich wird kein festes Urlaubskontingent geführt. Freie Tage kannst du normal eintragen —
            sie werden gezählt, aber nicht gegen einen Anspruch gerechnet. Bislang eingetragen: <strong>{fmtT(urlU+rstU)} Tage</strong> in {year}.
          </div>
        </div>
      )}
      {!istPauschal(user)&&<div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        {[["📅","Urlaubstage",user?.urlaubstage||30,false],["✈️","Genommen",urlU+rstU,false],["✅","Verbleibend",rem,rem<0],...(rstU>0?[["↩","Resturlaub",rstU,false]]:[]),...((user?.ueberstunden||0)>0?[["⏱","Überstunden",`${fmtT(ueU)}/${user.ueberstunden}`,false]]:[]),["⏱️","Std./Tag",fmtStd(stdProTag(user)),false]].map(([ic,lb,vl,warn])=>(
          <div key={lb} style={{background:"#fff",borderRadius:10,padding:"12px 16px",border:`1.5px solid ${warn?"#fca5a5":"#d4e6d8"}`,minWidth:90,boxShadow:"0 1px 4px rgba(61,122,79,0.06)"}}>
            <div style={{fontSize:18,marginBottom:4}}>{ic}</div>
            <div style={{fontSize:20,fontWeight:800,color:warn?"#dc2626":"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>{vl}</div>
            <div style={{fontSize:11,color:"#5a6b4a",fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>}

      {/* Überstunden melden */}
      {ueFormular&&(
        <div style={{background:"#fff",border:"1.5px solid #d5e8a0",borderRadius:12,padding:16,marginBottom:20,boxShadow:"0 2px 8px rgba(61,122,79,0.06)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"#2d3a2e",marginBottom:4}}>⏱ Änderung der Überstunden beantragen</div>
          <div style={{fontSize:12,color:"#5a6b4a",marginBottom:12}}>
            Positive Zahl für geleistete Mehrarbeit, negative Zahl für Abbau. Bei dir entspricht
            ein Urlaubstag <strong>{fmtStd(stdTag)} Stunden</strong>.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:12,marginBottom:12}}>
            <div><label style={S.lbl}>Stunden</label>
              <input style={S.inp} type="text" inputMode="decimal" placeholder="z. B. 4 oder -2"
                value={ueStunden} onChange={e=>setUeStunden(e.target.value.replace(/[^0-9,.\-]/g,""))}/>
            </div>
            <div><label style={S.lbl}>Grund (optional)</label>
              <input style={S.inp} value={ueGrund} onChange={e=>setUeGrund(e.target.value)}
                placeholder="z. B. Samstagsdienst 15.08."/>
            </div>
          </div>
          {ueStunden&&!isNaN(parseFloat(String(ueStunden).replace(",",".")))&&stdTag>0&&(
            <div style={{fontSize:12,color:"#4a6b0f",background:"#f7fce8",border:"1px solid #d5e8a0",borderRadius:6,padding:"7px 10px",marginBottom:12}}>
              Entspricht {fmtT(Math.round((parseFloat(String(ueStunden).replace(",","."))/stdTag)*100)/100)} Urlaubstagen.
            </div>
          )}
          {ueFehler&&<div style={{fontSize:12,color:"#b91c1c",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:6,padding:"7px 10px",marginBottom:12}}>⚠️ {ueFehler}</div>}
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.savBtn,opacity:ueBusy?0.6:1}} onClick={ueAbsenden} disabled={ueBusy}>
              {ueBusy?"Wird gesendet…":"Antrag stellen"}
            </button>
            <button style={S.canBtn} onClick={()=>{setUeFormular(false);setUeFehler("");}}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Eigene Überstundenanträge — immer sichtbar, damit der Stand klar ist */}
      {!istPauschal(user)&&<div style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2d3a2e",marginBottom:8}}>
          ⏱ Meine Überstundenanträge
          {meineUeAntraege.filter(a=>a.status==="pending").length>0&&
            <span style={{marginLeft:8,fontSize:11,background:"#fef3c7",color:"#92400e",borderRadius:10,padding:"2px 8px"}}>
              {meineUeAntraege.filter(a=>a.status==="pending").length} offen
            </span>}
        </div>
        {meineUeAntraege.length===0?(
          <div style={{background:"#fff",border:"1px dashed #d5e8a0",borderRadius:10,padding:"14px 12px",fontSize:12,color:"#8aaa5f"}}>
            Noch keine Überstunden gemeldet. Über „⏱ Überstunden melden" oben kannst du eine Änderung beantragen.
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {meineUeAntraege.map(a=>{
              const tage=stdTag>0?Math.round((a.stunden/stdTag)*100)/100:null;
              const farbe=a.status==="confirmed"?"#7ab529":a.status==="rejected"?"#fca5a5":"#f0932b";
              return(
                <div key={a.id} style={{background:"#fff",border:"1.5px solid "+farbe,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <strong style={{fontSize:15,color:a.stunden<0?"#b45309":"#2d3a2e"}}>
                      {a.stunden>0?"+":""}{fmtStd(a.stunden)} Std.
                    </strong>
                    {tage!==null&&<span style={{fontSize:12,color:"#5a6b4a"}}>≙ {fmtT(tage)} Tage</span>}
                    <span style={{marginLeft:"auto"}}><StBadge status={a.status}/></span>
                    {a.status==="pending"&&(
                      <button style={{...S.icnBtn,color:"#f87171"}} title="Antrag zurückziehen"
                        onClick={()=>{if(window.confirm("Antrag zurückziehen?"))onUeZurueck(a.id);}}>🗑</button>
                    )}
                  </div>
                  {a.grund&&<div style={{fontSize:12,color:"#5a6b4a",marginTop:4}}>„{a.grund}"</div>}
                  <div style={{fontSize:11,color:"#8aaa5f",marginTop:4}}>
                    Eingereicht: {a.created_at?new Date(a.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}
                    {a.status==="pending"&&" · wartet auf die Leitung"}
                    {a.entschieden_am&&" · entschieden am "+new Date(a.entschieden_am).toLocaleDateString("de-DE")}
                  </div>
                  {a.hinweis&&<div style={{fontSize:11,color:"#b45309",marginTop:4}}>Rückmeldung: {a.hinweis}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>}

      <div style={{background:"#fff",borderRadius:12,border:"1px solid #d5e8a0",overflow:"hidden",boxShadow:"0 2px 8px rgba(61,122,79,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8faf0"}}>{["Typ","Von","Bis","Tage","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {entries.length===0&&<tr><td colSpan={6} style={{...S.td,color:"#475569",textAlign:"center",padding:28}}>Noch keine Urlaubsanträge.</td></tr>}
            {[...entries].sort((a,b)=>a.von.localeCompare(b.von)).map(e=>(
              <tr key={e.id} style={{borderBottom:"1px solid #edf5ee"}}>
                <td style={S.td}><span style={{fontSize:11,background:ca(user?.color||"#2563EB",0.2),color:user?.color||"#2563EB",borderRadius:10,padding:"2px 8px"}}>{TL[e.type]||e.type}</span></td>
                <td style={{...S.td,fontFamily:"monospace",fontSize:12}}>{fmtDE(e.von)}</td>
                <td style={{...S.td,fontFamily:"monospace",fontSize:12}}>{fmtDE(e.bis)}</td>
                <td style={{...S.td,fontWeight:600,color:"#8aaa5f"}}>{fmtT(countWD(e.von,e.bis))}</td>
                <td style={{...S.td,fontSize:11,color:"#8aaa5f"}}>
                  {e.created_at?new Date(e.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}
                </td>
                <td style={S.td}>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      <StBadge status={e.status}/>
                      {(()=>{
                        // Prüfe Kollision mit anderen bestätigten Einträgen
                        const conflicts=allEntries.filter(o=>
                          o.id!==e.id&&
                          o.user_id!==e.user_id&&
                          o.status==="confirmed"&&
                          e.von<=o.bis&&e.bis>=o.von
                        );
                        if(conflicts.length===0)return(
                          <span style={{fontSize:10,color:"#15803d",fontWeight:600}}>✅ Frei</span>
                        );
                        return(
                          <div style={{background:"#fff7ed",border:"1px solid #f0932b",borderRadius:6,padding:"4px 7px",marginTop:2}}>
                            <div style={{fontSize:10,fontWeight:700,color:"#92400e",marginBottom:2}}>⚠ Kollision:</div>
                            {conflicts.map((o,i)=>{
                              const op=profiles.find(p=>p.id===o.user_id);
                              return(
                                <div key={i} style={{fontSize:10,color:"#b45309",display:"flex",alignItems:"center",gap:3}}>
                                  <div style={{width:6,height:6,borderRadius:"50%",background:op?.color||"#f0932b",flexShrink:0}}/>
                                  <span><strong>{op?.vorname||"?"}</strong> {fmtDE(o.von)}–{fmtDE(o.bis)}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                <td style={S.td}>
                  {e.status!=="confirmed"?(
                    <div style={{display:"flex",gap:6}}>
                      <button style={S.icnBtn} onClick={()=>onEdit(e)} title="Bearbeiten">✏️</button>
                      <button style={{...S.icnBtn,color:"#f87171"}} onClick={()=>{if(window.confirm("Antrag löschen?"))onDelete(e.id);}} title="Löschen">🗑</button>
                    </div>
                  ):(
                    // Bestätigt: Änderungsantrag oder Stornierung beantragen
                    new Date(e.von)>new Date()?(
                      <div style={{display:"flex",gap:6}}>
                        <button style={{...S.icnBtn,background:"#fff7ed",color:"#92400e",border:"1px solid #f0932b",fontSize:11}} onClick={()=>onRequestChange(e)} title="Änderung beantragen">
                          🔄 Änderung
                        </button>
                        <button style={{...S.icnBtn,background:"#fff1f2",color:"#be123c",border:"1px solid #fca5a5",fontSize:11}} onClick={()=>onRequestDelete(e)} title="Stornierung beantragen">
                          ✕ Storno
                        </button>
                      </div>
                    ):<span style={{fontSize:10,color:"#8aaa5f"}}>Vergangen</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:10,fontSize:11,color:"#8aaa5f"}}>Bestätigte Einträge können nur vom Administrator bearbeitet werden.</div>
    </div>
  );
}

// ─── Ferien & Feiertage ───────────────────────────────────────────────────────
function FerView({year,state,stateName}){
  const[tab,setTab]=useState("ferien");
  const data=getSD(state,year);
  const ferien=data.ferien||[];
  const feiertage=Object.entries(data.feiertage||{}).sort(([a],[b])=>a.localeCompare(b));
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><h2 style={S.pgT}>Ferien & Feiertage {year}</h2><div style={{fontSize:13,color:"#64748b"}}>📍 {stateName}</div>
          {!ferienVorhanden(state,year)&&(
            <div style={{fontSize:12,color:"#92400e",background:"#fff7ed",border:"1px solid #fcd9b0",borderRadius:6,padding:"6px 10px",marginTop:8,maxWidth:520}}>
              Für {year} liegen noch keine Ferientermine vor. Die Feiertage sind berechnet.
              Sobald das Kultusministerium die Ferien veröffentlicht, werden sie beim nächsten Aufruf mit Internetverbindung automatisch geladen.
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:4,background:"#1e293b",borderRadius:8,padding:4}}>
          {[["ferien","🌸 Schulferien"],["feiertage","🎉 Feiertage"],["beides","📅 Alle"]].map(([id,lbl])=>(
            <button key={id} style={{...S.tabTgl,...(tab===id?S.tabTglAct:{})}} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>
      </div>
      {(tab==="ferien"||tab==="beides")&&ferien.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,fontWeight:700,color:"#f472b6",marginBottom:10}}>Schulferien ({ferien.length})</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {ferien.map(([v,b,n],i)=>(
              <div key={i} style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"1px solid #d5e8a0",borderLeft:"4px solid #f9a8d4",boxShadow:"0 1px 4px rgba(61,122,79,0.06)"}}>
                <div style={{fontWeight:700,fontSize:13,color:"#2d3a2e",marginBottom:3}}>{n}</div>
                <div style={{fontSize:12,color:"#5a6b4a"}}>{fmtDE(v)} – {fmtDE(b)}</div>
                <div style={{fontSize:11,color:"#8aaa5f",marginTop:3}}>{fmtT(countWD(v,b))} Werktage</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(tab==="feiertage"||tab==="beides")&&(
        <div>
          <div style={{fontSize:12,fontWeight:700,color:"#c9a07a",marginBottom:10}}>Feiertage ({feiertage.length})</div>
          <div style={{background:"#fff",borderRadius:10,border:"1px solid #d5e8a0",overflow:"hidden",boxShadow:"0 1px 4px rgba(61,122,79,0.06)"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#f8faf0"}}><th style={S.th}>Datum</th><th style={S.th}>Tag</th><th style={S.th}>Feiertag</th></tr></thead>
              <tbody>{feiertage.map(([iso,name])=>(
                <tr key={iso} style={{borderBottom:"1px solid #edf5ee"}}>
                  <td style={{...S.td,fontFamily:"monospace",fontSize:12,color:"#92400e",fontWeight:600}}>{fmtDE(iso)}</td>
                  <td style={{...S.td,fontSize:12,color:isWE(...iso.split("-").map((v,j)=>j===1?parseInt(v)-1:parseInt(v)))?"#f87171":"#64748b"}}>{wday(iso)}</td>
                  <td style={{...S.td,fontWeight:500}}>{name}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profil ───────────────────────────────────────────────────────────────────
function ProfView({user,onSave,onChangePw,onDirtyChange}){
  // Nur Administratoren, Geschäfts- und Praxisleitung sowie Teamleitungen dürfen
  // Urlaubskonto und Überstunden pflegen — im eigenen Profil niemand ohne Leitungsrolle.
  const darfKontoAendern=istLeitung(user);
  // Zahlenfelder als String speichern → kein "0" Prefix Problem
  const[form,setForm]=useState({
    vorname:user?.vorname||"",
    nachname:user?.nachname||"",
    geburtsdatum:user?.geburtsdatum||"",
    position:user?.position||"",
    color:user?.color||"#5a8a1f",
    urlaubstage:String(user?.urlaubstage??30),
    ueberstunden:String(user?.ueberstunden??0),
  });
  const[pwMode,setPwMode]=useState(false);
  const[curPw,setCurPw]=useState("");
  const[npass,setNpass]=useState("");
  const[npass2,setNpass2]=useState("");
  const[pwMsg,setPwMsg]=useState("");
  const[showCur,setShowCur]=useState(false);
  const[showNew,setShowNew]=useState(false);
  const[busy,setBusy]=useState(false);
  const[saved,setSaved]=useState(false); // kurze Bestätigungsanzeige

  // Formularfelder überwachen → dirty melden
  const initialRef = useRef(null);
  useEffect(()=>{
    initialRef.current = {
      vorname:user?.vorname||"",nachname:user?.nachname||"",
      geburtsdatum:user?.geburtsdatum||"",position:user?.position||"",
      color:user?.color||"#5a8a1f",
      urlaubstage:String(user?.urlaubstage??30),
      ueberstunden:String(user?.ueberstunden??0),
    };
  },[user]);

  useEffect(()=>{
    if(!initialRef.current)return;
    const dirty=Object.keys(form).some(k=>form[k]!==initialRef.current[k]);
    onDirtyChange?.(dirty);
  },[form]);

  // Auf "Speichern und wechseln"-Event vom Dialog hören
  useEffect(()=>{
    async function handle(e){
      await doSave();
      // nach save wechselt App automatisch weil dirty=false gesetzt wurde
    }
    window.addEventListener("profil-save-and-leave",handle);
    return()=>window.removeEventListener("profil-save-and-leave",handle);
  },[form]);

  async function doSave(){
    setBusy(true);
    try{
      const daten={...form};
      if(darfKontoAendern){
        daten.urlaubstage=parseInt(form.urlaubstage)||0;
        daten.ueberstunden=parseInt(form.ueberstunden)||0;
      }else{
        // Geschützte Felder gar nicht erst übermitteln
        delete daten.urlaubstage;
        delete daten.ueberstunden;
        delete daten.color;
      }
      await onSave(user.id,daten);
      // Initialwerte aktualisieren
      initialRef.current={...form};
      onDirtyChange?.(false);
      setSaved(true);
      setTimeout(()=>setSaved(false),2500);
    }finally{setBusy(false);}
  }

  async function saveProfile(){ await doSave(); }

  async function changePw(){
    if(!curPw){setPwMsg("Bitte aktuelles Passwort eingeben.");return;}
    if(npass.length<6){setPwMsg("Mindestens 6 Zeichen.");return;}
    if(npass!==npass2){setPwMsg("Passwörter stimmen nicht überein.");return;}
    setBusy(true);
    try{await onChangePw(curPw,npass);setCurPw("");setNpass("");setNpass2("");setPwMode(false);setPwMsg("");}
    catch(e){setPwMsg(e.message);}
    finally{setBusy(false);}
  }

  function updateForm(key,val){
    setForm(f=>({...f,[key]:val}));
  }
  return(
    <div style={{maxWidth:580}}>
      <h2 style={{...S.pgT,marginBottom:20}}>Mein Profil</h2>
      <div style={S.card}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <div style={{...S.av,width:52,height:52,fontSize:20,background:form.color}}>{form.vorname?.[0]||"?"}</div>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>{form.vorname} {form.nachname}</div>
            <div style={{fontSize:12,color:user?.role==="admin"?"#92400e":"#5a6b4a",fontWeight:600}}>{posLabel(user?.position,user?.geschlecht)} · {rolleLabel(user?.role)}</div>
            <div style={{fontSize:12,color:"#8aaa5f"}}>{user?.email}</div>
          </div>
        </div>

        {/* ── Stammdaten ── */}
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
          {/* Zeile 1: Vorname + Nachname */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={S.lbl}>Vorname</label>
              <input style={S.inp} value={form.vorname} onChange={e=>updateForm("vorname",e.target.value)}/>
            </div>
            <div><label style={S.lbl}>Nachname</label>
              <input style={S.inp} value={form.nachname} onChange={e=>updateForm("nachname",e.target.value)}/>
            </div>
          </div>
          {/* Zeile 2: Position */}
          <div><label style={S.lbl}>Position</label>
            <input style={{...S.inp,background:"#f1f5f0",color:"#5a6b4a"}} value={posLabel(user?.position,user?.geschlecht)} readOnly/>
            <div style={{fontSize:11,color:"#8aaa5f",marginTop:4}}>Die Position legt die Berechtigungen fest und wird von der Leitung vergeben.</div>
          </div>
          <div><label style={S.lbl}>Arbeitszeit</label>
            <input style={{...S.inp,background:"#f1f5f0",color:"#5a6b4a"}} readOnly
              value={fmtStd(user?.wochenstunden||0)+" Std./Woche an "+(user?.arbeitstage_woche||5)+" Tagen  ·  "+fmtStd(stdProTag(user))+" Std./Tag"}/>
            <div style={{fontSize:11,color:"#8aaa5f",marginTop:4}}>Änderungen an der Arbeitszeit nimmt die Leitung vor.</div>
          </div>
          {/* Zeile 3: Geburtsdatum alleine - iOS date braucht volle Breite */}
          <div style={{maxWidth:280}}>
            <label style={S.lbl}>Geburtsdatum</label>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input style={{...S.inp,flex:1}} type="date" value={form.geburtsdatum}
                onChange={e=>updateForm("geburtsdatum",e.target.value)}/>
              {alterAus(form.geburtsdatum)!==null&&(
                <span style={{fontSize:13,fontWeight:700,color:"#4a6b0f",background:"#f7fce8",
                  border:"1px solid #d5e8a0",borderRadius:8,padding:"7px 11px",whiteSpace:"nowrap"}}>
                  {tageBisGeburtstag(form.geburtsdatum)===0?"🎂 ":""}{alterAus(form.geburtsdatum)} J.
                </span>
              )}
            </div>
            {tageBisGeburtstag(form.geburtsdatum)===0&&(
              <div style={{fontSize:11,color:"#4a6b0f",marginTop:4,fontWeight:600}}>🎉 Alles Gute zum Geburtstag!</div>
            )}
          </div>
          {/* Zeile 3: Urlaubstage + Überstunden — nur von der Leitung änderbar */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={S.lbl}>Urlaubstage / Jahr</label>
              <input style={darfKontoAendern?S.inp:{...S.inp,background:"#f1f5f0",color:"#5a6b4a"}}
                type="text" inputMode="numeric" pattern="[0-9]*"
                readOnly={!darfKontoAendern}
                value={form.urlaubstage}
                onChange={e=>darfKontoAendern&&updateForm("urlaubstage",e.target.value.replace(/[^0-9]/g,""))}
                onFocus={e=>darfKontoAendern&&e.target.select()}/>
            </div>
            <div><label style={S.lbl}>Überstunden (Tage)</label>
              <input style={darfKontoAendern?S.inp:{...S.inp,background:"#f1f5f0",color:"#5a6b4a"}}
                type="text" inputMode="numeric" pattern="[0-9]*"
                readOnly={!darfKontoAendern}
                value={form.ueberstunden}
                onChange={e=>darfKontoAendern&&updateForm("ueberstunden",e.target.value.replace(/[^0-9]/g,""))}
                onFocus={e=>darfKontoAendern&&e.target.select()}/>
            </div>
          </div>
          {!darfKontoAendern&&(
            <div style={{fontSize:11,color:"#8aaa5f",marginTop:-4}}>
              🔒 Urlaubstage und Überstunden werden von der Leitung gepflegt. Bei Rückfragen bitte an die zuständige Leitung wenden.
            </div>
          )}
        </div>

        <div style={{marginBottom:16}}><label style={S.lbl}>Farbe</label>
          {!darfKontoAendern?(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:8,background:form.color,
                boxShadow:"0 1px 3px rgba(0,0,0,0.2)",flexShrink:0}}/>
              <span style={{fontSize:12,color:"#8aaa5f"}}>
                🔒 Deine Kalenderfarbe wird von der Leitung vergeben.
              </span>
            </div>
          ):(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {PRESET_COLORS.map(c=>(
              <div key={c} onClick={()=>updateForm("color",c)}
                style={{width:32,height:32,borderRadius:6,background:c,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  boxShadow:form.color===c?"0 0 0 3px #2d3a2e, 0 0 0 5px "+c:"0 1px 3px rgba(0,0,0,0.2)",
                  transform:form.color===c?"scale(1.15)":"scale(1)",transition:"all .15s"}}>
                {form.color===c&&<span style={{color:"#fff",fontSize:16,fontWeight:900,textShadow:"0 1px 2px rgba(0,0,0,0.5)"}}>✓</span>}
              </div>
            ))}
            <div style={{position:"relative",width:32,height:32}}>
              <input type="color" value={form.color} onChange={e=>updateForm("color",e.target.value)}
                style={{width:32,height:32,border:"2px solid #d5e8a0",borderRadius:6,cursor:"pointer",padding:2}}/>
            </div>
          </div>
          )}
        </div>
        {saved&&<div style={{padding:"8px 14px",background:"#dcfce7",color:"#15803d",borderRadius:8,fontSize:13,fontWeight:600,marginBottom:8,border:"1px solid #86efac"}}>✅ Profil erfolgreich gespeichert!</div>}
        <button style={{...S.savBtn,opacity:busy?0.6:1}} onClick={saveProfile} disabled={busy}>{busy?"Speichern…":"Profil speichern"}</button>
        <div style={{marginTop:24,borderTop:"1px solid #edf5d8",paddingTop:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:pwMode?14:0}}>
            <div style={{fontSize:14,fontWeight:700,color:"#2d3a2e"}}>🔐 Passwort</div>
            <button style={S.canBtn} onClick={()=>{setPwMode(v=>!v);setPwMsg("");}}>{pwMode?"Abbrechen":"Passwort ändern"}</button>
          </div>
          {pwMode&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{position:"relative"}}><label style={S.lbl}>Aktuelles Passwort</label><input style={S.inp} type={showCur?"text":"password"} value={curPw} onChange={e=>setCurPw(e.target.value)}/><button onClick={()=>setShowCur(v=>!v)} style={{position:"absolute",right:10,top:27,background:"none",border:"none",color:"#64748b",cursor:"pointer"}}>{showCur?"🙈":"👁"}</button></div>
              <div style={{position:"relative"}}><label style={S.lbl}>Neues Passwort</label><input style={S.inp} type={showNew?"text":"password"} value={npass} onChange={e=>setNpass(e.target.value)}/><button onClick={()=>setShowNew(v=>!v)} style={{position:"absolute",right:10,top:27,background:"none",border:"none",color:"#64748b",cursor:"pointer"}}>{showNew?"🙈":"👁"}</button></div>
              <div><label style={S.lbl}>Neues Passwort bestätigen</label><input style={S.inp} type="password" value={npass2} onChange={e=>setNpass2(e.target.value)}/></div>
              <div style={{background:"#f8faf0",border:"1px solid #d5e8a0",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#5a6b4a",marginBottom:6,textTransform:"uppercase"}}>Passwort-Anforderungen</div>
                {[
                  ["Mindestens 8 Zeichen",npass.length>=8],
                  ["Ein Großbuchstabe (A-Z)",/[A-Z]/.test(npass)],
                  ["Ein Kleinbuchstabe (a-z)",/[a-z]/.test(npass)],
                  ["Eine Zahl (0-9)",/[0-9]/.test(npass)],
                ].map(([label,ok],i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:7,fontSize:11.5,marginBottom:3,color:ok?"#15803d":"#94a3b8"}}>
                    <span>{ok?"✅":"⬜"}</span><span>{label}</span>
                  </div>
                ))}
              </div>
              {pwMsg&&<div style={{fontSize:12,color:"#f87171",background:"rgba(248,113,113,0.1)",padding:"8px 12px",borderRadius:6}}>{pwMsg}</div>}
              <button style={{...S.savBtn,opacity:busy?0.6:1}} onClick={changePw} disabled={busy}>Passwort ändern</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Login-Daten Kopier-Button ────────────────────────────────────────────────
function CopyLoginButton({email, password, vorname}){
  const[copied,setCopied]=useState(false);
  async function copy(){
    const text=`Hallo ${vorname ? vorname+"," : ""}\n\nhier sind deine Zugangsdaten für den TZ Westlausitz Urlaubsplaner:\n\n🌐 Adresse: ${APP_URL}\n📧 E-Mail: ${email}\n🔑 Passwort: ${password}\n\n📱 ALS APP AUF DEM SMARTPHONE SPEICHERN:\n\niPhone/iPad (Safari):\n1. Seite oben öffnen\n2. Teilen-Symbol ▢↑ antippen\n3. „Zum Home-Bildschirm" wählen\n4. „Hinzufügen" tippen → App erscheint auf dem Home-Bildschirm\n\nAndroid (Chrome):\n1. Seite oben öffnen\n2. Menü ⋮ antippen\n3. „App installieren" oder „Zum Startbildschirm hinzufügen" wählen\n4. Bestätigen → App erscheint auf dem Startbildschirm\n\nBitte melde dich beim ersten Login an und ändere dein Passwort unter „Profil".\n\nViele Grüße\nThomas Keilig`;
    try{
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(()=>setCopied(false),3000);
    }catch(e){
      // Fallback für ältere Browser
      const el=document.createElement("textarea");
      el.value=text;document.body.appendChild(el);el.select();
      document.execCommand("copy");document.body.removeChild(el);
      setCopied(true);setTimeout(()=>setCopied(false),3000);
    }
  }
  return(
    <button onClick={copy} style={{
      width:"100%",padding:"9px 14px",borderRadius:8,border:"1.5px solid #5a8a1f",
      background:copied?"#dcfce7":"#f8faf0",color:copied?"#15803d":"#5a8a1f",
      fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .2s",
      display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:6
    }}>
      {copied?"✅ Kopiert! Jetzt in Nachricht einfügen":"📋 Login-Daten kopieren (für Nachricht an Mitarbeiter)"}
    </button>
  );
}

// ─── User Modal ───────────────────────────────────────────────────────────────
function UserModal({title,initial,isAdmin,onSave,onClose,onResetPw,belegteFarben=[],jahrHinweis=new Date().getFullYear(),entwurf=null}){
  // Gesicherte Eingaben haben Vorrang vor den Ausgangswerten
  const[f,setF]=useState(()=>entwurf?.felder||{
    vorname:initial?.vorname||"",nachname:initial?.nachname||"",
    email:initial?.email||"",role:initial?.role||"mitarbeiter",
    geschlecht:initial?.geschlecht||"",
    pauschal:initial?.pauschal??false,
    genehmigung_noetig:initial?.genehmigung_noetig??true,
    fronleichnam:initial?.fronleichnam??false,
    frist_datum:initial?.frist_datum||"",
    mindest_prozent:initial?.mindest_prozent??null,
    ueberstunden_erlaubt:initial?.ueberstunden_erlaubt??null,
    wochenstunden:initial?.wochenstunden??40,
    arbeitstage_woche:initial?.arbeitstage_woche??5,
    color:initial?.color||PRESET_COLORS[0],position:initial?.position||"",
    geburtsdatum:initial?.geburtsdatum||"",
    einstellungsdatum:initial?.einstellungsdatum||"",
    urlaubstage:String(initial?.urlaubstage??26),
    ueberstunden:String(initial?.ueberstunden??0),
    resturlaub:String(initial?.resturlaub??0),
    ...(initial?{id:initial.id}:{})
  });
  // Urlaubstage automatisch berechnen wenn Einstellungsdatum geändert wird
  function handleEinstellungsdatum(val){
    if(!val){
      setF(p=>({...p,einstellungsdatum:""}));
      return;
    }
    const auto=calcUrlaubstage(val);
    setF(p=>({...p,einstellungsdatum:val,urlaubstage:String(auto)}));
  }
  // Für neuen User: Passwort
  const[newUserPw,setNewUserPw]=useState(entwurf?.passwort||"");
  const[showPw,setShowPw]=useState(false);
  // Admin-Passwort-Reset für bestehenden User
  const[showPwReset,setShowPwReset]=useState(false);
  const[adminPw,setAdminPw]=useState("");
  const[adminPw2,setAdminPw2]=useState("");
  const[pwErr,setPwErr]=useState("");
  const[resetSuccess,setResetSuccess]=useState(null);
  const[saveErr,setSaveErr]=useState("");
  const[start]=useState(()=>JSON.stringify({...(initial||{}),...{}}));
  const[frageOffen,setFrageOffen]=useState(false);

  // Eingaben laufend sichern — überlebt einen Neustart durch iOS
  useEffect(()=>{
    const t=setTimeout(()=>{
      entwurfSpeichern({typ:initial?"editUser":"addUser",
        daten:initial||null, felder:f, passwort:newUserPw||""});
    },400);
    return()=>clearTimeout(t);
  },[f,newUserPw]);
  const[busy,setBusy]=useState(false);

  // Zahlenfeld: beim Fokus leeren damit man direkt tippen kann
  function numFocus(e){if(e.target.value==="0")e.target.select();}

  async function save(){
    setSaveErr("");
    if(!f.vorname||!f.email){setSaveErr("Vorname und E-Mail sind Pflichtfelder.");return;}
    if(!f.email.includes("@")){setSaveErr("Bitte eine gültige E-Mail-Adresse eingeben.");return;}
    if(!f.geschlecht){setSaveErr("Bitte das Geschlecht auswählen.");return;}
    if(!f.position){setSaveErr("Bitte eine Position auswählen.");return;}
    if(!initial&&!newUserPw){setSaveErr("Bitte ein Startpasswort für den neuen Mitarbeiter vergeben.");return;}
    if(!initial&&newUserPw.length<8){setSaveErr("Das Startpasswort muss mindestens 8 Zeichen lang sein.");return;}
    setBusy(true);
    try{
      entwurfLoeschen();
      await onSave({...f,email:f.email.trim().toLowerCase(),pauschal:!!f.pauschal,fronleichnam:!!f.fronleichnam,
        genehmigung_noetig:f.pauschal?(f.genehmigung_noetig!==false):true,
        frist_datum:f.frist_datum||null,
        mindest_prozent:f.mindest_prozent===null||f.mindest_prozent===""?null:parseInt(f.mindest_prozent),
        ueberstunden_erlaubt:f.ueberstunden_erlaubt,wochenstunden:f.pauschal?0:(parseFloat(f.wochenstunden)||0),arbeitstage_woche:f.pauschal?0:(parseInt(f.arbeitstage_woche)||5),urlaubstage:f.pauschal?0:(parseInt(f.urlaubstage)||0),ueberstunden:f.pauschal?0:(parseInt(f.ueberstunden)||0),resturlaub:f.pauschal?0:(parseInt(f.resturlaub)||0),geburtsdatum:f.geburtsdatum||null,einstellungsdatum:f.einstellungsdatum||null,...(!initial?{password:newUserPw}:{})});
    }catch(e){
      setSaveErr(e.message||"Speichern fehlgeschlagen.");
    }finally{setBusy(false);}
  }

  // Wurde etwas verändert? Vergleich gegen den Ausgangszustand
  function istGeaendert(){
    if(!initial)return Object.values(f).some(v=>v!==""&&v!==null&&v!==undefined);
    return Object.keys(f).some(k=>{
      const alt=initial[k]??"",neu=f[k]??"";
      return String(alt)!==String(neu);
    })||!!newUserPw;
  }
  async function schliessen(){
    if(!istGeaendert()){entwurfLoeschen();onClose();return;}
    setFrageOffen(true);
  }

  async function saveAdminPwReset(){
    const pw=adminPw||generatePassword();
    if(pw.length<6){setPwErr("Mindestens 6 Zeichen.");return;}
    setBusy(true);
    try{
      await onResetPw(initial.id,pw);
      // Nachrichtentext erstellen und kopieren
      const text=`Hallo ${initial?.vorname},

dein Passwort für den TZ Westlausitz Urlaubsplaner wurde zurückgesetzt:

🌐 ${APP_URL}
📧 E-Mail: ${initial?.email}
🔑 Neues Passwort: ${pw}

Bitte ändere dein Passwort nach dem ersten Login unter „Profil".

Viele Grüße
Thomas Keilig`;
      try{await navigator.clipboard.writeText(text);}catch(e){
        const el=document.createElement("textarea");el.value=text;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);
      }
      setShowPwReset(false);setAdminPw("");setAdminPw2("");setPwErr("");
      setResetSuccess({pw,email:initial?.email,vorname:initial?.vorname});
    }catch(e){setPwErr("Fehler: "+e.message);}
    finally{setBusy(false);}
  }

  return(
    <div style={S.overlay}>
      {frageOffen&&(
        <SpeichernFrage busy={busy}
          onSpeichern={async()=>{setFrageOffen(false);await save();}}
          onVerwerfen={()=>{setFrageOffen(false);entwurfLoeschen();onClose();}}
          onZurueck={()=>setFrageOffen(false)}/>
      )}
      <div style={{...S.modal,width:520}}>
        <div style={S.mHd}><span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>{title}</span><button style={S.clsBtn} onClick={schliessen}>✕</button></div>
        <div style={S.mBd}>

          {/* ── Stammdaten ── */}
          <div style={{fontSize:11,fontWeight:700,color:"#6a9e2f",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Stammdaten</div>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={S.lbl}>Vorname *</label><input style={S.inp} value={f.vorname} onChange={e=>setF(p=>({...p,vorname:e.target.value}))}/></div>
              <div><label style={S.lbl}>Nachname</label><input style={S.inp} value={f.nachname} onChange={e=>setF(p=>({...p,nachname:e.target.value}))}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={S.lbl}>Geschlecht *</label>
                <select style={{...S.inp,color:f.geschlecht?"#2d3a2e":"#9ab07a"}} value={f.geschlecht}
                  onChange={e=>setF(p=>({...p,geschlecht:e.target.value}))}>
                  <option value="">Bitte wählen …</option>
                  {GESCHLECHTER.map(([k,l])=><option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div><label style={S.lbl}>Position *</label>
                <select style={{...S.inp,color:f.position?"#2d3a2e":"#9ab07a"}} value={f.position}
                  onChange={e=>setF(p=>({...p,position:e.target.value}))} disabled={!isAdmin}>
                  <option value="">Bitte wählen …</option>
                  {Object.entries(SPARTEN).map(([sp,lbl])=>(
                    <optgroup key={sp} label={lbl}>
                      {POSITIONEN.filter(pos=>pos.sparte===sp).map(pos=>(
                        <option key={pos.key} value={pos.key}>{posLabel(pos.key,f.geschlecht)}</option>
                      ))}
                    </optgroup>
                  ))}
                  {!POS_MAP[f.position]&&<option value={f.position}>{f.position} (alt)</option>}
                </select>
              </div>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:9,fontSize:13,color:"#2d3a2e",
              background:f.pauschal?"#f7fce8":"#f8faf0",border:"1.5px solid "+(f.pauschal?"#7ab529":"#d5e8a0"),
              borderRadius:8,padding:"10px 12px",cursor:"pointer",fontWeight:600}}>
              <input type="checkbox" checked={!!f.pauschal}
                onChange={e=>setF(p=>({...p,pauschal:e.target.checked}))} style={{width:17,height:17}}/>
              <span>Pauschalkraft — keine feste Stundenzahl, kein fester Urlaubsanspruch</span>
            </label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={S.lbl}>Eigene Abgabefrist</label>
                <input style={S.dateInp} type="date" value={f.frist_datum||""}
                  onChange={e=>setF(p=>({...p,frist_datum:e.target.value}))}/>
                <div style={{fontSize:11,color:"#8aaa5f",marginTop:3}}>Leer = betriebliche Vorgabe</div>
              </div>
              <div><label style={S.lbl}>Eigener Mindestanteil (%)</label>
                <input style={S.inp} type="number" min="0" max="100" placeholder="Vorgabe"
                  value={f.mindest_prozent??""}
                  onChange={e=>setF(p=>({...p,mindest_prozent:e.target.value===""?null:e.target.value}))}/>
                <div style={{fontSize:11,color:"#8aaa5f",marginTop:3}}>Leer = betriebliche Vorgabe</div>
              </div>
            </div>
            <div><label style={S.lbl}>Freizeitausgleich</label>
              <select style={S.inp}
                value={f.ueberstunden_erlaubt===null||f.ueberstunden_erlaubt===undefined?"":String(f.ueberstunden_erlaubt)}
                onChange={e=>setF(p=>({...p,ueberstunden_erlaubt:e.target.value===""?null:e.target.value==="true"}))}>
                <option value="">Betriebliche Vorgabe übernehmen</option>
                <option value="true">Erlaubt</option>
                <option value="false">Nicht erlaubt</option>
              </select>
            </div>
            <label style={{display:"flex",alignItems:"flex-start",gap:9,fontSize:13,color:"#2d3a2e",
              background:f.fronleichnam?"#f7fce8":"#f8faf0",border:"1.5px solid "+(f.fronleichnam?"#7ab529":"#d5e8a0"),
              borderRadius:8,padding:"10px 12px",cursor:"pointer",fontWeight:600}}>
              <input type="checkbox" checked={!!f.fronleichnam}
                onChange={e=>setF(p=>({...p,fronleichnam:e.target.checked}))} style={{width:17,height:17,marginTop:2,flexShrink:0}}/>
              <span>Fronleichnam ist ein Feiertag
                <div style={{fontWeight:400,fontSize:11,color:"#5a6b4a",marginTop:2}}>
                  In Sachsen nur in einzelnen Gemeinden des Landkreises Bautzen gesetzlicher Feiertag.
                  Ist der Haken gesetzt, kostet Fronleichnam für diese Person keinen Urlaubstag.
                </div>
              </span>
            </label>
            {f.pauschal&&(
              <div><label style={S.lbl}>Urlaub genehmigungspflichtig?</label>
                <select style={S.inp}
                  value={f.genehmigung_noetig===false?"nein":"ja"}
                  onChange={e=>setF(p=>({...p,genehmigung_noetig:e.target.value==="ja"}))}>
                  <option value="ja">Ja — die Teamleitung muss zustimmen</option>
                  <option value="nein">Nein — Urlaub gilt sofort als eingetragen</option>
                </select>
                <div style={{fontSize:11,color:"#8aaa5f",marginTop:4,lineHeight:1.5}}>
                  {f.genehmigung_noetig===false
                    ? "Einträge dieser Person erscheinen sofort als bestätigt und landen nicht in der Genehmigungsliste."
                    : "Einträge gehen wie üblich als Antrag an die zuständige Leitung."}
                </div>
              </div>
            )}
            {!f.pauschal?(<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={S.lbl}>Wochenarbeitszeit (Std.)</label>
                  <input style={S.inp} type="number" min="0" max="60" step="0.5" value={f.wochenstunden}
                    onChange={e=>setF(p=>({...p,wochenstunden:e.target.value}))}/>
                </div>
                <div><label style={S.lbl}>Arbeitstage pro Woche</label>
                  <select style={S.inp} value={f.arbeitstage_woche} onChange={e=>setF(p=>({...p,arbeitstage_woche:e.target.value}))}>
                    {WOCHENTAGE_AUSWAHL.map(n=><option key={n} value={n}>{n} {n===1?"Tag":"Tage"}</option>)}
                  </select>
                </div>
              </div>
              <div style={{fontSize:12,color:"#4a6b0f",background:"#f7fce8",borderRadius:6,padding:"6px 10px",border:"1px solid #d5e8a0"}}>
                ⏱ Ein Urlaubstag entspricht <strong>{fmtStd(stdProTag(f))} Stunden</strong>
                {f.ueberstunden>0&&<> · Überstundenkonto: {fmtT(f.ueberstunden)} T ≈ {fmtStd(tageInStd(f.ueberstunden,f))} Std.</>}
              </div>
            </>):(
              <div style={{fontSize:12,color:"#92400e",background:"#fff7ed",borderRadius:6,padding:"8px 10px",border:"1px solid #fcd9b0"}}>
                Für Pauschalkräfte werden Arbeitszeit, Urlaubsanspruch und Überstundenkonto nicht geführt.
                Freie Tage lassen sich weiterhin im Kalender eintragen — sie werden nur gezählt, nicht gegen ein Kontingent gerechnet.
              </div>
            )}
            <div style={{fontSize:12,color:"#5a6b4a",background:"#f8faf0",borderRadius:6,padding:"6px 10px",border:"1px solid #d5e8a0"}}>
              {(()=>{
                if(!f.position)return "Bitte zuerst eine Position auswählen.";
                const pi=posInfo(f.position);
                if(pi.scope==="alle")return "🔑 Darf alle Mitarbeiter und Leitungen sehen und bearbeiten.";
                if(pi.scope==="sparte")return "🔑 Darf alle Mitarbeiter und Teamleitungen der Sparte "+(SPARTEN[pi.sparte]||"–")+" bearbeiten, Urlaub eintragen, genehmigen und ablehnen. Geschäftsleitung und Buchhaltung bleiben unsichtbar.";
                if(pi.scope==="bereich")return "🔑 Darf alle Mitarbeiter im Bereich "+(BEREICH_NAME[pi.bereich]||"–")+" bearbeiten, Urlaub eintragen, genehmigen und ablehnen.";
                return "👤 Sieht und bearbeitet nur den eigenen Urlaub und die eigenen Stammdaten."
                  +(pi.bereich?" Zuständig ist "+(BEREICH_NAME[pi.bereich]||"die Leitung")+".":"");
              })()}
            </div>
            <div style={{maxWidth:280}}><label style={S.lbl}>Geburtsdatum</label>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input style={{...S.inp,flex:1}} type="date" value={f.geburtsdatum} onChange={e=>setF(p=>({...p,geburtsdatum:e.target.value}))}/>
                {alterAus(f.geburtsdatum)!==null&&(
                  <span style={{fontSize:13,fontWeight:700,color:"#4a6b0f",background:"#f7fce8",
                    border:"1px solid #d5e8a0",borderRadius:8,padding:"7px 11px",whiteSpace:"nowrap"}}>
                    {alterAus(f.geburtsdatum)} J.
                  </span>
                )}
              </div>
            </div>
            {/* Einstellungsdatum: nur für Admin sichtbar */}
            {isAdmin&&(
              <div>
                <label style={S.lbl}>📅 Einstellungsdatum</label>
                <div style={{maxWidth:240}}>
                  <input style={S.inp} type="date" value={f.einstellungsdatum}
                    onChange={e=>handleEinstellungsdatum(e.target.value)}/>
                </div>
                {f.einstellungsdatum&&(
                  <div style={{marginTop:6,fontSize:12,color:"#5a6b4a",background:"#f8faf0",borderRadius:6,padding:"6px 10px",border:"1px solid #d5e8a0"}}>
                    💡 Betriebszugehörigkeit: <strong>{(()=>{
                      const j=calcUrlaubstage(f.einstellungsdatum);
                      const einDate=new Date(f.einstellungsdatum);
                      const jahre=new Date().getFullYear()-einDate.getFullYear();
                      return jahre<=0?"1. Jahr (Eintrittsjahr)":`${jahre}. Jahr → ${j} Urlaubstage vorgeschlagen`;
                    })()}</strong>
                  </div>
                )}
              </div>
            )}
            {!f.pauschal&&(<>
            <div style={{fontSize:12,color:"#92400e",background:"#fff7ed",border:"1px solid #fcd9b0",borderRadius:6,padding:"7px 10px"}}>
              💡 Urlaubsanspruch und Resturlaub gelten ab sofort <strong>je Kalenderjahr</strong>.
              Die Werte hier betreffen das im Kopf gewählte Jahr <strong>{jahrHinweis}</strong>.
            </div>
            <div><label style={S.lbl}>Urlaubstage / Jahr</label>
              <input style={S.inp} type="text" inputMode="numeric" pattern="[0-9]*"
                value={f.urlaubstage}
                onFocus={e=>e.target.select()}
                onChange={e=>setF(p=>({...p,urlaubstage:e.target.value.replace(/[^0-9]/g,"")}))}/>
            </div>
            <div><label style={S.lbl}>Überstunden (Tage)</label>
              <input style={S.inp} type="text" inputMode="numeric" pattern="[0-9]*"
                value={f.ueberstunden}
                onFocus={e=>e.target.select()}
                onChange={e=>setF(p=>({...p,ueberstunden:e.target.value.replace(/[^0-9]/g,"")}))}/>
            </div>
            <div><label style={S.lbl}>Resturlaub Vorjahr</label>
              <input style={S.inp} type="text" inputMode="numeric" pattern="[0-9]*"
                value={f.resturlaub}
                onFocus={e=>e.target.select()}
                onChange={e=>setF(p=>({...p,resturlaub:e.target.value.replace(/[^0-9]/g,"")}))}/>
            </div>
            </>)}
            {isAdmin&&<div><label style={S.lbl}>Berechtigung</label>
              <select style={S.inp} value={f.role} onChange={e=>setF(p=>({...p,role:e.target.value}))}>
                {ROLLEN.map(([k,l])=><option key={k} value={k}>{l}</option>)}
              </select>
              <div style={{fontSize:11,color:"#8aaa5f",marginTop:4}}>
                {f.role==="admin"?"Administrator: alle Berechtigungen im gesamten Urlaubsplaner.":"Mitarbeiter: Rechte richten sich nach der Position."}
              </div>
            </div>}
          </div>

          {/* ── Farbe ── */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <label style={S.lbl}>Farbe</label>
              <div style={{display:"flex",alignItems:"center",gap:6,background:"#f8faf0",borderRadius:8,padding:"4px 10px",border:"1px solid #d5e8a0"}}>
                <div style={{width:18,height:18,borderRadius:4,background:f.color}}/>
                <span style={{fontSize:12,fontWeight:600,color:"#5a6b4a"}}>{f.color}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
              {PRESET_COLORS.map(c=>{
                const belegtVon=belegteFarben.find(x=>x.farbe===c);
                const isUsed=!!belegtVon&&f.color!==c;
                return(
                  <div key={c}
                    onClick={()=>setF(p=>({...p,color:c}))}
                    title={isUsed?"Im selben Fachbereich bereits vergeben an "+belegtVon.name:""}
                    style={{width:32,height:32,borderRadius:6,background:c,
                      cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      opacity:isUsed?0.45:1,
                      boxShadow:f.color===c?"0 0 0 3px #2d3a2e, 0 0 0 5px "+c:"0 1px 3px rgba(0,0,0,0.2)",
                      transform:f.color===c?"scale(1.15)":"scale(1)",
                      transition:"all .15s",
                      position:"relative",
                    }}>
                    {f.color===c&&<span style={{color:"#fff",fontSize:16,fontWeight:900,textShadow:"0 1px 2px rgba(0,0,0,0.5)"}}>✓</span>}
                    {isUsed&&f.color!==c&&<span style={{color:"#fff",fontSize:13,fontWeight:900,textShadow:"0 1px 2px rgba(0,0,0,0.6)"}}>!</span>}
                  </div>
                );
              })}
              <div style={{position:"relative",width:32,height:32}}>
                <input type="color" value={f.color} onChange={e=>setF(p=>({...p,color:e.target.value}))}
                  style={{width:32,height:32,border:"2px solid #d5e8a0",borderRadius:6,cursor:"pointer",padding:2}}/>
                <span style={{position:"absolute",bottom:-14,left:"50%",transform:"translateX(-50%)",fontSize:9,color:"#8aaa5f",whiteSpace:"nowrap"}}>Eigene</span>
              </div>
            </div>
            {(()=>{
              const konflikt=belegteFarben.find(x=>x.farbe===f.color);
              if(!konflikt)return null;
              return(
                <div style={{fontSize:12,color:"#92400e",background:"#fff7ed",border:"1px solid #fcd9b0",
                  borderRadius:6,padding:"7px 10px",marginTop:16}}>
                  ⚠️ Diese Farbe hat im selben Fachbereich bereits <strong>{konflikt.name}</strong>.
                  Im Kalender sind beide dann schwer auseinanderzuhalten — speichern ist trotzdem möglich.
                </div>
              );
            })()}
          </div>

          {/* ── Zugangsdaten (separater Bereich) ── */}
          <div style={{borderTop:"1px solid #334155",paddingTop:14,marginBottom:4}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6a9e2f",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>🔐 Zugangsdaten</div>

            {/* E-Mail */}
            <div style={{marginBottom:12}}><label style={S.lbl}>E-Mail-Adresse *</label>
              <input style={S.inp} type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))}/>
            </div>

            {/* Neuer User: Passwort mit Generator */}
            {!initial&&(
              <div>
                <label style={S.lbl}>Passwort *</label>
                {/* Generator-Button immer sichtbar, groß und auffällig */}
                <button onClick={()=>{const pw=generatePassword();setNewUserPw(pw);}}
                  style={{width:"100%",padding:"11px 14px",background:"#5a8a1f",color:"#fff",border:"none",
                    borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:8,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                    boxShadow:"0 2px 6px rgba(90,138,31,0.3)"}}>
                  🔑 Sicheres Passwort automatisch generieren
                </button>
                {/* Passwort-Anzeige mit Kopier-Möglichkeit */}
                {newUserPw&&(
                  <>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                      <div style={{flex:1,background:"#f8faf0",border:"1.5px solid #5a8a1f",borderRadius:8,
                        padding:"10px 14px",fontFamily:"monospace",fontSize:15,letterSpacing:"0.08em",
                        color:"#2d3a2e",fontWeight:700}}>
                        {newUserPw}
                      </div>
                      <button onClick={()=>setNewUserPw(generatePassword())}
                        title="Neues Passwort generieren"
                        style={{background:"#f8faf0",border:"1.5px solid #d5e8a0",borderRadius:8,
                          padding:"10px 10px",cursor:"pointer",fontSize:16}}>
                        🔄
                      </button>
                    </div>
                    {f.email&&<CopyLoginButton email={f.email} password={newUserPw} vorname={f.vorname}/>}
                  </>
                )}
                {!newUserPw&&(
                  <div style={{fontSize:11,color:"#f97316",marginTop:4,fontWeight:600}}>
                    ⚠ Bitte erst Passwort generieren
                  </div>
                )}
              </div>
            )}

            {/* Bestehender User: Admin kann Passwort zurücksetzen */}
            {initial&&isAdmin&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#64748b"}}>Passwort des Mitarbeiters zurücksetzen</span>
                  <button onClick={()=>{setShowPwReset(v=>!v);setPwErr("");}} style={{...S.canBtn,fontSize:11,padding:"4px 10px"}}>
                    {showPwReset?"Abbrechen":"Passwort zurücksetzen"}
                  </button>
                </div>
                {showPwReset&&(
                  <div style={{marginTop:10,padding:12,background:"#f8faf0",borderRadius:8,border:"1px solid #d5e8a0",display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{fontSize:11,color:"#92400e",marginBottom:2}}>⚠ Als Admin kannst du das Passwort ohne das alte Passwort zurücksetzen.</div>
                    <div><label style={S.lbl}>Neues Passwort</label>
                      <input style={S.inp} type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} placeholder="Mindestens 6 Zeichen"/>
                    </div>
                    <div><label style={S.lbl}>Neues Passwort bestätigen</label>
                      <input style={S.inp} type="password" value={adminPw2} onChange={e=>setAdminPw2(e.target.value)}/>
                    </div>
                    {pwErr&&<div style={{fontSize:12,color:"#f87171",background:"rgba(248,113,113,0.1)",padding:"6px 10px",borderRadius:6}}>{pwErr}</div>}
                    {/* Auto-Generieren Button */}
                    <button onClick={()=>setAdminPw(generatePassword())}
                      style={{width:"100%",padding:"9px",background:"#5a8a1f",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:6}}>
                      🔑 Neues Passwort automatisch generieren
                    </button>
                    {adminPw&&(
                      <div style={{background:"#f8faf0",border:"1.5px solid #5a8a1f",borderRadius:8,padding:"10px 14px",fontFamily:"monospace",fontSize:15,letterSpacing:"0.08em",color:"#2d3a2e",fontWeight:700,marginBottom:6}}>
                        {adminPw}
                      </div>
                    )}
                    <button style={{...S.savBtn,width:"100%",opacity:(busy||!adminPw)?0.6:1}} onClick={saveAdminPwReset} disabled={busy||!adminPw}>
                      {busy?"Wird gesetzt…":"✓ Passwort setzen & Nachrichtentext kopieren 📋"}
                    </button>
                    {resetSuccess&&(
                      <div style={{marginTop:10,background:"#f0fdf4",border:"1.5px solid #22c55e",borderRadius:8,padding:"12px 14px"}}>
                        <div style={{fontWeight:700,fontSize:13,color:"#15803d",marginBottom:6}}>✅ Passwort zurückgesetzt!</div>
                        <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:"#2d3a2e",marginBottom:8}}>{resetSuccess.pw}</div>
                        <CopyLoginButton email={resetSuccess.email} password={resetSuccess.pw} vorname={resetSuccess.vorname}/>
                        <div style={{fontSize:11,color:"#5a6b4a",marginTop:6}}>Nachrichtentext wurde kopiert → einfügen & senden.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {saveErr&&(
          <div style={{margin:"0 20px",padding:"10px 14px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,color:"#B91C1C",fontSize:14,lineHeight:1.4}}>
            ⚠️ {saveErr}
          </div>
        )}
        <div style={S.mFt}>
          <button style={{...S.savBtn,opacity:busy?0.6:1}} onClick={save} disabled={busy}>{busy?"Speichert…":"Speichern"}</button>
          <button style={S.canBtn} onClick={schliessen}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

// ─── Entry Modal ──────────────────────────────────────────────────────────────
function EntryModal({title,year,isAdmin,initial,onSave,onClose,allEntries,currentUserId,kontingent,zielBereich,bereichVon,zielUserId,zielUser,ueErlaubt=true}){
  const[type,setType]=useState(initial?.type||"urlaub");
  const[von,setVon]=useState(initial?.von||"");
  const[bis,setBis]=useState(initial?.bis||"");
  const zeitraumGesetzt=!!von&&!!bis;
  const[note,setNote]=useState(initial?.note||"");
  const[busy,setBusy]=useState(false);
  const[conflicts,setConflicts]=useState([]);
  const[quelle,setQuelle]=useState("");        // Ausgleich für fehlende Urlaubstage
  const wd=countWD(von,bis,zielUser);
  const feiertageImZeitraum=besondereTage(von,bis,zielUser);

  // ── Urlaubskonto prüfen ──────────────────────────────────────────
  const k=kontingent||null;
  const restJahr   =k?Math.max(0,Math.round((k.urlaubstage -k.genutztUrlaub)*2)/2):0;
  const restVorjahr=k?Math.max(0,Math.round((k.resturlaub  -k.genutztRest )*2)/2):0;
  const restUeber  =k?Math.max(0,Math.round((k.ueberstunden-k.genutztUeber)*2)/2):0;
  // Nur beim Neuanlegen von normalem Urlaub prüfen
  const pruefen=!!k&&!initial&&type==="urlaub"&&wd>0&&zeitraumGesetzt;
  // Resturlaub wird zuerst verbraucht, deshalb zählt er zum verfügbaren Vorrat
  const verfuegbar=Math.round((restJahr+restVorjahr)*2)/2;
  const fehlend=pruefen?Math.max(0,Math.round((wd-verfuegbar)*2)/2):0;
  // Überstundenabbau ist jederzeit möglich und belastet den Urlaubsanspruch nicht
  const ueberzogen=(!initial&&type==="ueberstunden"&&k&&zeitraumGesetzt)?Math.max(0,Math.round((wd-restUeber)*2)/2):0;
  const ausgleichMoeglich=ueErlaubt?restUeber:0;
  const gewaehlteReserve=quelle==="ueberstunden"?restUeber:0;
  // Eigene Doppelbuchung: überschneidet sich der Zeitraum mit einem eigenen Eintrag?
  const eigeneUeberschneidung=(()=>{
    const uid=zielUserId||currentUserId;
    if(!uid||!von||!bis||bis<von)return [];
    return (allEntries||[]).filter(e=>
      e.user_id===uid&&
      e.id!==initial?.id&&
      e.status!=="rejected"&&
      von<=e.bis&&bis>=e.von
    );
  })();
  const doppelt=eigeneUeberschneidung.length>0;

  const blockiert=!zeitraumGesetzt||doppelt||wd===0||ueberzogen>0||(fehlend>0&&(ausgleichMoeglich<=0||!quelle||gewaehlteReserve<fehlend));

  // Gibt es nur eine mögliche Ausgleichsquelle, direkt vorauswählen —
  // sonst bleibt der Speichern-Knopf ohne erkennbaren Grund gesperrt.
  useEffect(()=>{
    if(fehlend>0&&restUeber>=fehlend)setQuelle("ueberstunden");
    else setQuelle("");
  },[von,bis,type,fehlend,restUeber]);

  // Konflikt-Prüfung in Echtzeit
  useEffect(()=>{
    if(!von||!bis||bis<von||(allEntries||[]).length===0){setConflicts([]);return;}
    const cf=(allEntries||[]).filter(e=>
      e.status==="confirmed"&&
      e.user_id!==(zielUserId||currentUserId)&&
      e.id!==initial?.id&&
      von<=e.bis&&bis>=e.von&&
      // Nur derselbe Fachbereich zählt als Überschneidung
      (!bereichVon||!zielBereich||bereichVon(e.user_id)===zielBereich)
    );
    setConflicts(cf);
  },[von,bis,allEntries,currentUserId]);

  async function save(){
    if(!von||!bis||bis<von){alert("Bitte gültige Daten wählen.");return;}
    if(doppelt){alert("Für diesen Zeitraum ist bereits ein Eintrag vorhanden.");return;}
    if(blockiert)return;
    if(conflicts.length>0&&!isAdmin){
      const ok=window.confirm(`⚠ Überschneidung mit ${conflicts.length} bestätigtem Urlaub im selben Fachbereich.\nTrotzdem beantragen?`);
      if(!ok)return;
    }
    // Aufteilung des Zeitraums: erst Resturlaub aus dem Vorjahr, dann Jahresurlaub,
    // zuletzt der gewählte Ausgleich. Bei "Überstunden abbauen" bleibt alles unberührt.
    let pakete=[{type,von,bis,note}];
    if(type==="urlaub"){
      const stufen=[];
      if(restVorjahr>0)stufen.push({typ:"resturlaub",menge:Math.min(restVorjahr,wd),
        text:"Resturlaub aus dem Vorjahr (wird zuerst verbraucht)"});
      const nachRest=Math.max(0,wd-(restVorjahr>0?Math.min(restVorjahr,wd):0));
      if(nachRest>0)stufen.push({typ:"urlaub",menge:Math.min(restJahr,nachRest),text:null});
      const offen=Math.max(0,nachRest-Math.min(restJahr,nachRest));
      if(offen>0&&quelle)stufen.push({typ:quelle,menge:offen,
        text:quelle==="resturlaub"?"Resturlaub aus dem Vorjahr":"Freizeitausgleich aus dem Überstundenkonto"});

      const echte=stufen.filter(x=>x.menge>0);
      if(echte.length>1){
        pakete=[];
        let start=von,verbraucht=0;
        for(let i=0;i<echte.length;i++){
          const st=echte[i];
          verbraucht+=st.menge;
          const letzterTag=i===echte.length-1?bis:splitDatum(von,bis,verbraucht);
          if(!letzterTag)break;
          pakete.push({type:st.typ,von:start,bis:letzterTag,
            note:st.text?((note?note+" · ":"")+st.text):note});
          if(i<echte.length-1)start=naechsterTag(letzterTag);
        }
      }else if(echte.length===1&&echte[0].typ!=="urlaub"){
        pakete=[{type:echte[0].typ,von,bis,
          note:echte[0].text?((note?note+" · ":"")+echte[0].text):note}];
      }
    }
    setBusy(true);try{await onSave(pakete);}finally{setBusy(false);}
  }
  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHd}><span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>{title}</span><button style={S.clsBtn} onClick={onClose}>✕</button></div>
        <div style={S.mBd}>
          {/* 1. Zeitraum wählen */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>Von</label><input style={S.dateInp} type="date" value={von} onChange={e=>{setVon(e.target.value);if(e.target.value>bis)setBis(e.target.value);}}/></div>
            <div><label style={S.lbl}>Bis</label><input style={S.dateInp} type="date" value={bis} min={von} onChange={e=>setBis(e.target.value)}/></div>
          </div>

          {/* 2. Erst danach entscheiden, wovon abgezogen wird */}
          <div style={{marginBottom:12}}>
            <label style={S.lbl}>Wovon soll der Zeitraum abgezogen werden?</label>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:5}}>
              {[["urlaub","🏖 Urlaub",restVorjahr>0?"Resturlaub aus dem Vorjahr wird automatisch zuerst genutzt":"Vom Jahresurlaub",k?fmtT(verfuegbar)+" T verfügbar":null],
                ...(ueErlaubt?[["ueberstunden","⏱ Freizeitausgleich","Abbau von Überstunden — belastet den Urlaubsanspruch nicht",k?fmtT(restUeber)+" T Guthaben"+(k.stdProTag>0?" (≈ "+fmtStd(restUeber*k.stdProTag)+" Std.)":""):null]]:[])
              ].map(([wert,titel,erklaerung,vorrat])=>{
                const aktiv=type===wert;
                const leer=k&&((wert==="urlaub"&&verfuegbar<=0)||(wert==="ueberstunden"&&restUeber<=0));
                return(
                  <label key={wert} style={{display:"flex",alignItems:"flex-start",gap:9,cursor:"pointer",
                    background:aktiv?"#f7fce8":"#fff",border:"1.5px solid "+(aktiv?"#7ab529":"#d5e8a0"),
                    borderRadius:8,padding:"9px 11px",opacity:leer&&!aktiv?0.55:1}}>
                    <input type="radio" name="abzugsquelle" checked={aktiv}
                      onChange={()=>setType(wert)} style={{marginTop:3,flexShrink:0}}/>
                    <span style={{flex:1,minWidth:0}}>
                      <span style={{fontWeight:700,fontSize:13,color:"#2d3a2e"}}>{titel}</span>
                      {vorrat&&<span style={{fontSize:12,color:leer?"#dc2626":"#4a6b0f",fontWeight:600}}> · {vorrat}</span>}
                      <div style={{fontSize:11,color:"#8aaa5f",marginTop:1}}>{erklaerung}</div>
                    </span>
                  </label>
                );
              })}
              {initial&&type==="resturlaub"&&(
                <div style={{fontSize:12,color:"#8aaa5f"}}>Dieser Eintrag läuft als Resturlaub aus dem Vorjahr.</div>
              )}
              {!ueErlaubt&&(
                <div style={{fontSize:11,color:"#8aaa5f"}}>
                  Freizeitausgleich ist derzeit nicht freigegeben.
                </div>
              )}
            </div>
          </div>
          <div style={{marginBottom:12}}><label style={S.lbl}>Hinweis (optional)</label><input style={S.inp} value={note} onChange={e=>setNote(e.target.value)} placeholder="z.B. Familienurlaub"/></div>
          {!zeitraumGesetzt&&(
            <div style={{fontSize:13,color:"#8aaa5f",padding:"10px 12px",background:"#f8faf0",border:"1px dashed #d5e8a0",borderRadius:8}}>
              Bitte zuerst Start- und Enddatum wählen.
            </div>
          )}
          {zeitraumGesetzt&&<div style={{fontSize:13,color:"#5a6b4a",padding:"8px 0",borderTop:"1px solid #edf5d8",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
            <span>Urlaubstage (ohne Feiertage): <strong style={{color:wd===0?"#dc2626":"#2d3a2e"}}>{fmtT(wd)}</strong></span>
            {pruefen&&<span>Verfügbar: <strong style={{color:fehlend>0?"#dc2626":"#4a6b0f"}}>{fmtT(verfuegbar)} T</strong>
              {restVorjahr>0&&<span style={{color:"#8aaa5f",fontWeight:400}}> (davon {fmtT(restVorjahr)} Resturlaub)</span>}</span>}
            {!initial&&type==="ueberstunden"&&k&&<span>Überstundenguthaben: <strong style={{color:ueberzogen>0?"#dc2626":"#4a6b0f"}}>{fmtT(restUeber)} T</strong></span>}
          </div>}

          {/* Warum werden Tage nicht gezählt? */}
          {feiertageImZeitraum.length>0&&(
            <div style={{fontSize:12,color:"#4a6b0f",background:"#f7fce8",border:"1px solid #d5e8a0",borderRadius:6,padding:"7px 10px"}}>
              {feiertageImZeitraum.map((f,i)=>(
                <div key={i}>🎉 {fmtDE(f.iso)} · {f.name}{f.halb?" – zählt als halber Tag":" – Feiertag, kostet keinen Urlaub"}</div>
              ))}
            </div>
          )}
          {zeitraumGesetzt&&wd===0&&(
            <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontWeight:700,fontSize:13,color:"#b91c1c",marginBottom:2}}>⛔ Kein Arbeitstag im Zeitraum</div>
              <div style={{fontSize:12,color:"#b91c1c"}}>
                Der Zeitraum besteht nur aus Wochenenden und Feiertagen — ein Urlaubsantrag ist nicht nötig.
              </div>
            </div>
          )}

          {/* Bereits vorhandener eigener Eintrag im selben Zeitraum */}
          {doppelt&&(
            <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:8,padding:"10px 12px",marginTop:4}}>
              <div style={{fontWeight:700,fontSize:13,color:"#b91c1c",marginBottom:4}}>
                ⛔ Für diesen Zeitraum besteht bereits ein Eintrag
              </div>
              {eigeneUeberschneidung.slice(0,3).map((e,i)=>(
                <div key={i} style={{fontSize:12,color:"#b91c1c"}}>
                  • {TYP_LABEL[e.type]||e.type}: {fmtDE(e.von)} – {fmtDE(e.bis)} ({e.status==="pending"?"wartet auf Genehmigung":e.status==="confirmed"?"bestätigt":e.status})
                </div>
              ))}
              <div style={{fontSize:11,color:"#b91c1c",marginTop:4}}>
                Bitte einen anderen Zeitraum wählen oder den bestehenden Eintrag bearbeiten.
              </div>
            </div>
          )}

          {/* Was genau wird gebucht? */}
          {!initial&&wd>0&&!doppelt&&k&&(()=>{
            const zeilen=[];
            if(type==="ueberstunden"){
              zeilen.push(["⏱ Freizeitausgleich",Math.min(wd,restUeber)]);
            }else{
              const ausRest=Math.min(restVorjahr,wd);
              if(ausRest>0)zeilen.push(["↩ Resturlaub Vorjahr",ausRest]);
              const ausJahr=Math.min(restJahr,Math.max(0,wd-ausRest));
              if(ausJahr>0)zeilen.push(["🏖 Jahresurlaub",ausJahr]);
              if(fehlend>0&&quelle==="ueberstunden")zeilen.push(["⏱ Freizeitausgleich",fehlend]);
            }
            if(zeilen.length===0)return null;
            return(
              <div style={{background:"#f7fce8",border:"1px solid #d5e8a0",borderRadius:8,padding:"9px 11px"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#4a6b0f",marginBottom:4}}>
                  So wird gebucht:
                </div>
                {zeilen.map(([lbl,menge],i)=>(
                  <div key={i} style={{fontSize:12,color:"#2d3a2e",display:"flex",justifyContent:"space-between"}}>
                    <span>{lbl}</span><strong>{fmtT(menge)} {menge===1?"Tag":"Tage"}</strong>
                  </div>
                ))}
                {zeilen.length>1&&(
                  <div style={{fontSize:11,color:"#8aaa5f",marginTop:4}}>
                    Der Zeitraum wird dafür automatisch in {zeilen.length} Einträge geteilt.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Überstundenkonto reicht nicht */}
          {ueberzogen>0&&(
            <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontWeight:700,fontSize:13,color:"#b91c1c",marginBottom:2}}>⛔ Nicht genügend Überstundenguthaben</div>
              <div style={{fontSize:12,color:"#b91c1c"}}>
                Der Zeitraum benötigt {fmtT(wd)} Tage, auf dem Überstundenkonto stehen {fmtT(restUeber)} Tage.
              </div>
            </div>
          )}

          {/* Urlaubskonto reicht nicht */}
          {fehlend>0&&(
            <div style={{background:ausgleichMoeglich>0?"#fff7ed":"#fef2f2",border:"1.5px solid "+(ausgleichMoeglich>0?"#f0932b":"#fca5a5"),borderRadius:8,padding:"10px 12px",marginTop:4}}>
              <div style={{fontWeight:700,fontSize:13,color:ausgleichMoeglich>0?"#92400e":"#b91c1c",marginBottom:6}}>
                ⚠ Nicht genügend Urlaub für diesen Zeitraum
              </div>
              <div style={{fontSize:12,color:ausgleichMoeglich>0?"#b45309":"#b91c1c",marginBottom:ausgleichMoeglich>0?8:0}}>
                Der Zeitraum benötigt {fmtT(wd)} Tage, verfügbar sind noch {fmtT(verfuegbar)} Tage (inkl. Resturlaub).
                Es fehlen <strong>{fmtT(fehlend)} Tage</strong>.
              </div>
              {ausgleichMoeglich>0?(
                <div>
                  <div style={{fontSize:12,color:"#92400e",fontWeight:600,marginBottom:6}}>
                    Die fehlenden Tage werden als Freizeitausgleich gebucht:
                  </div>
                  <div style={{fontSize:12,color:"#92400e",padding:"3px 0"}}>
                    ⏱ <strong>{fmtT(fehlend)} {fehlend===1?"Tag":"Tage"}</strong> als Freizeitausgleich aus dem Überstundenkonto
                    {k?.stdProTag?" ("+fmtStd(fehlend*k.stdProTag)+" Std.)":""} · danach verbleiben {fmtT(restUeber-fehlend)} T.
                  </div>
                  <div style={{fontSize:11,color:"#92400e",marginTop:4}}>
                    Möchtest du den gesamten Zeitraum als Freizeitausgleich nehmen, wähle oben „⏱ Freizeitausgleich".
                  </div>
                </div>
              ):(
                <div style={{fontSize:12,color:"#b91c1c",marginTop:4}}>
                  Es steht weder Resturlaub aus dem Vorjahr noch ein Überstundenguthaben zur Verfügung. Bitte den Zeitraum verkürzen.
                </div>
              )}
            </div>
          )}
          {/* Konflikt-Warnung */}
          {conflicts.length>0&&(
            <div style={{background:"#fff7ed",border:"1.5px solid #f0932b",borderRadius:8,padding:"10px 12px",marginTop:4}}>
              <div style={{fontWeight:700,fontSize:13,color:"#92400e",marginBottom:4}}>
                ⚠ Überschneidung im Fachbereich {BEREICH_NAME[zielBereich]||""} ({conflicts.length} {conflicts.length===1?"Eintrag":"Einträge"})
              </div>
              {conflicts.slice(0,3).map((e,i)=>(
                <div key={i} style={{fontSize:12,color:"#b45309"}}>
                  • {fmtDE(e.von)} – {fmtDE(e.bis)}
                </div>
              ))}
              {isAdmin
                ? <div style={{fontSize:11,color:"#92400e",marginTop:4}}>Du kannst den Eintrag trotzdem bestätigen.</div>
                : <div style={{fontSize:11,color:"#92400e",marginTop:4}}>Du kannst den Antrag trotzdem stellen — die zuständige Leitung entscheidet.</div>
              }
            </div>
          )}
          {!isAdmin&&<div style={{fontSize:11,color:"#8aaa5f",marginTop:6}}>
            {ohneGenehmigungspflicht(zielUser)
              ? "Dein Urlaub wird ohne Genehmigung direkt eingetragen."
              : "Dein Antrag wird dem Administrator zur Genehmigung vorgelegt."}
          </div>}
        </div>
        <div style={S.mFt}><button style={{...S.savBtn,opacity:(busy||blockiert)?0.5:1,cursor:blockiert?"not-allowed":"pointer"}} onClick={save} disabled={busy||blockiert} title={!zeitraumGesetzt?"Bitte zuerst den Zeitraum wählen":blockiert?"Speichern derzeit nicht möglich – siehe Hinweise oben":""}>{isAdmin?"Speichern":ohneGenehmigungspflicht(zielUser)?"Eintragen":"Beantragen"}</button><button style={S.canBtn} onClick={onClose}>Abbrechen</button></div>
      </div>
    </div>
  );
}

// ─── Print ────────────────────────────────────────────────────────────────────
function PrintKal({year,entries,profiles,state,stateName,onClose,useNewWindow=false}){
  const ps={
    wrap:{position:"fixed",inset:0,background:"#fff",color:"#111",fontFamily:"Arial,sans-serif",padding:7,zIndex:9999},
    grid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,height:"calc(100% - 52px)"},
    mo:{border:"1px solid #ccc",padding:3,display:"flex",flexDirection:"column"},
    mt:{fontSize:8,fontWeight:700,textAlign:"center",marginBottom:2,borderBottom:"1px solid #eee",paddingBottom:2,color:"#5a8a1f"},
    cg:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,flex:1},
    dh:{fontSize:6,fontWeight:700,color:"#888",textAlign:"center"},
    dc:{textAlign:"center",fontSize:6,minHeight:11,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:1},
    leg:{marginTop:4,display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"},
    li:{display:"flex",alignItems:"center",gap:3,fontSize:7},
    dot:{width:7,height:7,borderRadius:"50%"},
  };

  // Neue-Fenster-Modus: HTML in neuem Fenster öffnen und drucken
  useEffect(()=>{
    if(!useNewWindow)return;
    const w=window.open("about:blank","_kalender_"+Date.now(),"width=1200,height=800");
    if(!w)return;

    // Farbe zu rgba konvertieren (ohne nested template literals)
    function hexToRgba(hex,alpha){
      const r=parseInt(hex.slice(1,3),16);
      const g=parseInt(hex.slice(3,5),16);
      const b=parseInt(hex.slice(5,7),16);
      return "rgba("+r+","+g+","+b+","+alpha+")";
    }

    // Monate als HTML generieren
    const monthsHTML=MONTHS.map((mn,m)=>{
      const d=dimM(year,m),f=fwdM(year,m);
      const cells=[];
      for(let i=0;i<f;i++)cells.push(null);
      for(let x=1;x<=d;x++)cells.push(x);
      while(cells.length%7!==0)cells.push(null);

      const daysHTML=DAYS_SHORT.map(x=>'<div style="text-align:center;font-size:6px;font-weight:700;color:#888">'+x+'</div>').join("");

      const cellsHTML=cells.map(day=>{
        if(!day)return"<div></div>";
        const iso=toISO(year,m,day),wk=isWE(year,m,day);
        const fei=isFT(iso,state,year),fer=isFer(iso,state,year);
        const mk=entries.filter(e=>iso>=e.von&&iso<=e.bis).map(e=>{
          const p=profiles.find(x=>x.id===e.user_id)||e.profiles||{};
          return{color:p.color||"#5a8a1f"};
        });
        let bg="transparent",tc=wk?"#bbb":"#333";
        if(mk.length===1){bg=hexToRgba(mk[0].color,0.65);tc="#fff";}
        else if(mk.length>1){bg=hexToRgba(mk[0].color,0.5);tc="#fff";}
        else if(fei&&!fer){bg="#d4b896";tc="#5c3d1a";}
        else if(fer&&!fei){bg="#fce7f3";tc="#9d174d";}
        else if(fei&&fer){bg="linear-gradient(135deg,#fce7f3 50%,#d4b896 50%)";}
        return '<div style="text-align:center;font-size:6px;min-height:11px;display:flex;align-items:center;justify-content:center;border-radius:1px;background:'+bg+';color:'+tc+';font-weight:'+(mk.length?700:400)+'">'+day+'</div>';
      }).join("");

      return '<div style="border:1px solid #ccc;padding:3px;display:flex;flex-direction:column;">'
        +'<div style="font-size:8px;font-weight:700;text-align:center;margin-bottom:2px;border-bottom:1px solid #eee;padding-bottom:2px;color:#5a8a1f">'+mn+'</div>'
        +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;flex:1">'+daysHTML+cellsHTML+'</div>'
        +'</div>';
    }).join("");

    const usersLeg=profiles
      .filter(p=>entries.some(e=>e.user_id===p.id))
      .map(p=>'<div style="display:flex;align-items:center;gap:3px;font-size:7px"><div style="width:7px;height:7px;border-radius:50%;background:'+p.color+'"></div><span>'+p.vorname+' '+p.nachname+'</span></div>')
      .join("");

    const html='<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Urlaubsplan '+year+'</title>'
      +'<style>@page{size:A4 landscape;margin:6mm;}@media print{a[href]:after{content:none!important;}}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;}</style>'
      +'</head><body>'
      +'<div style="font-size:12px;font-weight:700;text-align:center;margin-bottom:4px">Urlaubsplan '+year+' · '+stateName+'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;height:calc(100vh - 40px)">'+monthsHTML+'</div>'
      +'<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">'
      +usersLeg
      +'<div style="display:flex;align-items:center;gap:3px;font-size:7px"><div style="width:7px;height:7px;border-radius:50%;background:#fce7f3;border:1px solid #f9a8d4"></div><span>Schulferien</span></div>'
      +'<div style="display:flex;align-items:center;gap:3px;font-size:7px"><div style="width:7px;height:7px;border-radius:50%;background:#d4b896;border:1px solid #c9a07a"></div><span>Feiertage</span></div>'
      +'</div>'
      +DRUCK_KNOEPFE
      +'<script>window.onload=function(){setTimeout(function(){try{window.print();}catch(e){}},400);}<'+'/script>'
      +'</body></html>';

    w.document.write(html);
    w.document.close();
    onClose?.();
  },[useNewWindow]);

  if(useNewWindow)return null;



  // Escape-Taste schließt Druckansicht
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose?.();};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);
  return(
    <div className="pt" style={ps.wrap}>
      <style>{`@page{size:A4 landscape!important;margin:6mm;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.no-print{display:none!important;}a[href]:after{content:none!important;}}`}</style>
      {/* Schließen-Button — nur auf Bildschirm, nicht im Druck */}
      <button className="no-print" onClick={()=>onClose?.()} style={{position:"fixed",top:8,right:12,background:"#dc2626",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:700,cursor:"pointer",zIndex:9999}}>✕ Schließen</button>
      <div style={{fontSize:11,fontWeight:700,textAlign:"center",marginBottom:4}}>Urlaubsplan {year} · {stateName}</div>
      <div style={ps.grid}>
        {MONTHS.map((mn,m)=>{
          const d=dimM(year,m),f=fwdM(year,m);
          const cells=[];for(let i=0;i<f;i++)cells.push(null);for(let x=1;x<=d;x++)cells.push(x);while(cells.length%7!==0)cells.push(null);
          return(
            <div key={m} style={ps.mo}><div style={ps.mt}>{mn}</div>
              <div style={ps.cg}>
                {DAYS_SHORT.map(x=><div key={x} style={ps.dh}>{x}</div>)}
                {cells.map((day,i)=>{
                  if(!day)return<div key={i}/>;
                  const iso=toISO(year,m,day),wk=isWE(year,m,day);
                  const fei=isFT(iso,state,year),fer=isFer(iso,state,year);
                  const mk=entries.filter(e=>iso>=e.von&&iso<=e.bis).map(e=>{const p=profiles.find(x=>x.id===e.user_id)||e.profiles||{};return{color:p.color||"#2563EB"};});
                  let bg="transparent",tc=wk?"#bbb":"#333";
                  if(mk.length===1){bg=ca(mk[0].color,0.65);tc="#fff";}
                  else if(mk.length>1){bg=ca(mk[0].color,0.5);tc="#fff";}
                  else if(fei&&!fer){bg="#d4b896";tc="#5c3d1a";}
                  else if(fer&&!fei){bg="#fce7f3";tc="#9d174d";}
                  else if(fei&&fer){bg="linear-gradient(135deg,#fce7f3 50%,#d4b896 50%)";}
                  return<div key={i} style={{...ps.dc,background:bg,color:tc,fontWeight:mk.length?700:400}}>{day}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={ps.leg}>
        {profiles.filter(p=>entries.some(e=>e.user_id===p.id)).map(p=><div key={p.id} style={ps.li}><div style={{...ps.dot,background:p.color||"#2563EB"}}/><span>{p.vorname} {p.nachname}</span></div>)}
        <div style={ps.li}><div style={{...ps.dot,background:"#fce7f3",border:"1px solid #f9a8d4"}}/><span>Schulferien</span></div>
        <div style={ps.li}><div style={{...ps.dot,background:"#d4b896",border:"1px solid #c9a07a"}}/><span>Feiertage</span></div>
      </div>
    </div>
  );
}
function PrintList({year,users,stateName,onClose}){
  const TL={urlaub:"Urlaub",resturlaub:"Resturlaub",ueberstunden:"Freizeitausgleich"};
  const ps={wrap:{position:"fixed",inset:0,background:"#fff",color:"#111",fontFamily:"Arial,sans-serif",padding:14,zIndex:9999},t:{width:"100%",borderCollapse:"collapse",fontSize:10},th:{textAlign:"left",padding:"4px 8px",background:"#f1f5f9",borderBottom:"1px solid #e2e8f0",fontWeight:600},td:{padding:"4px 8px",borderBottom:"1px solid #f8fafc"}};
  return(
    <div className="pt" style={ps.wrap}>
      <button className="no-print" onClick={()=>onClose?.()} style={{position:"fixed",top:8,right:12,background:"#dc2626",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:700,cursor:"pointer",zIndex:9999}}>✕ Schließen</button>
      <div style={{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:12}}>Urlaubsliste {year} · {stateName}</div>
      {users.map(u=>{const entries=u.entries||[];const urlU=eDays(entries,"urlaub",u)+eDays(entries,"resturlaub",u),ueU=eDays(entries,"ueberstunden",u);return(
        <div key={u.id} style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:12,padding:"5px 8px",background:"#f1f5f9",borderLeft:`3px solid ${u.color||"#2563EB"}`,marginBottom:4,display:"flex",justifyContent:"space-between"}}><span>{u.vorname} {u.nachname}</span><span style={{fontWeight:400,fontSize:10,color:"#555"}}>Urlaub: {fmtT(urlU)}/{u.urlaubstage||30} · ÜS: {fmtT(ueU)}/{u.ueberstunden||0}</span></div>
          <table style={ps.t}><thead><tr>{["Typ","Von","Bis","Tage","Status"].map(h=><th key={h} style={ps.th}>{h}</th>)}</tr></thead>
            <tbody>{[...entries].sort((a,b)=>a.von.localeCompare(b.von)).map(e=><tr key={e.id}><td style={ps.td}>{TL[e.type]||e.type}</td><td style={ps.td}>{fmtDE(e.von)}</td><td style={ps.td}>{fmtDE(e.bis)}</td><td style={ps.td}>{fmtT(countWD(e.von,e.bis))}</td><td style={ps.td}>{e.status}</td></tr>)}</tbody>
          </table>
        </div>
      );})}
    </div>
  );
}


// ─── Änderungsantrag Modal ────────────────────────────────────────────────────
function ChangeRequestModal({entry,year,onSave,onClose}){
  const[von,setVon]=useState(entry?.von||"");
  const[bis,setBis]=useState(entry?.bis||"");
  const[grund,setGrund]=useState("");
  const[busy,setBusy]=useState(false);
  const wd=countWD(von,bis);
  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>🔄 Änderungsantrag</span>
          <button style={S.clsBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.mBd}>
          <div style={{fontSize:13,color:"#5a6b4a",marginBottom:14,background:"#fff7ed",padding:"8px 12px",borderRadius:8,border:"1px solid #f0932b"}}>
            Aktuell bestätigt: <strong>{fmtDE(entry?.von)} – {fmtDE(entry?.bis)}</strong><br/>
            Bitte gib den gewünschten neuen Zeitraum an.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><label style={S.lbl}>Neues Von-Datum</label>
              <input style={S.inp} type="date" value={von} onChange={e=>{setVon(e.target.value);if(e.target.value>bis)setBis(e.target.value);}}/>
            </div>
            <div><label style={S.lbl}>Neues Bis-Datum</label>
              <input style={S.inp} type="date" value={bis} min={von} onChange={e=>setBis(e.target.value)}/>
            </div>
          </div>
          <div style={{marginBottom:12}}><label style={S.lbl}>Begründung (optional)</label>
            <input style={S.inp} value={grund} onChange={e=>setGrund(e.target.value)} placeholder="z.B. Familienurlaub verschoben"/>
          </div>
          <div style={{fontSize:13,color:"#5a6b4a",borderTop:"1px solid #edf5d8",paddingTop:8}}>
            Neuer Zeitraum: <strong style={{color:"#2d3a2e"}}>{fmtT(wd)} Arbeitstage</strong>
          </div>
          <div style={{fontSize:11,color:"#8aaa5f",marginTop:4}}>Der Änderungsantrag wird dem Administrator zur Genehmigung vorgelegt.</div>
        </div>
        <div style={S.mFt}>
          <button style={{...S.savBtn,opacity:busy?0.6:1}} disabled={busy} onClick={async()=>{
            if(!von||!bis||bis<von){alert("Bitte gültige Daten.");return;}
            setBusy(true);try{await onSave(von,bis,grund);}finally{setBusy(false);}
          }}>Änderung beantragen</button>
          <button style={S.canBtn} onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stornierungsantrag Modal ─────────────────────────────────────────────────
function DeleteRequestModal({entry,onSave,onClose}){
  const[grund,setGrund]=useState("");
  const[busy,setBusy]=useState(false);
  return(
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>✕ Stornierungsantrag</span>
          <button style={S.clsBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.mBd}>
          <div style={{fontSize:13,color:"#92400e",marginBottom:14,background:"#fff1f2",padding:"8px 12px",borderRadius:8,border:"1px solid #fca5a5"}}>
            Zeitraum: <strong>{fmtDE(entry?.von)} – {fmtDE(entry?.bis)}</strong>
          </div>
          <div style={{marginBottom:12}}><label style={S.lbl}>Begründung</label>
            <input style={S.inp} value={grund} onChange={e=>setGrund(e.target.value)} placeholder="Bitte begründe deinen Stornierungsantrag"/>
          </div>
          <div style={{fontSize:11,color:"#8aaa5f"}}>Der Antrag wird dem Administrator zur Genehmigung vorgelegt.</div>
        </div>
        <div style={S.mFt}>
          <button style={{...S.savBtn,background:"#dc2626",opacity:busy?0.6:1}} disabled={busy} onClick={async()=>{
            setBusy(true);try{await onSave(grund);}finally{setBusy(false);}
          }}>Stornierung beantragen</button>
          <button style={S.canBtn} onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}


// ─── Passwort-Reset Modal (für Dashboard-Anfragen) ───────────────────────────
function ResetPwModal({user,requestId,onDone,onClose}){
  const[pw,setPw]=useState(()=>generatePassword());
  const[busy,setBusy]=useState(false);
  const[done,setDone]=useState(false);
  const[err,setErr]=useState("");

  async function doReset(){
    if(pw.length<6){setErr("Mindestens 6 Zeichen.");return;}
    setBusy(true);setErr("");
    try{
      await adminResetPassword(user.id,pw);
      const text=`Hallo ${user.vorname},

dein Passwort für den TZ Westlausitz Urlaubsplaner wurde zurückgesetzt:

🌐 ${APP_URL}
📧 E-Mail: ${user.email}
🔑 Neues Passwort: ${pw}

Bitte ändere dein Passwort nach dem ersten Login unter „Profil".

Viele Grüße
Thomas Keilig`;
      try{await navigator.clipboard.writeText(text);}catch(e){
        const el=document.createElement("textarea");el.value=text;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);
      }
      setDone(true);
      onDone(requestId);
    }catch(e){setErr("Fehler: "+e.message);}
    finally{setBusy(false);}
  }

  return(
    <div style={S.overlay}>
      <div style={{...S.modal,width:460}}>
        <div style={S.mHd}>
          <span style={{fontWeight:800,fontSize:16,color:"#2d3a2e",fontFamily:"'Nunito',sans-serif"}}>🔑 Passwort zurücksetzen</span>
          <button style={S.clsBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.mBd}>
          {!done?(
            <>
              <div style={{background:"#fff7ed",border:"1px solid #f0932b",borderRadius:8,padding:"10px 12px",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:13,color:"#92400e"}}>Anfrage von: {user.vorname} {user.nachname}</div>
                <div style={{fontSize:12,color:"#b45309"}}>{user.email}</div>
              </div>
              <div style={{marginBottom:10}}>
                <label style={S.lbl}>Neues Passwort</label>
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1,background:"#f8faf0",border:"1.5px solid #5a8a1f",borderRadius:8,padding:"10px 14px",fontFamily:"monospace",fontSize:15,letterSpacing:"0.08em",color:"#2d3a2e",fontWeight:700}}>
                    {pw}
                  </div>
                  <button onClick={()=>setPw(generatePassword())}
                    style={{background:"#f8faf0",border:"1.5px solid #d5e8a0",borderRadius:8,padding:"10px 12px",cursor:"pointer",fontSize:18}} title="Neues generieren">
                    🔄
                  </button>
                </div>
              </div>
              {err&&<div style={{fontSize:12,color:"#f87171",background:"rgba(248,113,113,0.1)",padding:"8px 12px",borderRadius:6,marginBottom:8}}>{err}</div>}
              <div style={{fontSize:11,color:"#8aaa5f",marginBottom:12}}>
                Das Passwort wird gesetzt und der Nachrichtentext automatisch in die Zwischenablage kopiert.
              </div>
            </>
          ):(
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:36,marginBottom:10}}>✅</div>
              <div style={{fontWeight:700,fontSize:15,color:"#2d3a2e",marginBottom:6}}>Passwort zurückgesetzt!</div>
              <div style={{fontSize:13,color:"#5a6b4a",marginBottom:14}}>Nachrichtentext wurde kopiert — jetzt einfügen und an {user.vorname} senden.</div>
              <div style={{background:"#f8faf0",border:"1px solid #d5e8a0",borderRadius:8,padding:"10px",fontFamily:"monospace",fontSize:14,fontWeight:700,color:"#2d3a2e"}}>
                {pw}
              </div>
            </div>
          )}
        </div>
        <div style={S.mFt}>
          {!done?(
            <>
              <button style={{...S.savBtn,opacity:busy?0.6:1,flex:1}} onClick={doReset} disabled={busy}>
                {busy?"Wird gesetzt…":"Passwort setzen & Nachricht kopieren 📋"}
              </button>
              <button style={S.canBtn} onClick={onClose}>Abbrechen</button>
            </>
          ):(
            <button style={{...S.savBtn,width:"100%"}} onClick={onClose}>Schließen</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// ─── TZ Westlausitz Farbpalette ───────────────────────────────────────────────
// Primär: Grün #3d7a4f / #5a9e6f  Akzent: Hellgrün #7cbd8f
// Hintergrund: Hellgrau-Grün #f0f4f0  Text: Dunkelgrau #2d3a2e
// Cards: Weiß #ffffff  Border: #d4e6d8
const S={
  app:{minHeight:"100vh",background:"#f5f8ec",display:"flex",flexDirection:"column"},
  header:{background:"linear-gradient(135deg,#5a8a1f 0%,#6a9e2f 100%)",borderBottom:"none",padding:"0 24px",display:"flex",justifyContent:"space-between",alignItems:"stretch",flexWrap:"wrap",gap:0,boxShadow:"0 2px 12px rgba(61,122,79,0.25)"},
  hL:{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",padding:"12px 0"},
  hR:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",padding:"12px 0"},
  logoTxt:{fontSize:16,fontWeight:800,color:"#ffffff",letterSpacing:"-0.01em",fontFamily:"'Nunito',sans-serif"},
  logoSub:{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:500},
  yearCtrl:{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 8px",border:"1px solid rgba(255,255,255,0.2)"},
  yBtn:{background:"none",border:"none",color:"#fff",fontSize:20,padding:"0 4px",lineHeight:1,cursor:"pointer"},
  yLbl:{fontSize:17,fontWeight:700,color:"#fff",minWidth:54,textAlign:"center"},
  blSel:{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",outline:"none"},
  uBadge:{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"6px 12px",border:"1px solid rgba(255,255,255,0.2)"},
  av:{width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",flexShrink:0,fontSize:14},
  pBtn:{background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer"},
  nav:{background:"#ffffff",borderBottom:"1px solid #d4e6d8",padding:"0 24px",display:"flex",alignItems:"center",gap:2,overflowX:"auto",boxShadow:"0 1px 4px rgba(61,122,79,0.08)"},
  navBtn:{background:"none",border:"none",color:"#5a6b4a",padding:"13px 14px",fontSize:13,fontWeight:600,borderBottom:"3px solid transparent",whiteSpace:"nowrap",cursor:"pointer",transition:"color .15s"},
  navAct:{color:"#5a8a1f",borderBottom:"3px solid #5a8a1f"},
  pendBadge:{background:"#fef3c7",color:"#92400e",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,marginLeft:6,border:"1px solid #fde68a"},
  legend:{marginLeft:"auto",display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",paddingLeft:12},
  legRow:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"},
  legItem:{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#5a6b4a"},
  legDot:{width:9,height:9,borderRadius:"50%"},
  notif:{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",borderRadius:10,padding:"11px 22px",zIndex:2500,fontSize:13,boxShadow:"0 8px 32px rgba(61,122,79,0.2)",maxWidth:"90vw",textAlign:"center",border:"1px solid",fontWeight:500},
  main:{flex:1,padding:20,overflowY:"auto"},
  mCard:{background:"#ffffff",borderRadius:12,padding:12,border:"1px solid #d5e8a0",boxShadow:"0 2px 8px rgba(61,122,79,0.06)"},
  mTitle:{fontSize:11,fontWeight:700,color:"#6a9e2f",marginBottom:7,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.08em"},
  cGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2},
  dHd:{textAlign:"center",fontSize:8,fontWeight:700,color:"#8aaa5f",padding:"3px 0"},
  dCell:{textAlign:"center",padding:"2px 0",borderRadius:3,minHeight:22,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},
  card:{background:"#ffffff",borderRadius:14,padding:20,border:"1px solid #d5e8a0",boxShadow:"0 2px 10px rgba(61,122,79,0.07)"},
  pgT:{fontSize:20,fontWeight:800,color:"#2d3a2e",marginBottom:18,fontFamily:"'Nunito',sans-serif"},
  addBtn:{background:"#5a8a1f",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 6px rgba(61,122,79,0.25)"},
  icnBtn:{background:"#f5f8ec",border:"1px solid #d5e8a0",color:"#6a9e2f",borderRadius:6,padding:"4px 8px",fontSize:13,cursor:"pointer"},
  th:{textAlign:"left",padding:"10px 14px",fontSize:11,fontWeight:700,color:"#5a6b4a",textTransform:"uppercase",letterSpacing:"0.05em",background:"#f8faf0"},
  td:{padding:"10px 14px",fontSize:13,color:"#2d3a2e",borderBottom:"1px solid #edf5ee"},
  overlay:{position:"fixed",inset:0,background:"rgba(45,58,46,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1500,backdropFilter:"blur(4px)",padding:12,boxSizing:"border-box"},
  modal:{background:"#ffffff",borderRadius:16,width:500,maxWidth:"95vw",border:"1px solid #d5e8a0",
    boxShadow:"0 20px 60px rgba(61,122,79,0.18)",
    // Nie höher als der Bildschirm — sonst rutschen die Knöpfe unerreichbar nach unten
    maxHeight:"calc(100dvh - 24px)",display:"flex",flexDirection:"column",overflow:"hidden"},
  mHd:{padding:"18px 22px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #edf5ee",flexShrink:0},
  mBd:{padding:"18px 22px",overflowY:"auto",WebkitOverflowScrolling:"touch",flex:"1 1 auto",minHeight:0},
  mFt:{padding:"14px 22px 18px",display:"flex",gap:10,borderTop:"1px solid #edf5ee",flexShrink:0,background:"#fff"},
  inp:{width:"100%",background:"#f8faf0",border:"1.5px solid #c8d890",borderRadius:8,padding:"9px 12px",color:"#2d3a2e",fontSize:13,outline:"none",boxSizing:"border-box",transition:"border .15s"},
  dateInp:{width:"100%",background:"#f8faf0",border:"1.5px solid #c8d890",borderRadius:8,padding:"7px 10px",color:"#2d3a2e",fontSize:13,lineHeight:1.2,height:38,outline:"none",boxSizing:"border-box",textAlign:"left",WebkitAppearance:"none",appearance:"none",fontFamily:"inherit"},
  lbl:{display:"block",fontSize:11,fontWeight:700,color:"#5a6b4a",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"},
  savBtn:{background:"#5a8a1f",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:"0 2px 6px rgba(61,122,79,0.25)"},
  canBtn:{background:"#f5f8ec",color:"#5a6b4a",border:"1px solid #d5e8a0",borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontWeight:600},
  clsBtn:{background:"none",border:"none",color:"#8aaa5f",fontSize:20,lineHeight:1,padding:"2px 6px",cursor:"pointer"},
  tabTgl:{background:"none",border:"none",color:"#8aaa5f",padding:"7px 13px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"},
  tabTglAct:{background:"#e8f5eb",color:"#5a8a1f",fontWeight:700},
};
