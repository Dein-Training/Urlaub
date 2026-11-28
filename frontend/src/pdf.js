// ═════════════════════════════════════════════════════════════════════════════
// PDF-Erzeugung ohne fremde Bausteine
//
// Warum selbst gebaut? Im App-Modus (vom Startbildschirm geöffnet) gibt es auf
// iPad und iPhone kein Druckmenü. window.print() bleibt dort wirkungslos, und
// ein zweites Fenster lässt sich gar nicht erst öffnen. Deshalb entsteht die
// PDF-Datei hier direkt im Programm und wird anschließend über das Teilen-Menü
// in „Dateien“ gesichert oder heruntergeladen.
//
// Es werden nur die beiden Standardschriften Helvetica und Helvetica-Bold
// verwendet. Die sind in jedem PDF-Betrachter fest eingebaut, dadurch bleibt
// die Datei klein und es muss keine Schrift mitgeliefert werden.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Seitenmaße und Farben ───────────────────────────────────────────────────
const BREITE = 595.28;        // A4 hoch, in Punkt (72 pt = 1 Zoll)
const HOEHE  = 841.89;
const RAND   = 40;
const INHALT = BREITE - 2 * RAND;

const GRUEN      = [0.35, 0.54, 0.12];   // Hausfarbe
const GRUEN_HELL = [0.96, 0.97, 0.93];
const GRAU       = [0.42, 0.42, 0.42];
const SCHWARZ    = [0.13, 0.13, 0.13];
const LINIE      = [0.91, 0.94, 0.91];
const ROT        = [0.86, 0.15, 0.15];

// ─── Text in die Kodierung des PDF bringen ───────────────────────────────────
// Die Standardschriften erwarten WinAnsi. Für Deutsch deckt sich das fast
// vollständig mit Latin-1; nur die Zeichen zwischen 128 und 159 weichen ab.
const SONDERZEICHEN = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84,
  "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88,
  "‰": 0x89, "Š": 0x8A, "‹": 0x8B, "Œ": 0x8C,
  "Ž": 0x8E, "‘": 0x91, "’": 0x92, "“": 0x93,
  "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B,
  "œ": 0x9C, "ž": 0x9E, "Ÿ": 0x9F,
};

