const PREPACKAGED_DEMOS = {
  manufacturing_iot: {
    title: "Predictive Maintenance für Fertigung (IoT)",
    industry: "Mittelständische Fertigungsindustrie (Maschinenbau, Metallverarbeitung, Automotive-Zulieferer, DACH)",
    product: "IoT-basierte Predictive-Maintenance-Software zur Echtzeit-Überwachung von Produktionsanlagen",
    model: "B2B",
    roi_defaults: {
      ek: 120,
      uvp: 299,
      monthly_qty: 150,
      pos_boost: 25,
      cross_selling: 30
    },
    modules: {
      module1: `### MODUL 1: BEDARFSERMITTLUNG & SCHMERZPUNKTE (PAIN POINTS)

*   **Status Quo der Branche:**
    *   **Instandhalter-Fachkräftemangel:** Erfahrene Techniker gehen in Rente. Junge Fachkräfte sind schwer zu finden. Die Teams arbeiten überlastet im reaktiven „Feuerwehr-Modus“.
    *   **Hoher Kostendruck & Margenverfall:** Explodierende Energie- und Rohstoffpreise zwingen Unternehmen zu maximaler Ressourceneffizienz. Ungeplante Ausfälle belasten die ohnehin dünnen Margen zusätzlich.
    *   **Daten-Silos im Maschinenpark:** Ein Mix aus Legacy-Maschinen (oft über 15 Jahre alt) und modernen CNC-Anlagen führt zu Datensilos. Instandhaltungsleiter haben keinen zentralen, herstellerübergreifenden Blick auf den Zustand.

*   **Problem-Markt-Fit:**
    Die Software löst das extrem teure Problem von **ungeplanten Maschinenstillständen** (die oft 5.000 € bis 50.000 € pro Stunde kosten). Anstatt auf den Defekt zu warten oder starre Intervalle einzuhalten, ermittelt die Software den tatsächlichen Verschleiß und plant Reparaturen präventiv ein.

*   **Triggermomente (Wann kauft der Kunde?):**
    *   **Akuter Schadensfall:** Ein schwerer, ungeplanter Maschinenausfall in den letzten 3 Monaten hat zu massiven Lieferverzögerungen und Konventionalstrafen bei Key-Accounts geführt.
    *   **Verschärfte SLAs:** Ein Großkunde (z.B. Automobilhersteller) fordert nachweisbare Digitalisierungs- und Ausfallsicherheitsstandards.
    *   **Neuer Instandhaltungs- oder Produktionsleiter:** Ein neuer Kopf übernimmt die Abteilung und möchte mit modernen Industrie 4.0-Methoden sichtbare Erfolge vorweisen.`,
      
      module_fit: `### MODUL 2: PRODUKT-BRANCHEN-FIT (EIGNUNGS-ARGUMENTE)

*   **Argument 1: Sensor-agnostisches Retrofitting**
    Mittelständische Betriebe scheuen Neuinvestitionen. Unsere Lösung macht ältere Bestandsmaschinen („Legacy Systems“) über einfache Vibrations- und Temperatursensoren im Handumdrehen smart. Es ist kein Austausch teurer Steuerungen notwendig.
*   **Argument 2: Entlastung der Instandhaltungstruppe**
    Instandhalter arbeiten oft am Limit. Da unsere KI exakte Schadensprognosen und Handlungsempfehlungen liefert, entfällt die zeitintensive Fehlersuche. Die Mannschaft weiß sofort, welches Werkzeug und welches Ersatzteil gebraucht wird.
*   **Argument 3: Vermeidung von Pönalen in der Lieferkette**
    Gerade Zulieferer (Automotive/Maschinenbau) haften für Lieferverzögerungen. Die Software sichert den reibungslosen Ablauf und schützt vor teuren Regressansprüchen der Kunden.
*   **Argument 4: Messbarer Beitrag zur Ressourceneffizienz**
    Schadhaft laufende Maschinen verbrauchen bis zu 15 % mehr Energie. Durch die rechtzeitige Wartung sinkt der Strombedarf der Anlagen messbar – ein starkes Argument für das betriebliche Energiemanagement.
*   **Argument 5: Extrem kurze Amortisation**
    Die Implementierung erfordert keine langen IT-Freigaben und amortisiert sich meist schon beim ersten verhinderten Spindel- oder Getriebeschaden.`,
      
      module2: `### MODUL 3: BRAUCHBARKEIT & MARKTVALIDIERUNG (EVALUATION)

*   **Brauchbarkeits-Score: 9 / 10**
    *Begründung:* Der unmittelbare Nutzwert ist extrem hoch, da die Anlagenverfügbarkeit das Lebenselixier einer Fabrik ist. Der Score verpasst die 10 nur knapp, weil bei sehr alten Maschinenparks zunächst ein gewisser Hardware-Sensor-Nachrüstungsaufwand (Retrofitting) nötig ist.

*   **ROI- & Wert-Argumentation:**
    *   **Risikominimierung:** Reduktion von ungeplanten Ausfällen um ca. 35 % und Vermeidung von Lieferstrafen.
    *   **Zeitersparnis:** Techniker sparen täglich bis zu 2 Stunden durch Wegfall manueller Kontrollgänge.
    *   **Geldwert:** Steigerung der Gesamtanlageneffektivität (OEE) um 3–5 %, was bei einer mittelgroßen Fabrik einen Mehrertrag von 50.000 € bis 150.000 € pro Jahr bedeutet. Use the ROI-Rechner below to test live metrics!`,
      
      module3: `### MODUL 4: STRATEGISCHES SALES- & GO-TO-MARKET-KONZEPT

*   **Ideal Customer Profile (ICP):**
    *   **Rolle:** Technische Leitung / Produktionsleitung / Betriebsleitung.
    *   **Prioritäten:** OEE-Steigerung, Einhaltung von Lieferfristen, Senkung der Instandhaltungskosten.
    *   **Motivationsfaktoren:** Stressreduktion im Team, Erreichen der Produktionsziele, Positionierung als innovativer Macher.

*   **Positionierung / Hook (1-Satz-Pitch):**
    *„Wir helfen mittelständischen Produktionsbetrieben, ungeplante Maschinenstillstände um ein Drittel zu reduzieren und Instandhaltungskosten zu senken, ohne dass Sie Ihre bestehenden Maschinen austauschen müssen.“*

*   **Empfohlener Vertriebskanal:**
    *   **LinkedIn-Outreach & Social Selling** an Technische Leiter, gefolgt von einem qualifizierenden Telefonat.
    *   **Vor-Ort-Demo:** Techniker und Produktionsleiter müssen die Software live in Aktion sehen. Ein Test-Sensor-Kit wird vor Ort an einer Maschine installiert, um die Daten visualisiert darzustellen. Das baut maximales Vertrauen auf.`
    },
    emails: [
      {
        option: "A",
        type: "Nutzen- & Problemfokus",
        subject: "Ungeplante Stillstände bei [Firmenname] reduzieren / Frage zur Instandhaltung",
        body: `Hallo Herr/Frau [Nachname],

ich sehe auf Ihrem Profil, dass Sie bei [Firmenname] die Produktion leiten. In der aktuellen Wirtschaftslage ist die maximale Verfügbarkeit Ihrer Anlagen ohne teure Zwischenfälle vermutlich einer Ihrer stärksten Hebel.

Wir unterstützen Fertigungsbetriebe in der Metallverarbeitung dabei, drohende Maschinenschäden bis zu 14 Tage vor dem Ausfall präzise vorherzusagen – herstellerübergreifend und ohne langwierige IT-Projekte. Unsere Partner senken ungeplante Stillstandszeiten dadurch um durchschnittlich 35 %.

Ist das Thema „vorausschauende Wartung“ bei Ihnen derzeit ein Thema auf der Agenda?

Beste Grüße
[Ihr Name]`
      },
      {
        option: "B",
        type: "Case Study / Social Proof",
        subject: "Referenz: 38.000 € Wartungskosten eingespart bei [Vergleichbares Unternehmen]",
        body: `Hallo Herr/Frau [Nachname],

als Produktionsleiter stehen Sie sicherlich täglich vor der Herausforderung, trotz Instandhalter-Mangel eine hohe OEE zu sichern. 

Wir haben kürzlich bei [Referenzkunde/Vergleichbarer Betrieb] die Kernspindeln digital nachgerüstet. Ergebnis im ersten Quartal: Ein drohender Getriebeschaden wurde 9 Tage vor Ausfall erkannt – Ersparnis allein bei diesem Vorfall: ca. 38.000 € an Reparatur- und Stillstandskosten.

Wir haben die Fallstudie kurz zusammengefasst. Darf ich Ihnen das 2-seitige PDF kurz per Mail rüberschicken?

Beste Grüße
[Ihr Name]`
      },
      {
        option: "C",
        type: "Soft Outreach / Beziehungsaufbau",
        subject: "Erfahrungsaustausch: Fachkräftemangel in der Instandhaltung bei [Firmenname]",
        body: `Hallo Herr/Frau [Nachname],

ich wende mich an Sie, da Sie bei [Firmenname] tief im operativen Instandhaltungsgeschäft verankert sind.

Viele Ihrer Kollegen im Maschinenbau berichten uns aktuell, dass sie durch den Renteneintritt erfahrener Techniker massives Know-how verlieren und nur noch „Brände löschen“. Wir untersuchen derzeit in einer Studie, wie smarte Sensorik diesen Wissenstransfer teilautomatisieren kann.

Hätten Sie nächste Woche Zeit für ein kurzes, 7-minütiges Telefonat, um Ihre Perspektive zu teilen? Im Gegenzug senden wir Ihnen gerne die anonymisierten Ergebnisse der Studie zu.

Beste Grüße
[Ihr Name]`
      }
    ],
    objections: [
      {
        title: "„Unsere Maschinen sind zu alt und nicht kompatibel.“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Das verstehe ich vollkommen. Ein Großteil der DACH-Fertigungsanlagen ist historisch gewachsen und nicht ab Werk vernetzt.“\n2. *Explore:* „Welche Baujahre machen denn bei Ihnen den Kern der produktionskritischen Anlagen aus?“\n3. *Respond:* „Genau dafür haben wir unsere Lösung entwickelt. Wir greifen nicht in die SPS-Steuerung ein, sondern kleben magnetische Vibrations-Sensoren außen an. Damit machen wir selbst 25 Jahre alte Fräsmaschinen innerhalb von 30 Minuten fit für Predictive Maintenance.“"
      },
      {
        title: "„Dafür hat unsere Instandhaltungstruppe gerade gar keine Zeit.“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Absolut verständlich. Die Instandhaltung arbeitet im Moment überall am Limit und löscht nur noch Brände.“\n2. *Explore:* „Wie viel Zeit verbringt Ihr Team aktuell wöchentlich mit der bloßen Suche nach Fehlerursachen?“\n3. *Respond:* „Unsere Software nimmt Ihnen diese Suche ab. Statt stundenlanger Diagnose zeigt das System sofort: 'Lagerschaden an Spindel 3, Ersatzteil X benötigt'. Wir übernehmen die komplette Installation schlüsselfertig. Ihr Team spart ab Tag 1 Arbeitszeit.“"
      },
      {
        title: "„Die Software ist uns zu teuer (Kein Budget für SaaS).“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Ein berechtigter Punkt. Jede Investition muss sich heute direkt rechtfertigen.“\n2. *Explore:* „Was hat Sie Ihr letzter ungeplanter Stillstand an der Hauptmaschine gekostet, inklusive Logistik-Verzug?“\n3. *Respond:* „Ein einziger verhinderter Ausfall amortisiert die Jahreslizenz. Wir fangen mit einem risikofreien Piloten für eine Maschine an. Wenn wir keinen Mehrwert nachweisen, beenden wir das Projekt.“"
      }
    ],
    followup: [
      {
        day: "Tag 3",
        title: "LinkedIn-Vernetzung & Value Add",
        content: "Sende eine LinkedIn-Einladung ohne Verkaufsabsicht. Nutze eine kurze Notiz wie: \n*„Hallo [Name], danke für das angenehme Telefonat gestern. Wie versprochen sende ich Ihnen hier den Link zur erwähnten Case Study über Sensor-Retrofitting. Beste Grüße, [Ihr Name]“*"
      },
      {
        day: "Tag 7",
        title: "Die ROI-Gegenüberstellung (E-Mail)",
        content: "Sende eine kurze E-Mail mit der Aufbereitung der potenziellen Einsparpotenziale (basierend auf dem ROI-Rechner):\n*„Hallo [Name], ich habe die Kennzahlen Ihrer Fräslinie kurz durchgerechnet. Bei einer Reduktion der Ausfälle um 35 % sparen Sie jährlich ca. 37.000 € ein. Sollen wir in einem kurzen 10-Minuten-Call prüfen, ob diese Zahlen auf Ihr Werk übertragbar sind? [Ihr Name]“*"
      },
      {
        day: "Tag 14",
        title: "Der 'Sanfte Ausstieg' (Telefon)",
        content: "Rufe direkt an, um eine Entscheidung zu forcieren:\n*„Herr [Name], ich wollte mich kurz nach unserem Angebot erkundigen. Wenn das Thema Instandhaltung aktuell keine Priorität hat, ist das völlig in Ordnung. Sollen wir das Thema für dieses Quartal auf Eis legen oder macht ein kurzer Testlauf auf einer Maschine jetzt Sinn?“*"
      }
    ]
  },
  
  logistics_ai: {
    title: "Logistik-KI für Speditionen",
    industry: "Transport- und Logistikunternehmen, Speditionen (Flottengröße 50–300 Lkw, DACH-Region)",
    product: "KI-gestützte SaaS-Plattform zur dynamischen Routen- und Kapazitätsoptimierung",
    model: "B2B",
    roi_defaults: {
      ek: 80,
      uvp: 199,
      monthly_qty: 250,
      pos_boost: 35,
      cross_selling: 15
    },
    modules: {
      module1: `### MODUL 1: BEDARFSERMITTLUNG & SCHMERZPUNKTE (PAIN POINTS)

*   **Status Quo der Branche:**
    *   **Extremer Fahrermangel:** Speditionen können Aufträge nicht annehmen, weil Lkw stillstehen. Fahrerzufriedenheit ist geschäftskritisch geworden (Fahrer wollen pünktlich Feierabend machen).
    *   **Steigende Maut- und Treibstoffkosten:** Die Mauterhöhungen und CO2-Abgaben drücken die Margen massiv nach unten. Leerkilometer sind reine Geldverbrennung.
    *   **Manuelle, langsame Disposition:** Disponenten planen Routen manuell per Excel und Telefon. Bei Stau oder plötzlichen Auftragsänderungen bricht das Konstrukt zusammen.

*   **Problem-Markt-Fit:**
    Die Plattform löst das Problem der **ineffizienten Flottenauslastung** und **hohen Leerkilometer-Quote** (oft 15–20 %). Sie berechnet in Sekundenschnelle optimale Routenkombinationen, berücksichtigt Fahrzeiten sowie Ladefenster und reduziert CO2-Emissionen und Fahrzeiten drastisch.

*   **Triggermomente (Wann kauft der Kunde?):**
    *   **Mauterhöhungen / neue Steuern:** Die Spedition spürt einen massiven Gewinneinbruch durch gestiegene Transportnebenkosten.
    *   **Kundenverlust wegen Unpünktlichkeit:** Ein wichtiger Großkunde droht abzuwandern, weil Lieferzeitfenster (ETA) wiederholt nicht eingehalten wurden.
    *   **Überlastung der Disposition:** Mehrere Disponenten kündigen oder fallen krankheitsbedingt aus, wodurch die verbleibende Mannschaft den Workload kaum noch schafft.`,
      
      module_fit: `### MODUL 2: PRODUKT-BRANCHEN-FIT (EIGNUNGS-ARGUMENTE)

*   **Argument 1: Kompensation der Maut-Erhöhungen**
    Die Mauterhöhungen in der DACH-Region haben die Transportkosten massiv getrieben. Unsere KI senkt die Leerkilometer direkt um 15-20 %, was diese Kostensteigerung für den Spediteur vollständig kompensiert.
*   **Argument 2: Stressreduktion in der Disposition**
    Disponenten verbringen 80 % ihrer Zeit mit manuellem Abgleich und Notfall-Telefonaten. Unsere Plattform automatisiert die Routenberechnung in Echtzeit, wodurch Disponenten entlastet werden und sich um Kundenpflege kümmern können.
*   **Argument 3: Höhere Fahrerzufriedenheit**
    Durch optimierte Routenplanung und Einhaltung exakter Ladefenster stehen Fahrer weniger im Stau und an Rampen herum. Sie sind pünktlicher zu Hause – ein unschätzbarer Vorteil im Wettbewerb um gute Fahrer.
*   **Argument 4: Echtzeit-ETA für A-Kunden**
    Großkunden fordern minutengenaue Lieferprognosen. Die Software berechnet die Ankunftszeit (ETA) dynamisch unter Einbezug von Verkehrs- und Wetterdaten und informiert den Kunden vollautomatisch bei Abweichungen.
*   **Argument 5: Schnittstellen-Kompatibilität**
    Die Plattform lässt sich über native APIs mit allen gängigen Telematik-Systemen (z.B. Webfleet) und ERPs (z.B. LIS) verbinden, ohne dass bestehende Hard- oder Software ausgetauscht werden muss.`,
      
      module2: `### MODUL 3: BRAUCHBARKEIT & MARKTVALIDIERUNG (EVALUATION)

*   **Brauchbarkeits-Score: 9.5 / 10**
    *Begründung:* Logistik ist ein reines Mengengeschäft mit hauchdünnen Margen. Jeder Prozentpunkt Optimierung fließt direkt in den Gewinn. Die Software löst existenzielle Probleme (Kosten, Personalmangel) und amortisiert sich extrem schnell.

*   **ROI- & Wert-Argumentation:**
    *   **Geldwert:** Reduktion der Leerkilometer um 15 %. Bei 100 Lkw spart das im Jahr etwa **120.000 € bis 180.000 €** an reinem Kraftstoff und Verschleiß.
    *   **Zeit:** Die Dispositionszeit pro Tour schrumpft von 30 Minuten auf unter 3 Minuten.
    *   **Risiko:** Präzise Live-ETA-Berechnung senkt Reklamationen und Pönalen wegen verspäteter Lieferungen um 80 %.`,
      
      module3: `### MODUL 4: STRATEGISCHES SALES- & GO-TO-MARKET-KONZEPT

*   **Ideal Customer Profile (ICP):**
    *   **Rolle:** Geschäftsführung (Speditionsinhaber) oder Logistikleitung.
    *   **Prioritäten:** Margensicherung, Fahrerbindung, Senkung der Flottenkosten, Automatisierung der Prozesse.
    *   **Motivationsfaktoren:** Wettbewerbsfähigkeit sichern, Expansionsmöglichkeiten trotz Fahrermangel schaffen.

*   **Positionierung / Hook (1-Satz-Pitch):**
    *„Wir helfen Transportunternehmen mit eigener Flotte, ihre Leerkilometer um 15 % zu senken und die Disposition vollständig zu automatisieren, sodass Sie trotz Fahrermangels mehr Aufträge profitabel abwickeln können.“*

*   **Empfohlener Vertriebskanal:**
    *   **Klassische Kaltakquise via Telefon (Cold Calling):** Disponenten und Spediteure sind Macher und telefonisch sehr gut erreichbar.
    *   **Direkte Online-Demotermine:** In einem 30-mitügen Video-Call wird eine historische Route der Spedition hochgeladen und live optimiert gezeigt – der Vorher-Nachher-Vergleich zeigt die Ersparnis sofort schwarz auf weiß.`
    },
    emails: [
      {
        option: "A",
        type: "Nutzen- & Problemfokus",
        subject: "Mautkosten kompensieren: 15 % weniger Leerkilometer für [Firmenname]",
        body: `Hallo Herr/Frau [Nachname],

die jüngsten Mauterhöhungen und der anhaltende Fahrermangel verringern den Spielraum im Transportgeschäft massiv. Wer jetzt Leerfahrten nicht vermeidet, verliert bares Geld.

Mit unserer KI-gestützten Dispositions-Plattform helfen wir Speditionen wie [Referenzkunde] dabei, ihre Flottenauslastung so zu optimieren, dass Leerfahrten im Schnitt um 15 % reduziert und die Planungszeit der Disponenten halbiert wird.

Wenn Sie eine historische Tour von Ihnen nehmen würden – hätten Sie Interesse an einer unverbindlichen Gegenüberstellung, was unsere KI an Kilometern und Kosten eingespart hätte?

Beste Grüße
[Ihr Name]`
      },
      {
        option: "B",
        type: "Case Study / Social Proof",
        subject: "[Fallstudie] Wie die Spedition [Name] 2.100 km Leerfahrten pro Woche eliminierte",
        body: `Hallo Herr/Frau [Nachname],

Sie kennen das: Trotz guter Auslastung fährt ein Teil Ihrer Flotte leer zurück, weil die Rückladungen manuell nicht schnell genug organisiert werden konnten.

Die Spedition [Referenzpartner] nutzt unsere dynamische Routenoptimierung und konnte die Leerkilometer-Quote innerhalb von 3 Monaten von 18 % auf unter 12 % drücken. Das entspricht einer Maut- und Kraftstoffersparnis von ca. 8.400 € pro Monat bei 50 Lkws.

Ich würde Ihnen gerne zeigen, wie wir das bei [Referenzpartner] angebunden haben. Hätten Sie diese Woche Donnerstag Zeit für ein kurzes 10-Minuten-Telefonat?

Beste Grüße
[Ihr Name]`
      },
      {
        option: "C",
        type: "Soft Outreach / Beziehungsaufbau",
        subject: "Rampenwartezeiten reduzieren bei [Firmenname]",
        body: `Hallo Herr/Frau [Nachname],

ich kontaktiere Sie, da Sie bei [Firmenname] die Logistik leiten. Fahrer beschweren sich derzeit branchenweit über unvorhersehbare Wartezeiten an den Rampen, was die gesetzlichen Lenkzeiten sprengt.

Wir haben ein kurzes Whitepaper verfasst, wie Speditionen durch vorausschauende ETA-Berechnungen die Standzeiten an den Be- und Entladestellen um bis zu 40 % verringern können. 

Wenn Sie das Thema interessiert, schicke ich Ihnen gerne ein kostenloses Exemplar per Mail zu. Kurzes 'Ja' genügt.

Beste Grüße
[Ihr Name]`
      }
    ],
    objections: [
      {
        title: "„Unsere Disponenten kennen die Touren besser als jede KI.“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Das bezweifle ich keine Sekunde. Die Erfahrung Ihrer Disponenten und das Vertrauen der Fahrer ist durch nichts zu ersetzen.“\n2. *Explore:* „Wie viel Zeit verbringen Ihre Planer täglich mit manuellen Telefonaten, um Rückladungen abzugleichen?“\n3. *Respond:* „Unsere KI ersetzt den Disponenten nicht, sondern arbeitet ihm zu. Während der Planer telefoniert, berechnet die KI im Hintergrund 5.000 mögliche Kombinationen in Echtzeit und schlägt die 3 profitabelsten Touren vor. Der Disponent entscheidet – die KI rechnet.“"
      },
      {
        title: "„Die Anbindung an unsere Telematik ist viel zu kompliziert.“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Ein absolut kritischer Punkt. Niemand will ein IT-Projekt, das monatelang die Ressourcen blockiert.“\n2. *Explore:* „Welche Telematik-Boxen haben Sie aktuell in Ihren Lkw verbaut?“\n3. *Respond:* „Wir haben fertige Standard-APIs für über 40 Anbieter. Die Einrichtung dauert weniger als 4 Stunden und erfordert keine Installation auf den Endgeräten. Wir ziehen uns die GPS-Daten einfach direkt vom Server.“"
      },
      {
        title: "„Unsere Fahrer wollen keine Überwachungs-App nutzen.“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Sehr wichtiges Thema. Die Fahrer sind Ihr wertvollstes Gut und müssen sich wohlfühlen.“\n2. *Explore:* „Was sind die größten Beschwerden Ihrer Fahrer nach einer Tour?“\n3. *Respond:* „Meistens sind es Staus und ungeplante Wartezeiten. Unsere App überwacht den Fahrer nicht, sondern optimiert seine Ankunft. Sie leitet ihn stressfrei um Staus herum und sorgt dafür, dass er pünktlich zum Feierabend zurück auf dem Hof ist. Das steigert die Zufriedenheit massiv.“"
      }
    ],
    followup: [
      {
        day: "Tag 3",
        title: "Angebots-Besprechung (E-Mail)",
        content: "Nachfassen bezüglich des übersandten Test-Angebots:\n*„Hallo [Name], konnten Sie das Angebot zur Live-Challenge bereits kurz sichten? Ich würde Ihnen vorschlagen, dass wir die Testdaten von 5 Lkw aus Ihrem System exportieren und die Berechnung morgen früh live vergleichen. Passt Ihnen 10 Uhr? [Ihr Name]“*"
      },
      {
        day: "Tag 7",
        title: "Value Case: Treibstoffersparnis aufzeigen",
        content: "Bereite eine kurze Beispielrechnung für den Kunden vor und schicke sie per LinkedIn:\n*„Hallo [Name], basierend auf unserem Gespräch habe ich kalkuliert: Schon bei nur 500 km weniger Leerfahrten pro Lkw/Monat spart Ihre Flotte bei 80 Lkw ca. 4.800 Liter Diesel im Monat. Wollen wir diese Kosten senken? Beste Grüße, [Ihr Name]“*"
      },
      {
        day: "Tag 14",
        title: "Dringlichkeit erzeugen (Telefon)",
        content: "Fokus auf die steigenden Mautkosten setzen:\n*„Herr [Name], da die Mautabrechnung nächsten Monat wieder fällig wird: Möchten Sie die nächste Charge komplett manuell disponieren oder wollen wir die ersten 10 Fahrzeuge mit der KI-Planung optimieren, um die Mautbelastung direkt zu senken?“*"
      }
    ]
  },
  
  hr_recruiting: {
    title: "HR Recruiting SaaS für Mittelstand",
    industry: "Mittelständische Unternehmen (150–800 Mitarbeiter, Branchen: IT, Dienstleistung, Engineering, DACH)",
    product: "KI-basiertes Bewerbermanagement-System (ATS) mit automatisiertem CV-Parsing und Talent-Matching",
    model: "B2B",
    roi_defaults: {
      ek: 25,
      uvp: 59,
      monthly_qty: 400,
      pos_boost: 40,
      cross_selling: 8
    },
    modules: {
      module1: `### MODUL 1: BEDARFSERMITTLUNG & SCHMERZPUNKTE (PAIN POINTS)

*   **Status Quo der Branche:**
    *   **Time-to-Hire ist viel zu hoch:** Offene Stellen bleiben monatelang unbesetzt. Abteilungen arbeiten unterbesetzt, was zu Frust, Überlastung und Umsatzverlusten führt.
    *   **Inundation durch unpassende Bewerbungen:** Auf "einfache" Jobs kommen Hunderte Bewerbungen, während für Fachkraftstellen fast nichts reinkommt. HR-Mitarbeiter verbringen Stunden mit dem manuellen Sichten ungeeigneter Lebensläufe.
    *   **Schlechte Candidate Experience:** Langsame Antwortzeiten vergraulen Top-Kandidaten, die in der Zwischenzeit Angebote von schnelleren Wettbewerbern annehmen.

*   **Problem-Markt-Fit:**
    Das System löst das Problem der **langsamen und ineffizienten Rekrutierungsprozesse**. Es analysiert Bewerbungen in Sekundenschnelle, bewertet die Eignung objektiv anhand der Stellenanforderungen und schlägt dem HR-Team die Top-5-Kandidaten inklusive vorformulierter, personalisierter Antwort-Mails vor.

*   **Triggermomente (Wann kauft der Kunde?):**
    *   **Kritischer Umsatzverlust:** Ein wichtiges Kundenprojekt kann nicht gestartet oder verlängert werden, weil die dafür benötigten 3 Softwareentwickler oder Ingenieure seit 6 Monaten nicht gefunden werden.
    *   **Kündigung im HR-Team:** Der Recruiting-Verantwortliche verlässt das Unternehmen, und die verbleibende Kraft schafft das Bewerberaufkommen manuell nicht mehr.
    *   **Geplantes Unternehmenswachstum:** Die Geschäftsführung kündigt an, das Team im nächsten Jahr um 30 % vergrößern zu wollen – die Inhouse-Recruiter schlagen Alarm, dass die aktuellen Prozesse das nicht hergeben.`,
      
      module_fit: `### MODUL 2: PRODUKT-BRANCHEN-FIT (EIGNUNGS-ARGUMENTE)

*   **Argument 1: Drastische Senkung der Cost of Vacancy**
    Jeder Tag, an dem eine Schlüsselstelle (z. B. Ingenieur, Entwickler) unbesetzt bleibt, kostet mittelständische Betriebe Hunderte Euro an entgangenem Umsatz. Unser System verkürzt die Time-to-Hire um durchschnittlich 50 %, was direkt die Vakanzkosten minimiert.
*   **Argument 2: Automatisierung des lästigen CV-Screenings**
    HR-Mitarbeiter verbringen Stunden mit dem manuellen Sichten unpassender Bewerbungen. Die KI liest Lebensläufe in Echtzeit aus und sortiert sie nach Relevanz vor, sodass Personaler sich voll auf die persönlichen Gespräche konzentrieren können.
*   **Argument 3: Erstklassige Candidate Experience**
    Top-Kandidaten sind heiß begehrt. Wenn ein Bewerber sonntags seine Unterlagen sendet, erhält er dank unserer KI bereits am Montagmorgen ein personalisiertes Feedback oder eine direkte Einladung zum Erstgespräch. Das sichert den Vorsprung gegenüber trägen Wettbewerbern.
*   **Argument 4: Datenschutzkonformes KI-Matching**
    Die strengen Vorgaben der DSGVO verunsichern mittelständische Unternehmen. Unsere Software wird zu 100 % auf Servern in Deutschland gehostet und bewertet rein nach fachlichen Qualifikationen – diskriminierungsfrei und rechtssicher.
*   **Argument 5: Einfache Integration in bestehende IT**
    Wir verlangen keinen aufwendigen Systemwechsel. Die Software dockt über standardisierte Schnittstellen an bestehende Systeme wie Personio oder Datev an.`,
      
      module2: `### MODUL 3: BRAUCHBARKEIT & MARKTVALIDIERUNG (EVALUATION)

*   **Brauchbarkeits-Score: 8.5 / 10**
    *Begründung:* Der Nutzwert ist extrem hoch, da Recruiting im Fachkräftemangel über die Existenzfähigkeit eines Unternehmens entscheidet. Ein kleiner Abzug erfolgt, weil der Erfolg stark von der Qualität der eingehenden Bewerbungen und dem allgemeinen Arbeitgeber-Branding abhängt (die KI kann keine Bewerber herbeizaubern, aber sie filtert und beschleunigt den Prozess enorm).

*   **ROI- & Wert-Argumentation:**
    *   **Zeitersparnis:** Reduktion des Sichtungsaufwands pro Bewerbung um 75 % (von durchschnittlich 12 Minuten auf 3 Minuten).
    *   **Geldwert:** Verkürzung der Time-to-Hire von 90 auf 45 Tage. Bei einer offenen Position im Wert von 6.000 € Bruttogehalt spart das Einsparen von 45 Tagen Vakanzkosten rund **9.000 € pro Stelle** (Vakanzkosten-Berechnung nach dem Cost-of-Vacancy-Modell).
    *   **Qualität:** Geringere Fluktuation durch präziseres Talent-Matching.`,
      
      module3: `### MODUL 4: STRATEGISCHES SALES- & GO-TO-MARKET-KONZEPT

*   **Ideal Customer Profile (ICP):**
    *   **Rolle:** HR-Leitung (Chief People Officer) / Personalleitung oder Head of Talent Acquisition. Bei kleineren Firmen direkt die Geschäftsführung.
    *   **Prioritäten:** Time-to-Hire senken, Qualität der Einstellungen erhöhen, HR-Prozesse digitalisieren, Candidate Experience verbessern.
    *   **Motivationsfaktoren:** Entlastung des Teams, Anerkennung durch die Geschäftsführung für schnelles Besetzen kritischer Positionen.

*   **Positionierung / Hook (1-Satz-Pitch):**
    *„Wir helfen mittelständischen Wachstumsunternehmen, ihre Time-to-Hire für Fachkräfte durch KI-gestütztes Talent-Matching zu halbieren, damit HR-Teams 75 % weniger Zeit mit unpassenden Bewerbungen verschwenden.“*

*   **Empfohlener Vertriebskanal:**
    *   **LinkedIn-Outreach & Content Marketing:** Personaler sind extrem aktiv auf LinkedIn. Das Teilen von Recruiting-Tipps und Case Studies baut Autorität auf.
    *   **Kostenloser Talent-Audit-Call:** Einladung zu einem 20-minütigen Gespräch, in dem das aktuelle Bewerbungsverfahren analysiert wird und Schwachstellen im Bewerberfluss (Drop-off Rates) aufgezeigt werden.`
    },
    emails: [
      {
        option: "A",
        type: "Nutzen- & Problemfokus",
        subject: "Offene Stellen schneller besetzen / HR-Entlastung bei [Firmenname]",
        body: `Hallo Herr/Frau [Nachname],

ich verfolge das Wachstum von [Firmenname] und habe gesehen, dass Sie derzeit einige anspruchsvolle Positionen (u.a. im Bereich [Bereich, z.B. IT/Engineering]) ausschreiben.

Viele HR-Verantwortliche im Mittelstand spüren gerade, dass der Bewerbungsprozess zu viel manuelle Zeit frisst und Top-Kandidaten abwandern, wenn Antworten länger als eine Woche dauern.

Mit unserer Matching-Software helfen wir HR-Teams, qualifizierte Profile in Sekundenschnelle zu identifizieren und die Time-to-Hire um 50 % zu senken. Das Ganze lässt sich nahtlos in Ihre HR-Systeme integrieren.

Hätten Sie nächste Woche Zeit für einen kurzen, 10-minütigen Impuls-Austausch, wie andere mittelständische Betriebe das aktuell lösen?

Beste Grüße
[Ihr Name]`
      },
      {
        option: "B",
        type: "Case Study / Social Proof",
        subject: "Wie [Konkurrent/Vergleichbares Unternehmen] die Time-to-Hire von 94 auf 41 Tage senkte",
        body: `Hallo Herr/Frau [Nachname],

wer Fachkräfte sucht, kämpft meist nicht mit zu wenigen Bewerbungen, sondern mit dem zeitaufwendigen Filtern der unpassenden Profile.

Das Engineering-Unternehmen [Name] stand vor dem gleichen Problem. Durch unser automatisiertes Lebenslauf-Matching konnte das HR-Team den Screening-Aufwand um 75 % reduzieren. Dadurch wurden kritische Entwickler-Stellen statt in 3 Monaten in nur noch 6 Wochen besetzt.

Ich würde Ihnen gerne in einer kurzen Live-Demo zeigen, wie die KI Lebensläufe bewertet. Hätten Sie diese Woche Dienstag um 14 Uhr Zeit?

Beste Grüße
[Ihr Name]`
      },
      {
        option: "C",
        type: "Soft Outreach / Beziehungsaufbau",
        subject: "Anfrage zu Ihren Erfahrungen im Recruiting bei [Firmenname]",
        body: `Hallo Herr/Frau [Nachname],

ich forsche derzeit zur Weiterentwicklung der Candidate Experience im deutschen Mittelstand und bin auf Ihr HR-Profil aufmerksam geworden.

Viele Personalleiter berichten mir, dass Kandidaten abspringen, weil die internen Fachbereiche zu lange für die Rückmeldung zu den Lebensläufen brauchen. Wir untersuchen Lösungen, wie man diese Fachbereichs-Freigabe automatisiert beschleunigen kann.

Darf ich Ihnen die 3 wichtigsten Learnings unserer aktuellen Studie als kurze Übersicht zusenden? Ein einfaches 'Ja' reicht vollkommen aus.

Beste Grüße
[Ihr Name]`
      }
    ],
    objections: [
      {
        title: "„Wir wollen keine kalte KI, die über Menschen entscheidet.“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Das sehe ich absolut genauso. Recruiting ist und bleibt ein People-Business. Sympathie und Kulturfit kann nur ein Mensch beurteilen.“\n2. *Explore:* „Wie viel Prozent Ihrer Arbeitszeit verbringen Sie aktuell mit rein administrativem Sortieren von Absagen?“\n3. *Respond:* „Unsere KI trifft keine Einstellungsentscheidungen. Sie sortiert lediglich Profile vor, die fachlich gar nicht passen (z.B. fehlende Sprachkenntnisse oder Zertifikate). Dadurch gewinnen Sie die Zeit zurück, um sich voll auf die persönlichen Gespräche mit den passenden Kandidaten zu konzentrieren.“"
      },
      {
        title: "„Wir nutzen bereits ein Bewerbermanagement-System (ATS).“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Sehr gut, das zeigt, dass Sie Ihre Prozesse bereits digitalisiert haben.“\n2. *Explore:* „Welches System nutzen Sie aktuell und wie zufrieden sind Ihre Fachbereiche mit der Qualität der vorgeschlagenen Kandidaten?“\n3. *Respond:* „Sie müssen Ihr bestehendes System nicht ablösen. Wir fungieren als intelligentes Add-on über eine API-Schnittstelle. Wir werten die Lebensläufe in Ihrem aktuellen System aus und reichern sie mit unserem Matching-Score an, ohne Ihren Workflow zu stören.“"
      },
      {
        title: "„Der Betriebsrat wird einer KI-Vorauswahl niemals zustimmen.“",
        content: "**Konter-Strategie (LAER-Methode):**\n\n1. *Listen/Acknowledge:* „Ein sehr wichtiger Einwand. Der Betriebsrat muss hier von Anfang an mitgenommen werden.“\n2. *Explore:* „Welche Bedenken bezüglich Transparenz wurden bei Ihnen im Haus bereits geäußert?“\n3. *Respond:* „Unser Matching ist vollkommen transparent. Die KI bewertet ausschließlich harte, sachbezogene Kriterien der Stellenbeschreibung. Wir haben bereits vorgefertigte Betriebsvereinbarungen und Datenschutzblätter für den Betriebsrat vorbereitet, die die DSGVO-Konformität und Fairness nachweisen.“"
      }
    ],
    followup: [
      {
        day: "Tag 3",
        title: "Demo-Nachbereitung (E-Mail)",
        content: "Nachfassen nach der Live-Präsentation:\n*„Hallo [Name], danke für das konstruktive Feedback gestern. Wie besprochen habe ich den Zugang für die 14-tägige Testphase für Ihre offene Stelle [Position] eingerichtet. Sie können Ihre Inbound-Bewerbungen ab sofort einlaufen lassen. Lassen Sie uns an Tag 7 kurz abstimmen! [Ihr Name]“*"
      },
      {
        day: "Tag 7",
        title: "Der 'Candidate Care'-Hinweis",
        content: "Sende einen wertvollen Tipp via LinkedIn:\n*„Hallo [Name], mir ist aufgefallen, dass Sie auf Ihrer Karriere-Website noch kein automatisiertes Eingangs-Feedback nutzen. Top-Talente springen ab, wenn sie 48 Stunden nichts hören. Das lässt sich mit unserem Tool in 5 Minuten beheben. Wollen wir das kurz einrichten? Beste Grüße, [Ihr Name]“*"
      },
      {
        day: "Tag 14",
        title: "Testphasen-Closing (Telefon)",
        content: "Fokus auf die Ergebnisse der Testphase legen:\n*„Herr [Name], die 14 Tage Testphase für die [Position] sind um. Wir haben 12 Kandidaten bewertet und 3 Top-Kandidaten identifiziert. Wie liefen die Erstgespräche mit den dreien und wollen wir die anderen offenen Stellen ebenfalls live schalten?“*"
      }
    ]
  }
};

// Expose to the global scope so the ES-module app.js (loaded with
// `type="module"`, which does not share top-level `const` bindings with
// classic scripts) can read the prepackaged demo data.
window.PREPACKAGED_DEMOS = PREPACKAGED_DEMOS;
