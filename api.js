/**
 * All network access lives here. The Gemini API key never touches the
 * browser: it is entered once in Settings, sent to the FastAPI backend via
 * POST /api/config, and stored server-side per tenant. Every call to our
 * own /api/* endpoints carries the user's Supabase access token so the
 * backend knows which tenant it's acting on behalf of (see backend/app/auth.py).
 */
import { BACKEND_URL } from "./config.js";
import { getAccessToken } from "./auth.js";

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch (_) {
    return {};
  }
}

async function authFetch(path, options = {}) {
  const token = await getAccessToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}

/**
 * Whether a Gemini key is currently configured for this tenant, plus
 * whether the backend answered at all - `backendAvailable: false` lets the
 * UI distinguish "no key saved yet" from "backend unreachable" (e.g. the
 * Render service is down, misconfigured, or BACKEND_URL in config.js is
 * still the placeholder value).
 */
export async function apiGetConfigStatus() {
  try {
    const res = await authFetch("/api/config/status");
    if (!res.ok) return { configured: false, backendAvailable: false };
    const data = await res.json().catch(() => null);
    if (!data || typeof data.configured !== "boolean") {
      return { configured: false, backendAvailable: false };
    }
    return { configured: data.configured, backendAvailable: true };
  } catch (_) {
    return { configured: false, backendAvailable: false };
  }
}

/** Persists a new Gemini API key for this tenant on the backend. */
export async function apiSaveConfig(apiKey) {
  const res = await authFetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP-Fehler ${res.status}`);
  return data;
}

/** Removes the stored Gemini API key for this tenant. */
export async function apiClearConfig() {
  const res = await authFetch("/api/config/clear", { method: "POST" });
  return readJsonSafe(res);
}

/** Lists Gemini models usable with this tenant's configured key. */
export async function apiListModels() {
  const res = await authFetch("/api/models");
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP-Fehler ${res.status}`);
  return data.models || [];
}

/**
 * Runs a single-shot Gemini generateContent call through the backend proxy.
 * Model fallback (e.g. to gemini-1.5-flash on failure) is handled server-side.
 */
export async function apiGenerate(prompt, model) {
  const res = await authFetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP-Fehler ${res.status}`);
  if (!data.text) throw new Error("Ungültige Antwort von der Gemini API erhalten.");
  return data.text;
}

/** Scrapes a product URL server-side (SSRF-guarded) and returns plain text. */
export async function apiScrape(url) {
  const res = await authFetch(`/api/scrape?url=${encodeURIComponent(url)}`);
  if (!res.ok) return "";
  const data = await readJsonSafe(res);
  return data.text || "";
}

/**
 * Generates a single image via the backend's Gemini image proxy and returns
 * a ready-to-use data: URL. Note: image generation is not enabled for every
 * Gemini API key/account tier, so callers should show `err.message` to the
 * user rather than assuming this always succeeds.
 */
export async function apiGenerateImage(prompt) {
  const res = await authFetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP-Fehler ${res.status}`);
  if (!data.imageBase64) throw new Error("Ungültige Antwort von der Gemini API erhalten.");
  return `data:image/png;base64,${data.imageBase64}`;
}

/**
 * Parses the Gemini response using the custom module markers
 */