function kodiere(text) {
  let aus = "";
  for (const z of String(text == null ? "" : text)) {
    const sonder = SONDERZEICHEN[z];
    if (sonder !== undefined) { aus += String.fromCharCode(sonder); continue; }
    const code = z.charCodeAt(0);
    // Alles jenseits von Latin-1 (etwa Emoji) kann die Schrift nicht zeigen
    aus += code < 256 ? z : "?";
  }
  // Klammern und Rückstriche haben im PDF eine eigene Bedeutung
  return aus.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// ─── Breite eines Textes abschätzen ──────────────────────────────────────────
// Die genauen Zeichenbreiten der Helvetica stehen in der Schrift selbst. Für
// das Kürzen zu langer Zellen genügt ein Mittelwert je Zeichenklasse.
function textBreite(text, groesse, fett) {
  let summe = 0;
  for (const z of String(text || "")) {
    if ("iljtfIr.,;:'|!".includes(z)) summe += 0.31;
    else if ("mwMW".includes(z))      summe += 0.86;
    else if (z === " ")               summe += 0.28;
    else if (z >= "A" && z <= "Z")    summe += 0.69;
    else                              summe += 0.55;
  }
  return summe * groesse * (fett ? 1.05 : 1);
}

function kuerze(text, maxBreite, groesse, fett) {
  let t = String(text == null ? "" : text);
  if (textBreite(t, groesse, fett) <= maxBreite) return t;
  while (t.length > 1 && textBreite(t + "...", groesse, fett) > maxBreite) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

// ─── Zeichenbefehle für eine Seite sammeln ───────────────────────────────────
function neueSeite() {
  return { befehle: [] };
}

function farbe(f) { return f[0] + " " + f[1] + " " + f[2]; }

// y wird von oben gemessen — das liest sich beim Aufbau der Seite leichter.
function kasten(seite, x, yVonOben, breite, hoehe, fuellung, rahmen) {
  const y = HOEHE - yVonOben - hoehe;
  if (fuellung) {
    seite.befehle.push(farbe(fuellung) + " rg " + x + " " + y + " " + breite + " " + hoehe + " re f");
  }
  if (rahmen) {
    seite.befehle.push(farbe(rahmen) + " RG 0.7 w " + x + " " + y + " " + breite + " " + hoehe + " re S");
  }
}

function linie(seite, x1, yVonOben, x2, staerke, f) {
  const y = HOEHE - yVonOben;
  seite.befehle.push(farbe(f) + " RG " + staerke + " w " + x1 + " " + y + " m " + x2 + " " + y + " l S");
}

// ausrichtung: "links" (Vorgabe), "mitte", "rechts"
function schrift(seite, text, x, yVonOben, groesse, f, fett, ausrichtung, maxBreite) {
  let t = String(text == null ? "" : text);
  if (maxBreite) t = kuerze(t, maxBreite, groesse, fett);
  let px = x;
  if (ausrichtung === "mitte")  px = x - textBreite(t, groesse, fett) / 2;
  if (ausrichtung === "rechts") px = x - textBreite(t, groesse, fett);
  const y = HOEHE - yVonOben - groesse;
  seite.befehle.push(
    "BT /" + (fett ? "F2" : "F1") + " " + groesse + " Tf " +
    farbe(f) + " rg " + px.toFixed(2) + " " + y.toFixed(2) + " Td (" + kodiere(t) + ") Tj ET"
  );
}

// ─── Die fertigen Seiten zu einer PDF-Datei zusammensetzen ───────────────────
function baueDatei(seiten, titel) {
  const obj = [];                      // obj[i] ist das Objekt mit der Nummer i+1
  const seitenErstesObjekt = 5;        // 1 Katalog, 2 Seitenbaum, 3+4 Schriften
  const seitenIds = seiten.map((_, i) => seitenErstesObjekt + i * 2);

  obj.push("<< /Type /Catalog /Pages 2 0 R >>");
  obj.push("<< /Type /Pages /Kids [" + seitenIds.map(n => n + " 0 R").join(" ") + "] /Count " + seiten.length + " >>");
  obj.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  obj.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  seiten.forEach((s, i) => {
    const inhaltId = seitenIds[i] + 1;
    obj.push(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + BREITE + " " + HOEHE + "] " +
      "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + inhaltId + " 0 R >>"
    );
    const strom = s.befehle.join("\n");
    obj.push("<< /Length " + strom.length + " >>\nstream\n" + strom + "\nendstream");
  });

  // Angaben zum Dokument, damit im Betrachter ein sinnvoller Name steht
  const infoId = obj.length + 1;
  obj.push("<< /Title (" + kodiere(titel) + ") /Producer (Urlaubsplaner) /Creator (Urlaubsplaner) >>");

  let datei = "%PDF-1.4\n";
  const stellen = [];
  obj.forEach((inhalt, i) => {
    stellen.push(datei.length);
    datei += (i + 1) + " 0 obj\n" + inhalt + "\nendobj\n";
  });

  const xrefStelle = datei.length;
  datei += "xref\n0 " + (obj.length + 1) + "\n";
  datei += "0000000000 65535 f \n";
  for (const stelle of stellen) {
    datei += String(stelle).padStart(10, "0") + " 00000 n \n";
  }
  datei += "trailer\n<< /Size " + (obj.length + 1) + " /Root 1 0 R /Info " + infoId + " 0 R >>\n";
  datei += "startxref\n" + xrefStelle + "\n%%EOF";

  const bytes = new Uint8Array(datei.length);
  for (let i = 0; i < datei.length; i++) bytes[i] = datei.charCodeAt(i) & 0xff;
  return bytes;
}

// ═════════════════════════════════════════════════════════════════════════════
// Urlaubsübersicht als PDF
//
// daten = {
//   firma, titel, mitarbeiter, position, erstellt,
//   hinweis,                             // optional, z. B. Hinweis Pauschalkraft
//   summen:  [{wert, text, warnung}],    // bis zu drei Kästen
//   spalten: ["Typ","Von", …],
//   breiten: [85, 85, …],                // Anteile, werden umgerechnet
//   zeilen:  [["Urlaub","11.5.2027", …]],
//   status:  ["ok","offen", …]           // je Zeile, färbt die letzte Spalte
// }
// ═════════════════════════════════════════════════════════════════════════════
export function urlaubsUebersichtPdf(daten) {
  const spalten = daten.spalten || [];
  const roh = daten.breiten || spalten.map(() => 1);
  const summeRoh = roh.reduce((a, b) => a + b, 0) || 1;
  const breiten = roh.map(b => (b / summeRoh) * INHALT);
  const xVon = [];
  let lauf = RAND;
  for (const b of breiten) { xVon.push(lauf); lauf += b; }

  const ZEILE_H = 17;
  const seiten = [];
  let seite = null;
  let y = 0;

  function kopf(erste) {
    seite = neueSeite();
    seiten.push(seite);
    y = RAND;

    schrift(seite, daten.firma || "", RAND, y, 13, GRUEN, true);
    schrift(seite, daten.titel || "", BREITE - RAND, y + 1, 11, GRAU, false, "rechts");
    y += 20;
    linie(seite, RAND, y, BREITE - RAND, 1.6, GRUEN);
    y += 14;

    if (!erste) {
      schrift(seite, "Fortsetzung", RAND, y, 8.5, GRAU, false);
      y += 16;
      tabellenKopf();
      return;
    }

    // Angaben zur Person
    kasten(seite, RAND, y, INHALT, 26, GRUEN_HELL, null);
    kasten(seite, RAND, y, 3, 26, GRUEN, null);
    const zeile =
      "Mitarbeiter: " + (daten.mitarbeiter || "") +
      "   |   Position: " + (daten.position || "") +
      "   |   Erstellt: " + (daten.erstellt || "");
    schrift(seite, zeile, RAND + 12, y + 9, 9, SCHWARZ, false, "links", INHALT - 24);
    y += 38;

    if (daten.hinweis) {
      schrift(seite, daten.hinweis, RAND, y, 9, GRAU, false, "links", INHALT);
      y += 18;
    }

    // Kennzahlen
    const summen = (daten.summen || []).slice(0, 3);
    if (summen.length) {
      const luecke = 10;
      const kb = (INHALT - luecke * (summen.length - 1)) / summen.length;
      summen.forEach((s, i) => {
        const x = RAND + i * (kb + luecke);
        kasten(seite, x, y, kb, 50, GRUEN_HELL, [0.84, 0.91, 0.63]);
        schrift(seite, s.wert, x + kb / 2, y + 9, 19, s.warnung ? ROT : GRUEN, true, "mitte");
        schrift(seite, s.text, x + kb / 2, y + 34, 8, GRAU, false, "mitte", kb - 8);
      });
      y += 64;
    }

    tabellenKopf();
  }

  function tabellenKopf() {
    kasten(seite, RAND, y, INHALT, 19, GRUEN, null);
    spalten.forEach((s, i) => {
      const mitte = s === "Tage";
      const x = mitte ? xVon[i] + breiten[i] / 2 : xVon[i] + 7;
      schrift(seite, s, x, y + 5.5, 8.5, [1, 1, 1], true, mitte ? "mitte" : "links", breiten[i] - 12);
    });
    y += 19;
  }

  // Freier Platz bis zur Fußzeile
  function platzFrei() {
    return HOEHE - RAND - 38 - y;
  }

  kopf(true);

  const zeilen = daten.zeilen || [];
  if (!zeilen.length) {
    schrift(seite, "Für dieses Jahr ist kein Urlaub eingetragen.", RAND + 7, y + 8, 9, GRAU, false);
    y += ZEILE_H + 10;
  }

  zeilen.forEach((zeile, nr) => {
    if (platzFrei() < ZEILE_H) { kopf(false); }
    if (nr % 2 === 1) kasten(seite, RAND, y, INHALT, ZEILE_H, [0.98, 0.99, 0.96], null);
    zeile.forEach((zelle, i) => {
      const mitte = spalten[i] === "Tage";
      const fett = mitte;
      let f = SCHWARZ;
      if (i === zeile.length - 1) {
        f = (daten.status || [])[nr] === "offen" ? [0.57, 0.25, 0.05] : [0.08, 0.47, 0.17];
      }
      const x = mitte ? xVon[i] + breiten[i] / 2 : xVon[i] + 7;
      schrift(seite, zelle, x, y + 4.5, 8.5, f, fett, mitte ? "mitte" : "links", breiten[i] - 12);
    });
    linie(seite, RAND, y + ZEILE_H, BREITE - RAND, 0.6, LINIE);
    y += ZEILE_H;
  });

  // Die Unterschriften brauchen zusammenhängenden Platz. Reicht er auf der
  // letzten Seite nicht mehr, kommen sie auf eine eigene Seite.
  if (platzFrei() < 128) kopf(false);
  y = HOEHE - RAND - 118;
  const sb = (INHALT - 48) / 2;
  [
    ["Ort, Datum, Unterschrift Mitarbeiter", "Ich bestätige die Richtigkeit meiner Urlaubsangaben."],
    ["Unterschrift Praxisleitung", "Genehmigt durch die Praxisleitung."],
  ].forEach(([oben, unten], i) => {
    const x = RAND + i * (sb + 48);
    linie(seite, x, y, x + sb, 1.1, [0.2, 0.2, 0.2]);
    schrift(seite, oben, x, y + 7, 8.5, SCHWARZ, false, "links", sb);
    schrift(seite, unten, x, y + 20, 7.5, GRAU, false, "links", sb);
  });

  // Fußzeile mit Seitenzahl — erst jetzt, da die Seitenanzahl feststeht
  seiten.forEach((s, i) => {
    linie(s, RAND, HOEHE - RAND - 26, BREITE - RAND, 0.6, LINIE);
    schrift(s, (daten.firma || "") + "  ·  Urlaubsplaner  ·  Erstellt am " + (daten.erstellt || ""),
            RAND, HOEHE - RAND - 18, 7.5, [0.67, 0.67, 0.67], false, "links", INHALT - 110);
    schrift(s, "Seite " + (i + 1) + " von " + seiten.length,
            BREITE - RAND, HOEHE - RAND - 18, 7.5, [0.67, 0.67, 0.67], false, "rechts");
  });

  const bytes = baueDatei(seiten, daten.titel || "Urlaubsübersicht");
  return new Blob([bytes], { type: "application/pdf" });
}

// ═════════════════════════════════════════════════════════════════════════════
// Die fertige Datei an den Benutzer übergeben
//
// Drei Wege, in dieser Reihenfolge:
//   1. Teilen-Menü — auf iPad und iPhone der einzige Weg, der im App-Modus
//      zuverlässig funktioniert („In Dateien sichern“, Mail, Drucken).
//   2. Download — am Rechner der gewohnte Weg.
//   3. Neues Fenster — falls beides nicht geht.
// ═════════════════════════════════════════════════════════════════════════════
export async function pdfAusgeben(blob, dateiname) {
  try {
    const datei = new File([blob], dateiname, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [datei] })) {
      await navigator.share({ files: [datei], title: dateiname });
      return "geteilt";
    }
  } catch (e) {
    // Hat der Benutzer das Teilen-Menü abgebrochen, ist nichts weiter zu tun
    if (e && (e.name === "AbortError" || e.name === "NotAllowedError")) return "abgebrochen";
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = dateiname;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return "geladen";
  } catch (e) { /* weiter zum letzten Weg */ }

  try {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return "geoeffnet";
  } catch (e) {
    return "fehler";
  }
}