export function parseGeminiResponse(rawText) {
  const data = {
    modules: {
      module1: "",
      module_fit: "",
      module2: "",
      module3: ""
    },
    emails: [],
    objections: [],
    followup: [],
    roi_defaults: {
      ek: 40,
      uvp: 99,
      monthly_qty: 300,
      pos_boost: 30,
      cross_selling: 10
    }
  };

  // Extract ROI defaults using Regex
  const roiMatch = rawText.match(/ROI_DEFAULTS:\s*ek=(\d+),\s*uvp=(\d+),\s*monthly_qty=(\d+),\s*pos_boost=(\d+),\s*cross_selling=(\d+)/);
  if (roiMatch) {
    data.roi_defaults.ek = parseInt(roiMatch[1]);
    data.roi_defaults.uvp = parseInt(roiMatch[2]);
    data.roi_defaults.monthly_qty = parseInt(roiMatch[3]);
    data.roi_defaults.pos_boost = parseInt(roiMatch[4]);
    data.roi_defaults.cross_selling = parseInt(roiMatch[5]);
  }

  // Split raw text based on module markers
  const sections = {};
  const markerRegex = /===(MODULE1|MODULE_FIT|MODULE2|MODULE3|EMAIL_A|EMAIL_B|EMAIL_C|QUESTIONS|OBJECTIONS|FOLLOWUP)===/g;

  let match;
  let lastIndex = 0;
  let lastKey = null;

  while ((match = markerRegex.exec(rawText)) !== null) {
    if (lastKey) {
      sections[lastKey] = rawText.substring(lastIndex, match.index).trim();
    }
    lastKey = match[1];
    lastIndex = markerRegex.lastIndex;
  }
  if (lastKey) {
    sections[lastKey] = rawText.substring(lastIndex).trim();
  }

  // Map basic text modules
  data.modules.module1 = sections["MODULE1"] || "Keine Daten.";
  data.modules.module_fit = sections["MODULE_FIT"] || "Keine Daten.";

  // Clean ROI_DEFAULTS line out of Module 2 if it's there
  let mod2Text = sections["MODULE2"] || "Keine Daten.";
  mod2Text = mod2Text.replace(/ROI_DEFAULTS:[^\n]+/g, "").trim();
  data.modules.module2 = mod2Text;

  data.modules.module3 = sections["MODULE3"] || "Keine Daten.";

  // Parse Option A, B, C Emails
  const parseEmail = (secKey, optLetter, defaultType) => {
    const text = sections[secKey];
    if (!text) return;

    const subjectMatch = text.match(/Betreff:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : "Outreach-Kontakt";

    // Clean subject line out of body
    let body = text.replace(/Betreff:\s*.+/i, "").replace(/Option\s+[A-C]:[^\n]+/i, "").trim();

    data.emails.push({
      option: optLetter,
      type: defaultType,
      subject: subject,
      body: body
    });
  };

  parseEmail("EMAIL_A", "A", "Nutzen- & Problemfokus");
  parseEmail("EMAIL_B", "B", "Case Study / Social Proof");
  parseEmail("EMAIL_C", "C", "Soft Outreach / Beziehungsaufbau");

  // Questions and closing strategy will be prepended to Tab 5 content
  const questionsText = sections["QUESTIONS"] || "";

  // Parse Objections EINWAND: / KONTER:
  const objectionsText = sections["OBJECTIONS"] || "";
  const objectionRegex = /EINWAND:\s*(.+)\n+KONTER:\s*((?:(?!EINWAND:).|\n)+)/gi;
  let objMatch;

  while ((objMatch = objectionRegex.exec(objectionsText)) !== null) {
    data.objections.push({
      title: objMatch[1].trim(),
      content: objMatch[2].trim()
    });
  }

  // Parse Followup Timeline SCHRITT: / AKTION:
  const followupText = sections["FOLLOWUP"] || "";
  const followupRegex = /SCHRITT:\s*Tag\s*(\d+)\s*-\s*(.+)\n+AKTION:\s*((?:(?!SCHRITT:).|\n)+)/gi;
  let followMatch;

  while ((followMatch = followupRegex.exec(followupText)) !== null) {
    data.followup.push({
      day: `Tag ${followMatch[1]}`,
      title: followMatch[2].trim(),
      content: followMatch[3].trim()
    });
  }

  // Store raw questions text; rendering (with escaping) happens at display time
  data.questions_raw = questionsText;

  return data;
}

/**
 * Builds the main sales-strategist prompt sent to /api/generate.
 */
export function buildStrategistPrompt(industry, product, scrapedText) {
  let urlPromptText = "";
  if (scrapedText) {
    urlPromptText = `\n- ZUSÄTZLICHER WEBSITE-TEXT ZUM PRODUKT:\n\"\"\"\n${scrapedText}\n\"\"\"\nHINWEIS ZUM WEBSITE-TEXT: Bitte analysiere diesen live ausgelesenen Text des Produkts sehr genau. Nimm die exakten Features, Alleinstellungsmerkmale, Anwendungsbeispiele und das Nutzenversprechen als reale Faktenbasis für deine B2B-Bedarfsanalyse und das Vertriebskonzept.`;
  }

  return `Du bist die weltbeste KI-Vertriebsstrategin und B2B-Marktanalystin.
Deine Aufgabe ist es, für folgende Eingaben eine hochpräzise Bedarfsermittlung, eine Validierung der Markttauglichkeit und ein interaktives B2B-Verkaufskonzept (Sales Enablement Cockpit) zu entwickeln.

EINGABEDATEN:
- Branche / Zielmarkt: ${industry}
- Produkt / Dienstleistung / Portfolio: ${product}${urlPromptText}
- Geschäftsmodell: B2B
- Aktuelles Kalenderjahr der Suchanfrage: 2026. Alle gelieferten Daten, Marktprognosen, Branchenstatistiken und Kampagneninformationen müssen zwingend auf dem aktuellen Stand von 2026 (oder neuer) sein und dürfen keinesfalls älter als 2026 sein.

WICHTIGE ANWEISUNG:
Teile deine Antwort exakt in Abschnitte auf, die mit den Markern ===MODULE1===, ===MODULE_FIT===, ===MODULE2===, ===MODULE3===, ===EMAIL_A===, ===EMAIL_B===, ===EMAIL_C===, ===QUESTIONS===, ===OBJECTIONS=== und ===FOLLOWUP=== beginnen. Gib keinen Text vor dem ersten Marker aus. Verwende exakt diese Struktur im Markdown-Format:

===MODULE1===
### MODUL 1: BEDARFSERMITTLUNG & SCHMERZPUNKTE (PAIN POINTS)
* **Status Quo der Branche:** [Die 3 größten Herausforderungen / Engpässe dieser Branche mit Bulletpoints]
* **Problem-Markt-Fit:** [Welches konkrete, teure Problem löst das Produkt/die Dienstleistung bei der Zielgruppe?]
* **Triggermomente (Wann kauft der Kunde?):** [Welche Ereignisse lösen bei der Zielgruppe den akuten Bedarf aus?]

===MODULE_FIT===
### MODUL 2: PRODUKT-BRANCHEN-FIT (EIGNUNGS-ARGUMENTE)
[Liste 4-5 starke Argumente auf, warum dieses Produkt optimal zur Branche passt. Formatiere die Titel fett, z.B. * **Argument 1: [Titel]** \\n [Erklärung]]

===MODULE2===
### MODUL 3: BRAUCHBARKEIT & MARKTVALIDIERUNG (EVALUATION)
* **Brauchbarkeits-Score (1–10):** Wie hoch ist der unmittelbare Nutzwert des Produkts für diese Branche? (Schreibe genau 'Brauchbarkeits-Score: X / 10' mit einer Zahl X von 1 bis 10 und einer kurzen Begründung).
* **ROI- & Wert-Argumentation:** [Wie lässt sich der Nutzen in Geld, Zeitersparnis oder Risikominimierung ausdrücken?]

ROI_DEFAULTS: ek=[Empfohlener Einkaufspreis für das Händler-Produkt in Euro, z.B. 40], uvp=[Empfohlener Verkaufspreis/UVP für Endkunden in Euro, z.B. 99], monthly_qty=[Typische Absatzmenge eines Händlers pro Monat, z.B. 300], pos_boost=[Erwarteter Absatz-Steigerungs-Prozentsatz durch POS-Präsentation/Aufsteller, z.B. 30], cross_selling=[Typischer Zusatzumsatz durch Zubehör/Cross-Selling pro Kauf in Euro, z.B. 10]

===MODULE3===
### MODUL 4: STRATEGISCHES SALES- & GO-TO-MARKET-KONZEPT
* **Ideal Customer Profile (ICP):** [Wer genau ist der Entscheider (Rolle, Prioritäten, Motivationsfaktoren)?]
* **Positionierung / Hook:** [Ein knackiger 1-Satz-Pitch (Elevator Pitch) in Kursivschrift, der sofort Neugier weckt.]
* **Empfohlener Vertriebskanal:** [Welcher Vertriebsansatz funktioniert hier am besten?]

===EMAIL_A===
Option A: Nutzen- & Problemfokus
Betreff: [Eingängiger Betreff]
[Sehr kurzes Akquisitions-E-Mail-Template. Schreibe im Blockquote-Format (jede Zeile mit '>' beginnen). Nutze Platzhalter wie [Nachname], [Firmenname] und [Ihr Name]]

===EMAIL_B===
Option B: Case Study / Social Proof
Betreff: [Eingängiger Betreff]
[Sehr kurzes Kaltakquise-Template mit Fokus auf Glaubwürdigkeit/Case Study. Im Blockquote-Format (jede Zeile mit '>' beginnen). Nutze Platzhalter]

===EMAIL_C===
Option C: Soft Outreach / Beziehungsaufbau
Betreff: [Eingängiger Betreff]
[Sehr kurzes Kaltakquise-Template mit Fokus auf Feedback, Dialog oder Wissensaustausch. Im Blockquote-Format (jede Zeile mit '>' beginnen). Nutze Platzhalter]

===QUESTIONS===
#### 1. Leitfaden für das Erstgespräch (3 magische Fragen)
[3 magische Qualifizierungsfragen, die den Schmerz des Kunden sofort aufdecken.]

#### 2. Closing-Strategie
[Der effektivste Hebel, um den Sack im Verkaufsgespräch zuzumachen.]

===OBJECTIONS===
EINWAND: [Erster häufiger Einwand/Kaufblockade der Entscheider, z.B. Keine Zeit]
KONTER: [Schlagkräftige Antwort zur Entkräftung nach der LAER-Methode (Listen, Acknowledge, Explore, Respond)]
EINWAND: [Zweiter Einwand]
KONTER: [Antwort]
EINWAND: [Dritter Einwand]
KONTER: [Antwort]

===FOLLOWUP===
SCHRITT: Tag 3 - [Titel des ersten Nachfassens]
AKTION: [Kurze Beschreibung der Aktion & Template]
SCHRITT: Tag 7 - [Titel des zweiten Nachfassens]
AKTION: [Beschreibung & Template]
SCHRITT: Tag 14 - [Titel des dritten Nachfassens]
AKTION: [Beschreibung & Template]

Schreibe auf Deutsch. Keine einleitenden Floskeln, sondern direkt zum Inhalt.`;
}

/**
 * Builds the Lead-Scout prompt. `count` controls how many leads to request
 * (the small sidebar scout asks for 5-7, the main-page scout asks for 50+).
 */
export function buildLeadFinderPrompt(product, region, industry, minCount) {
  const countText = minCount >= 50 ? "mindestens 50" : "5 bis 7";
  return `
Du bist ein hochpräziser B2B-Sales-Scout. Recherchiere ${countText} reale oder hochgradig plausible Unternehmen in der Region "${region}", die als B2B-Kunden für folgendes Produkt in Frage kommen: "${product}".
${industry ? `Fokussiere dich vorrangig auf Unternehmen aus der Branche: "${industry}".` : ""}
Stelle sicher, dass alle recherchierten Unternehmen tatsächlich physisch in der gesuchten Region "${region}" ansässig sind.
Das aktuelle Kalenderjahr ist 2026. Alle gelieferten Informationen müssen zwingend auf dem aktuellen Stand von 2026 (oder neuer) sein.

Erstelle ein JSON-Array, das ausschließlich passende Firmenobjekte enthält. Jedes Objekt muss exakt diese Schlüssel besitzen:
- "company": Vollständiger Firmenname
- "contact": Ein passender Ansprechpartner (z. B. "Herr Schmidt (Einkaufsleiter)")
- "email": Eine B2B-Kontakt-E-Mail (z. B. info@firma.de)
- "phone": Eine plausible Telefonnummer mit der korrekten regionalen Vorwahl für die Region "${region}"
- "potenzial": Das geschätzte Kaufpotenzial für dieses B2B-Produkt (muss exakt einer dieser drei Strings sein: "Hoch", "Mittel" oder "Gering", basierend auf Schmerzpunkt-Dringlichkeit und Branchenrelevanz)
- "industry": Die genaue Branche des Unternehmens
- "website": Die Website (z. B. https://www.firma.de)
- "notes": Eine aussagekräftige Vertriebsnotiz, warum dieses Unternehmen das Produkt benötigt

Gib AUSSCHLIESSLICH das nackte JSON-Array zurück. Schreibe keine Erklärungen davor oder danach. Verwende keine Markdown-Codeblocks (\`\`\`json).
`;
}

/**
 * Builds the chat-assistant prompt.
 */
export function buildChatPrompt(industry, product, currentCampaignData, userQuery) {
  return `
Du bist die KI-Vertriebsassistentin OrbitAI. Der B2B-Sales-Manager nutzt deine App, um für folgende Eingaben Vertriebskonzepte zu erstellen:
- Zielbranche: ${industry || "Nicht definiert (allgemeine Anfrage)"}
- Produkt / Lösung: ${product || "Nicht definiert (allgemeine Anfrage)"}
- Aktuelles Kalenderjahr der Suchanfrage: 2026. Alle gelieferten Daten, Marktprognosen und Antworten müssen zwingend auf dem Stand von 2026 (oder neuer) sein und dürfen keinesfalls älter als 2026 sein.

Er hat diese Analyse vor sich liegen:
${JSON.stringify(currentCampaignData || "Noch keine Detail-Kampagnen geladen.")}

Er hat dir im Chat folgende Frage oder Anweisung gegeben:
"${userQuery}"

WICHTIGE AGENTEN-FUNKTION (SYSTEM-STEUERUNG):
Falls der Nutzer eine Systemaktion wünscht, füge am Ende deiner Textantwort EXAKT eine dieser Kommandozeilen in einer neuen Zeile hinzu (verwende echte Werte aus dem Chat-Kontext als Parameter, keine Variablen-Platzhalter!):
- [SYSTEM_COMMAND: analyze("Branche", "Produkt")] -> Um eine neue B2B-Bedarfsanalyse zu starten.
- [SYSTEM_COMMAND: scout("Produkt", "Region", "Branche")] -> Um Leads nach Produkt und Ort zu scouten.
- [SYSTEM_COMMAND: load_demo("predictive" | "logistics" | "recruiting")] -> Um eine Demo-Kampagne zu laden.
- [SYSTEM_COMMAND: switch_tab("module1" | "module_fit" | "module2" | "module3" | "module4" | "crm")] -> Um den Reiter im Cockpit umzuschalten.
- [SYSTEM_COMMAND: export_leads()] -> Um die CRM-Leads als CSV zu exportieren.
- [SYSTEM_COMMAND: open_setup()] -> Um das Setup zu öffnen.
- [SYSTEM_COMMAND: open_landingpage()] -> Um den KI-Landingpage-Generator zu öffnen.
- [SYSTEM_COMMAND: generate_landingpage("Produkt", "Branche", "Zusatzanforderungen")] -> Um direkt eine Landingpage zu entwerfen.

Beantworte seine Frage, hilf ihm bei Ergänzungen oder erstelle auf Wunsch neue E-Mails oder Gegenargumente. Antworte in strukturierter Markdown-Form, halte dich kurz, präzise und lösungsorientiert.
`;
}

// --------------------------------------------------------------------------
// KI-Werkzeuge: Reklamationen, Produktlistungen, Social-Media-Kampagnen,
// Trend-Radar, Social-Media-Content. Alle nutzen den bestehenden
// /api/generate-Proxy (reiner Text-Prompt rein, Text raus) - kein separater
// Backend-Code nötig, nur ein spezialisierter Prompt pro Werkzeug.
// --------------------------------------------------------------------------

/** Reklamationen-Assistent: kategorisiert eine Kundenbeschwerde und formuliert eine Antwort. */
export function buildReklamationPrompt(beschwerdetext, firmenname, ton) {
  const toneText = ton || "professionell, empathisch und lösungsorientiert";
  return `
Du bist ein erfahrener Kundenservice-Experte für B2B-Unternehmen. Ein Kunde hat folgende Reklamation/Beschwerde eingereicht:

"${beschwerdetext}"

${firmenname ? `Das antwortende Unternehmen heißt: "${firmenname}".` : ""}

Bearbeite diese Reklamation in genau diesem Format:

===EINSTUFUNG===
DRINGLICHKEIT: [Hoch/Mittel/Niedrig]
THEMA: [Kurze Kategorie, z.B. Lieferverzug, Produktmangel, Abrechnungsfehler]
ZUSAMMENFASSUNG: [1-2 Sätze, was der Kunde eigentlich möchte]

===ANTWORTENTWURF===
[Vollständige, versandfertige Antwort-E-Mail an den Kunden. Ton: ${toneText}. Nimm die Beschwerde ernst, biete eine konkrete Lösung oder nächste Schritte an, keine Floskeln.]

===INTERNE-NOTIZ===
[Kurzer interner Hinweis für das Team: was sollte intern als nächstes passieren?]

Schreibe auf Deutsch. Gib ausschließlich diesen strukturierten Text zurück, keine zusätzlichen Erklärungen davor oder danach.
`;
}

/** Produktlistungen-Generator: macht aus Stichpunkten fertige Verkaufstexte. */
export function buildProduktlistingPrompt(produktname, stichpunkte, plattform) {
  return `
Du bist ein E-Commerce-Copywriter, spezialisiert auf konversionsstarke Produktlistings.

Produktname: "${produktname}"
Stichpunkte / Rohdaten zum Produkt: "${stichpunkte}"
${plattform ? `Zielplattform: "${plattform}" (passe Tonalität und Länge an diese Plattform an).` : ""}

Erstelle daraus ein vollständiges Produktlisting in genau diesem Format:

===TITEL===
[Prägnanter, SEO-starker Produkttitel, max. 80 Zeichen]

===KURZBESCHREIBUNG===
[2-3 Sätze, die den Kernnutzen auf den Punkt bringen]

===BULLET-POINTS===
* [Vorteil/Feature 1]
* [Vorteil/Feature 2]
* [Vorteil/Feature 3]
* [Vorteil/Feature 4]
* [Vorteil/Feature 5]

===LANGBESCHREIBUNG===
[3-4 Absätze ausführliche Produktbeschreibung mit Nutzenargumentation]

===SEO-KEYWORDS===
[5-8 relevante Suchbegriffe, kommagetrennt]

Schreibe auf Deutsch. Gib ausschließlich diesen strukturierten Text zurück, keine zusätzlichen Erklärungen davor oder danach.
`;
}

/** Social-Media-Kampagnen-Generator: Text- und Targeting-Vorschläge (keine echten Ads-Schaltungen). */
export function buildSocialKampagnePrompt(produkt, zielgruppe, plattform) {
  const cleanPlattform = plattform || "LinkedIn";
  return `
Du bist ein Social-Media-Ads-Stratege für B2B-Lead-Kampagnen.

Produkt/Dienstleistung: "${produkt}"
Zielgruppe: "${zielgruppe}"
Plattform: "${cleanPlattform}"

Erstelle einen kompletten Kampagnen-Entwurf in genau diesem Format:

===KAMPAGNENZIEL===
[Empfohlenes Kampagnenziel für ${cleanPlattform}, z.B. Lead-Generierung, Traffic]

===TARGETING-VORSCHLAG===
[Konkrete Vorschläge für Zielgruppen-Targeting: Berufsbezeichnungen, Branchen, Unternehmensgröße, Interessen - passend zu "${zielgruppe}"]

===AD-COPY-VARIANTE-1===
HEADLINE: [Kurzer Aufhänger]
TEXT: [Anzeigentext, 2-3 Sätze]
CTA: [Call-to-Action-Button-Text]

===AD-COPY-VARIANTE-2===
HEADLINE: [Alternativer Aufhänger, anderer Winkel]
TEXT: [Anzeigentext, 2-3 Sätze]
CTA: [Call-to-Action-Button-Text]

===BUDGET-HINWEIS===
[Kurze, allgemeine Einschätzung zu Teststart-Budget und Laufzeit - keine konkreten Geldbeträge versprechen, nur eine Testlaufzeit-Empfehlung]

Schreibe auf Deutsch. Gib ausschließlich diesen strukturierten Text zurück, keine zusätzlichen Erklärungen davor oder danach.
`;
}

/** Trend-Radar (on-demand): Bewusst manuell ausgelöst - echte Automatisierung + Push braucht eigene Infrastruktur (siehe UI-Hinweis). */
export function buildTrendRadarPrompt(branche) {
  return `
Du bist ein Marktanalyst mit Fokus auf B2B-Trends. Das aktuelle Kalenderjahr ist 2026, alle Aussagen müssen auf dem Stand von 2026 sein.

Branche/Nische: "${branche}"

Erstelle einen kompakten Trend-Report in genau diesem Format:

===TOP-TRENDS===
1. [Trend-Name]: [1-2 Sätze Erklärung, warum das gerade relevant ist]
2. [Trend-Name]: [Erklärung]
3. [Trend-Name]: [Erklärung]

===CHANCEN-FUER-VERTRIEB===
[2-3 Sätze: wie ein B2B-Vertriebsteam diese Trends konkret für Akquise nutzen kann]

===RISIKEN===
[1-2 Sätze: worauf man in dieser Branche aktuell achten sollte]

Schreibe auf Deutsch. Gib ausschließlich diesen strukturierten Text zurück, keine zusätzlichen Erklärungen davor oder danach.
`;
}

/** Social-Media-Content: Text/Caption-Teil. Bild wird separat über apiGenerateImage erzeugt. */
export function buildSocialContentPrompt(thema, plattform) {
  const cleanPlattform = plattform || "LinkedIn";
  return `
Du bist ein Social-Media-Manager für B2B-Unternehmen.

Thema/Anlass des Posts: "${thema}"
Plattform: "${cleanPlattform}"

Erstelle einen fertigen Social-Media-Post in genau diesem Format:

===CAPTION===
[Fertiger Post-Text für ${cleanPlattform}, inkl. passender Tonalität für die Plattform, mit einem klaren Call-to-Action am Ende]

===HASHTAGS===
[5-8 relevante Hashtags, mit # und Leerzeichen getrennt]

===BILD-BRIEFING===
[Kurze, konkrete Bildbeschreibung für einen Grafiker/eine Bild-KI: Motiv, Stil, Farben, Stimmung]

Schreibe auf Deutsch. Gib ausschließlich diesen strukturierten Text zurück, keine zusätzlichen Erklärungen davor oder danach.
`;
}

// --------------------------------------------------------------------------
// Offline / no-API-key mock generators (unchanged behaviour, moved as-is)
// --------------------------------------------------------------------------

export function generateLocalMockData(industry, product) {
  const cleanInd = industry || "deine Zielbranche";
  const cleanProd = product || "deine Lösung";

  return {
    modules: {
      module1: `### MODUL 1: BEDARFSERMITTLUNG & SCHMERZPUNKTE (PAIN POINTS)
* **Status Quo der Branche:** Spürbarer Kostendruck, Fachkräftemangel und die Notwendigkeit zur Prozess-Digitalisierung in der Branche **${cleanInd}**.
* **Problem-Markt-Fit:** Manuelle oder ineffiziente B2B-Abläufe kosten täglich wertvolle Margen. Die Einführung von **${cleanProd}** behebt diese Schwachstellen direkt.
* **Triggermomente (Wann kauft der Kunde?):** Anstehende Reorganisationsphasen, steigende Betriebskosten oder unzufriedene Endkunden wegen Verzögerungen.`,

      module_fit: `### PROBLEM-MARKT-FIT & POSITIONIERUNG
* **Wertversprechen:** **${cleanProd}** bietet eine sofort messbare Effizienzsteigerung und sichert die Wettbewerbsfähigkeit in der Branche **${cleanInd}**.
* **Alleinstellungsmerkmal (USP):** Schnelle Integration, intuitive Bedienung und ein unschlagbares B2B-Nutzenversprechen.`,

      module2: `### MODUL 2: B2B VERTRIEBS-PLAYBOOK & AKQUISITION
* **Elevator Pitch:** "Wir unterstützen B2B-Unternehmen aus der Branche ${cleanInd} dabei, mit ${cleanProd} ihre Betriebskosten signifikant zu senken und gleichzeitig die Durchlaufzeiten zu halbieren – komplett risikofrei."
* **Zielgruppe (Buyer Personas):** Geschäftsführer, Einkaufsleiter und Operations Manager, die unter erheblichem Leistungsdruck stehen.`,

      module3: `### MODUL 3: EINWAND-TRAINER & ARGUMENTATION
* **Einwand 1: "Wir haben kein Budget für ${cleanProd}."**
  * *Gegenargument:* "${cleanProd} amortisiert sich in der Regel bereits nach wenigen Monaten. Es ist keine Ausgabe, sondern eine Investition zur langfristigen Kostensenkung."
* **Einwand 2: "Das System ist uns zu komplex."**
  * *Gegenargument:* "Unsere Lösung ist für eine plug-and-play Einführung konzipiert. Wir schulen dein Team in unter 2 Stunden."`
    },
    emails: [
      {
        subject: `Effizienz-Upgrade für dein Unternehmen im Bereich ${cleanInd}`,
        body: `Hallo [Name],\n\nich sehe täglich, vor welchen Herausforderungen Unternehmen im Bereich ${cleanInd} aktuell stehen – insbesondere beim Margendruck.\n\nMit unserer B2B-Lösung **${cleanProd}** helfen wir Betrieben dabei, diese Reibungspunkte vollkommen zu eliminieren.\n\nWann passt es dir diese Woche für ein kurzes 5-Minuten-Telefonat?\n\nViele Grüße,\n[Absender]`
      },
      {
        subject: `Prozessoptimierung durch ${cleanProd}`,
        body: `Hallo [Name],\n\nich melde mich noch einmal kurz bezüglich **${cleanProd}**.\n\nViele B2B-Betriebe in der Region haben durch die Umstellung ihre Betriebskosten um bis zu 25% gesenkt.\n\nLass uns kurz abstimmen, ob das auch für dich Sinn macht.\n\nBeste Grüße,\n[Absender]`
      },
      {
        subject: `Letzter Versuch: Potenzialanalyse für [Unternehmen]`,
        body: `Hallo [Name],\n\nda ich dich telefonisch nicht erreichen konnte, hier mein letzter Versuch.\n\nWenn die Senkung von Durchlaufzeiten in der Branche ${cleanInd} für dich aktuell kein Thema ist, antworte mir einfach kurz mit 'Nein'.\n\nAndernfalls freue ich mich auf ein kurzes Kennenlernen.\n\nHerzliche Grüße,\n[Absender]`
      }
    ],
    objections: [
      {
        objection: `Das Produkt ${cleanProd} ist uns zu teuer.`,
        response: "Ich verstehe die Bedenken. Aber lass uns den ROI betrachten: Bei einer Marge von X amortisiert sich das Produkt in nur wenigen Wochen. Danach erzielst du puren Zusatzgewinn."
      },
      {
        objection: "Wir arbeiten bereits mit einem anderen Partner.",
        response: `Das ist gut, das zeigt, dass ihr das Thema ernst nehmt. Unsere Kunden schätzen an uns jedoch die spezialisierte Ausrichtung auf ${cleanInd}, die oft signifikante Mehrwerte liefert.`
      }
    ],
    followup: [
      { phase: "Tag 1", action: "Erstkontakt per E-Mail (Vorteile anteasern)" },
      { phase: "Tag 3", action: "Telefonischer Nachfass / Terminvereinbarung" },
      { phase: "Tag 7", action: "Zweite E-Mail mit konkretem ROI-Rechenbeispiel" },
      { phase: "Tag 14", action: "Abschluss-Nachricht (Break-up Mail)" }
    ],
    roi_defaults: {
      ek: 45,
      uvp: 99,
      monthly_qty: 250,
      pos_boost: 25,
      cross_selling: 12
    }
  };
}

// --------------------------------------------------------------------------
// Landing page generator (Tailwind/glassmorphism design, GitHub-Pages ready)
// --------------------------------------------------------------------------

/**
 * Builds the prompt sent to /api/generate for the landing page generator.
 * Deliberately allows CDN-hosted Tailwind/Lucide/Google Fonts (that's the
 * intended design language for this generator) - the trade-off is that the
 * generated page needs internet access to render styled; that's called out
 * to the user in the UI.
 */
export function buildLandingPagePrompt(industry, product, customRequirements) {
  return `
Du bist ein weltklasse Frontend-Entwickler und Designer für B2B SaaS Landingpages.
Erstelle eine hochprofessionelle, voll responsive und interaktive Single-Page Landingpage für folgendes Thema:
- Zielbranche: ${industry}
- B2B-Lösung/Produkt: ${product}
${customRequirements ? `- Besondere Kundenanforderungen: ${customRequirements}` : ""}

DESIGN-RICHTLINIEN:
- Verwende Tailwind CSS über CDN für erstklassiges, modernes Styling.
- Verwende Lucide Icons über CDN (https://unpkg.com/lucide@latest) für saubere Symbole.
- Binde Google Fonts (z.B. Inter) ein.
- Nutze ein atemberaubendes Dark-Mode oder Glassmorphismus-Farbschema mit weichen Verläufen und modernen Schatten.
- Das Design muss State-of-the-Art sein (kein Standard-Bootstrap-Look).

INTERAKTIVE MODULE (FUNKTIONEN):
- Hero-Section mit markantem Pitch und CTA-Button.
- Feature-Grid oder Pain-Point-Gegenüberstellung.
- Ein funktionierendes, interaktives B2B-Kontaktformular (mit JS-Event, das bei Absenden eine schicke Erfolgsmeldung im DOM anzeigt, aber KEINE echten Daten irgendwohin sendet).
- Ein voll funktionsfähiger ROI-Rechner oder Kosten-Rechner mit JavaScript, der auf dieser Seite interaktiv bedient werden kann.
- FAQ-Accordion, das bei Klick flüssig aufklappt (mit JS gesteuert).

AUSGABE-REGELN:
Gib AUSSCHLIESSLICH den vollständigen, nackten HTML-Code der Landingpage zurück.
Schreibe keinerlei Erklärungen vor oder nach dem Code. Verwende keine Markdown-Codeblocks (\`\`\`html).
`;
}

/**
 * Extracts a clean HTML document from a raw model response: strips markdown
 * code fences if present and trims anything before <!DOCTYPE/<html> or after
 * </html>, so stray commentary from the model doesn't break the page.
 */
export function extractHtmlFromResponse(rawText) {
  let text = (rawText || "").trim();

  // Strip ``` / ```html fences if the model added them anyway
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();

  const startMatch = text.match(/<!DOCTYPE html>|<html[\s>]/i);
  const start = startMatch ? startMatch.index : 0;

  const endMatch = text.match(/<\/html\s*>/i);
  const end = endMatch ? endMatch.index + endMatch[0].length : text.length;

  const extracted = text.substring(start, end).trim();

  if (!extracted || !/<html[\s>]/i.test(extracted)) {
    // Fallback: wrap whatever we got so the preview never shows a blank/broken frame
    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Fehler</title></head><body style="font-family: sans-serif; padding: 2rem; color: #333;"><h2>Die KI-Antwort konnte nicht als HTML-Seite erkannt werden.</h2><pre style="white-space: pre-wrap; background: #f5f5f5; padding: 1rem; border-radius: 6px;">${text.replace(/</g, "&lt;")}</pre></body></html>`;
  }

  return extracted;
}

/**
 * Offline fallback: builds the same Tailwind/glassmorphism landing page
 * locally (no API key needed), so the feature always produces something
 * usable. NOTE: the original version of this template had every `${...}`
 * written as `\${...}` inside the returned string, which escapes the `$`
 * and stops JS from interpolating it - the page literally showed the text
 * "${cleanProd}" instead of the product name. Fixed here.
 */
export function generateMockLandingpageHTML(product, industry, customRequirements) {
  const cleanProd = product || "Premium B2B-Lösung";
  const cleanInd = industry || "B2B-Unternehmen";

  return `<!DOCTYPE html>
<html lang="de" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanProd} - Die Premium-Lösung für ${cleanInd}</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
      font-family: 'Inter', sans-serif;
    }
  </style>
</head>
<body class="bg-[#0b0f19] text-gray-100 min-h-screen selection:bg-pink-500 selection:text-white">

  <!-- Glow effects -->
  <div class="fixed -top-40 -left-40 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
  <div class="fixed top-1/2 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

  <!-- Header / Navigation -->
  <header class="border-b border-gray-800 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <i data-lucide="zap" class="text-pink-500 w-6 h-6"></i>
        <span class="font-extrabold text-xl tracking-tight bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent">ORBIT LABS</span>
      </div>
      <nav class="hidden md:flex gap-8 text-sm font-medium text-gray-400">
        <a href="#features" class="hover:text-white transition-colors">Vorteile</a>
        <a href="#roi" class="hover:text-white transition-colors">ROI-Rechner</a>
        <a href="#faq" class="hover:text-white transition-colors">FAQ</a>
      </nav>
      <a href="#kontakt" class="bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-pink-500/15">
        Jetzt anfragen
      </a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="max-w-6xl mx-auto px-6 py-20 md:py-32 text-center relative">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-pink-500/20 bg-pink-500/5 text-pink-400 text-xs font-semibold tracking-wide uppercase mb-6">
      <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Exklusiv für ${cleanInd}
    </div>
    <h1 class="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6 max-w-4xl mx-auto">
      Mehr Effizienz. Weniger Aufwand. Mit <span class="bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">${cleanProd}</span>
    </h1>
    <p class="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
      Speziell entwickelt für die Anforderungen im Sektor ${cleanInd}. Erreiche messbaren Erfolg und senke deine Betriebskosten ab Tag 1.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <a href="#kontakt" class="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-cyan-500 hover:scale-[1.02] text-white font-bold text-base px-8 py-4 rounded-xl transition-all shadow-xl shadow-pink-500/20">
        Kostenloses Erstgespräch buchen
      </a>
      <a href="#roi" class="w-full sm:w-auto border border-gray-700 hover:border-gray-500 bg-gray-900/50 text-gray-300 font-semibold text-base px-8 py-4 rounded-xl transition-all">
        ROI berechnen
      </a>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="max-w-6xl mx-auto px-6 py-20 border-t border-gray-800/80">
    <div class="text-center mb-16">
      <h2 class="text-3xl font-bold tracking-tight mb-4">Deine B2B-Vorteile auf einen Blick</h2>
      <p class="text-gray-400 max-w-xl mx-auto">Warum Marktführer im Bereich ${cleanInd} auf unsere B2B-Lösung setzen.</p>
    </div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="p-8 rounded-2xl border border-gray-800 bg-[#0f1424]/40 backdrop-blur-sm hover:border-pink-500/20 transition-all group">
        <div class="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-6 group-hover:bg-pink-500 group-hover:text-white transition-all">
          <i data-lucide="trending-up" class="w-6 h-6"></i>
        </div>
        <h3 class="font-bold text-xl mb-3">Maximale Rendite</h3>
        <p class="text-gray-400 text-sm leading-relaxed">Automatisierte Workflows und modernste B2B-Features sparen Zeit und Ressourcen ab der ersten Stunde.</p>
      </div>
      <div class="p-8 rounded-2xl border border-gray-800 bg-[#0f1424]/40 backdrop-blur-sm hover:border-cyan-500/20 transition-all group">
        <div class="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:bg-cyan-500 group-hover:text-white transition-all">
          <i data-lucide="shield-check" class="w-6 h-6"></i>
        </div>
        <h3 class="font-bold text-xl mb-3">Sicher & Konform</h3>
        <p class="text-gray-400 text-sm leading-relaxed">Höchste Sicherheitsstandards, DSGVO-konform und jederzeit ausfallsicher für dein Business.</p>
      </div>
      <div class="p-8 rounded-2xl border border-gray-800 bg-[#0f1424]/40 backdrop-blur-sm hover:border-purple-500/20 transition-all group">
        <div class="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-500 group-hover:text-white transition-all">
          <i data-lucide="rocket" class="w-6 h-6"></i>
        </div>
        <h3 class="font-bold text-xl mb-3">Schnelle Integration</h3>
        <p class="text-gray-400 text-sm leading-relaxed">Dank unserer modernen Cloud-Architektur und Schnittstellen in Rekordzeit in deinem Betrieb einsatzbereit.</p>
      </div>
    </div>
  </section>

  <!-- Interactive ROI Calculator Section -->
  <section id="roi" class="max-w-4xl mx-auto px-6 py-20 border-t border-gray-800/80">
    <div class="p-8 md:p-12 rounded-3xl border border-gray-800 bg-gradient-to-b from-[#0f1424]/80 to-[#070b13] relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div class="text-center mb-10">
        <span class="text-cyan-400 font-semibold text-sm uppercase tracking-wider mb-2 block">Wertrechner</span>
        <h2 class="text-2xl md:text-3xl font-extrabold">Berechne deine jährliche Ersparnis</h2>
        <p class="text-gray-400 text-sm mt-2">Berechne live den finanziellen ROI für dein Unternehmen.</p>
      </div>

      <div class="grid md:grid-cols-2 gap-8 items-center">
        <div class="space-y-6 text-left">
          <div>
            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Anzahl Mitarbeiter / Nutzer</label>
            <input type="number" id="roi-users" value="25" min="1" class="w-full bg-[#070b13] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white font-semibold outline-none transition-all">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bisherige manuelle Arbeitsstunden (pro Mitarbeiter & Woche)</label>
            <input type="number" id="roi-hours" value="4" min="0" class="w-full bg-[#070b13] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white font-semibold outline-none transition-all">
          </div>
          <button onclick="calculateInteractiveROI()" class="w-full bg-[#0f1424] hover:bg-[#182038] text-cyan-400 font-bold py-3 rounded-xl transition-all border border-cyan-500/20">
            Ersparnis neu berechnen
          </button>
        </div>

        <div class="p-8 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-center flex flex-col justify-center h-full">
          <span class="text-gray-400 text-sm font-medium mb-1">Deine geschätzte jährliche Ersparnis</span>
          <span id="roi-result" class="text-4xl md:text-5xl font-black text-cyan-400 my-4">€ 24.000</span>
          <span class="text-xs text-gray-500 leading-relaxed">Kalkuliert auf Basis von € 40,- Stundensatz inkl. Lohnnebenkosten durch Effizienzgewinn von 50% mit ${cleanProd}.</span>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ Section (Accordion) -->
  <section id="faq" class="max-w-3xl mx-auto px-6 py-20 border-t border-gray-800/80 text-left">
    <div class="text-center mb-16">
      <h2 class="text-3xl font-bold tracking-tight mb-4">Häufig gestellte Fragen</h2>
      <p class="text-gray-400">Schnelle Antworten auf die wichtigsten Fragen.</p>
    </div>
    <div class="space-y-4">
      <div class="border border-gray-800 rounded-xl bg-[#0f1424]/30 overflow-hidden">
        <button onclick="toggleFaq(this)" class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-800/25 transition-colors">
          <span class="font-semibold text-base">Wie funktioniert die Einführung von ${cleanProd}?</span>
          <i data-lucide="chevron-down" class="w-5 h-5 text-gray-400 transition-transform"></i>
        </button>
        <div class="hidden px-6 py-4 border-t border-gray-800/80 text-gray-400 text-sm leading-relaxed">
          Unser Onboarding-Team richtet das System innerhalb von wenigen Tagen für dich ein. Es ist keine komplexe IT-Infrastruktur vor Ort erforderlich.
        </div>
      </div>
      <div class="border border-gray-800 rounded-xl bg-[#0f1424]/30 overflow-hidden">
        <button onclick="toggleFaq(this)" class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-800/25 transition-colors">
          <span class="font-semibold text-base">Gibt es eine Vertragslaufzeit?</span>
          <i data-lucide="chevron-down" class="w-5 h-5 text-gray-400 transition-transform"></i>
        </button>
        <div class="hidden px-6 py-4 border-t border-gray-800/80 text-gray-400 text-sm leading-relaxed">
          Wir bieten flexible monatliche Lizenzen sowie rabattierte Jahresverträge an. Du kannst dein Paket jederzeit anpassen oder erweitern.
        </div>
      </div>
      <div class="border border-gray-800 rounded-xl bg-[#0f1424]/30 overflow-hidden">
        <button onclick="toggleFaq(this)" class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-800/25 transition-colors">
          <span class="font-semibold text-base">Ist die Lösung DSGVO-konform?</span>
          <i data-lucide="chevron-down" class="w-5 h-5 text-gray-400 transition-transform"></i>
        </button>
        <div class="hidden px-6 py-4 border-t border-gray-800/80 text-gray-400 text-sm leading-relaxed">
          Ja! Alle Daten werden verschlüsselt auf Servern innerhalb der EU verarbeitet und entsprechen vollumfänglich den Vorgaben der DSGVO.
        </div>
      </div>
    </div>
  </section>

  <!-- Contact Form Section -->
  <section id="kontakt" class="max-w-xl mx-auto px-6 py-20 border-t border-gray-800/80">
    <div class="text-center mb-10">
      <h2 class="text-3xl font-bold tracking-tight mb-2">Unverbindlich anfragen</h2>
      <p class="text-gray-400 text-sm">Trage dich ein und unser B2B-Experte meldet sich innerhalb von 24 Stunden bei dir.</p>
    </div>

    <form onsubmit="handleDemoContact(event)" class="space-y-4 text-left">
      <div>
        <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Firmenname</label>
        <input type="text" required class="w-full bg-[#0f1424]/50 border border-gray-800 focus:border-pink-500 rounded-xl px-4 py-3 text-white outline-none transition-all">
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dein Name</label>
        <input type="text" required class="w-full bg-[#0f1424]/50 border border-gray-800 focus:border-pink-500 rounded-xl px-4 py-3 text-white outline-none transition-all">
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">E-Mail-Adresse</label>
        <input type="email" required class="w-full bg-[#0f1424]/50 border border-gray-800 focus:border-pink-500 rounded-xl px-4 py-3 text-white outline-none transition-all">
      </div>
      <div id="contact-success" class="hidden p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium">
        ✓ Vielen Dank! Deine Anfrage wurde erfolgreich gesendet. Wir melden uns umgehend bei dir.
      </div>
      <button type="submit" class="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-95 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-pink-500/10">
        Jetzt B2B-Beratung anfordern
      </button>
    </form>
  </section>

  <!-- Footer -->
  <footer class="border-t border-gray-800 bg-[#070b13] py-8 text-center text-xs text-gray-600">
    <div class="max-w-6xl mx-auto px-6">
      <p class="mb-2">© 2026 Orbit Labs. Alle Rechte vorbehalten. Erstellt mit dem KI Landingpage-Generator.</p>
      <p>Diese Landingpage ist bereit für die Veröffentlichung auf GitHub Pages.</p>
    </div>
  </footer>

  <!-- Scripts -->
  <script>
    lucide.createIcons();

    function calculateInteractiveROI() {
      const users = parseInt(document.getElementById('roi-users').value) || 0;
      const hours = parseInt(document.getElementById('roi-hours').value) || 0;
      const savings = Math.round(users * hours * 52 * 40 * 0.5); // 50% savings, 52 weeks, € 40 hourly rate

      const formatted = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(savings);
      document.getElementById('roi-result').innerText = formatted;
    }

    function toggleFaq(button) {
      const content = button.nextElementSibling;
      const icon = button.querySelector('i');

      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
      } else {
        content.classList.add('hidden');
        if (icon) icon.style.transform = '';
      }
    }

    function handleDemoContact(event) {
      event.preventDefault();
      document.getElementById('contact-success').classList.remove('hidden');
      event.target.reset();
    }
  </script>
</body>
</html>`;
}

export function generateLocalMockLeads(product, region, industry) {
  const cleanProd = product || "Lösung";
  const cleanReg = region || "deine Region";
  const cleanInd = industry || "B2B";
  const regCap = cleanReg.charAt(0).toUpperCase() + cleanReg.slice(1);

  const companies = [
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
    "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann",
    "Tech", "Industrie", "Vertrieb", "Handel", "Dienstleistung", "Zukunft", "Logistik", "Digital", "Global", "Systems",
    "Kreativ", "Projekt", "Consulting", "Finance", "Energy", "Solutions", "Concept", "Group", "Partner", "Network",
    "Hub", "Lab", "Works", "Mind", "Flow", "Core", "Prime", "Elite", "Nexus", "Apex"
  ];

  const suffixes = ["GmbH", "AG", "KG", "GmbH & Co. KG", "e.U.", "Holding", "Group"];

  const firstNames = [
    "Michael", "Andreas", "Thomas", "Stefan", "Christian", "Martin", "Daniel", "Peter", "Alexander", "David",
    "Sabine", "Petra", "Maria", "Andrea", "Anna", "Christina", "Julia", "Katharina", "Sandra", "Karin"
  ];

  const lastNames = [
    "Gruber", "Hofer", "Wallner", "Lang", "Müller", "Bauer", "Wagner", "Huber", "Pichler", "Steiner",
    "Mayer", "Berger", "Wimmer", "Eder", "Fuchs", "Leitner", "Schmid", "Winkler", "Schwarz", "Reiter"
  ];

  const positions = [
    "Geschäftsführer", "Inhaber", "Einkaufsleiter", "Leiter IT & Prozesse", "Vertriebsleitung",
    "Digital Transformation Officer", "Technical Director", "Operations Manager", "Head of Business Development", "CFO"
  ];

  const domains = [
    "at", "de", "ch", "com", "net", "org"
  ];

  const notesTemplates = [
    `Großer Bedarf an ${cleanProd} zur Margenoptimierung und Digitalisierung vor Ort.`,
    `Sucht aktiv nach neuen Lösungen wie ${cleanProd} zur Effizienzsteigerung des Teams.`,
    `Traditionelles Unternehmen, das durch ${cleanProd} wettbewerbsfähig bleiben möchte.`,
    `Ideal als Innovationspartner für die Einführung von ${cleanProd}.`,
    `Möchte ${cleanProd} nutzen, um B2B-Vertriebsprozesse in der Region zu beschleunigen.`,
    `Planung für Budgetierung von ${cleanProd} im nächsten Quartal läuft bereits.`,
    `Zeigt Interesse an einer Prozessoptimierung durch ${cleanProd} zur Kostenreduktion.`,
    `Möchte die interne Infrastruktur mit ${cleanProd} modernisieren.`
  ];

  const mockLeads = [];

  for (let i = 1; i <= 50; i++) {
    const compName = companies[i % companies.length];
    const secondPart = companies[(i + 7) % companies.length];
    const suffix = suffixes[i % suffixes.length];
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const pos = positions[i % positions.length];
    const dom = domains[i % domains.length];
    const notes = notesTemplates[i % notesTemplates.length];

    const email = `${firstName.toLowerCase().charAt(0)}.${lastName.toLowerCase()}@${compName.toLowerCase()}-${cleanReg.toLowerCase()}.${dom}`;
    const website = `https://www.${compName.toLowerCase()}-${cleanReg.toLowerCase()}.${dom}`;

    // Region-based phone prefixes
    let phonePrefix = "+49";
    let areaCode = "30";

    const regLower = cleanReg.toLowerCase();
    if (regLower.includes("wien") || regLower.includes("steyr") || regLower.includes("linz") || regLower.includes("salzburg") || regLower.includes("graz") || regLower.includes("österreich") || regLower.includes("austria") || regLower.includes("tirol") || regLower.includes("innsbruck") || regLower.includes("kärnten")) {
      phonePrefix = "+43";
      if (regLower.includes("wien")) areaCode = "1";
      else if (regLower.includes("linz")) areaCode = "732";
      else if (regLower.includes("salzburg")) areaCode = "662";
      else if (regLower.includes("graz")) areaCode = "316";
      else if (regLower.includes("steyr")) areaCode = "7252";
      else areaCode = "664";
    } else if (regLower.includes("zürich") || regLower.includes("bern") || regLower.includes("genf") || regLower.includes("schweiz") || regLower.includes("switzerland") || regLower.includes("basel")) {
      phonePrefix = "+41";
      if (regLower.includes("zürich")) areaCode = "44";
      else if (regLower.includes("bern")) areaCode = "31";
      else if (regLower.includes("genf")) areaCode = "22";
      else areaCode = "79";
    } else {
      phonePrefix = "+49";
      if (regLower.includes("münchen")) areaCode = "89";
      else if (regLower.includes("hamburg")) areaCode = "40";
      else if (regLower.includes("köln")) areaCode = "221";
      else if (regLower.includes("frankfurt")) areaCode = "69";
      else if (regLower.includes("stuttgart")) areaCode = "711";
      else if (regLower.includes("düsseldorf")) areaCode = "211";
      else areaCode = "170";
    }

    const numSequence = (1234567 + (i * 98765)) % 10000000;
    const phone = `${phonePrefix} ${areaCode} ${numSequence}`;

    let finalComp = "";
    if (i % 3 === 0) {
      finalComp = `${compName} & ${secondPart} ${regCap} ${suffix}`;
    } else if (i % 3 === 1) {
      finalComp = `${regCap}er ${compName} ${suffix}`;
    } else {
      finalComp = `${compName} ${regCap} ${suffix}`;
    }

    mockLeads.push({
      company: finalComp,
      contact: `${firstName} ${lastName} (${pos})`,
      email: email,
      phone: phone,
      potenzial: i % 3 === 0 ? "Hoch" : (i % 3 === 1 ? "Mittel" : "Gering"),
      industry: i % 4 === 0 ? "Dienstleistungen" : (i % 4 === 1 ? "Technologie" : (i % 4 === 2 ? "Handel" : cleanInd)),
      website: website,
      notes: notes
    });
  }

  return mockLeads;
}
