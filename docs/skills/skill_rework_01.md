
⸻

name: idea-step
description: “Du MUSST diesen Skill vor jeder Spezifikationserstellung, Feature-Definition oder Lösungsbeschreibung verwenden. Er hilft dabei, aus einer groben Produktidee Schritt für Schritt ein klares, belastbares Idea-Outcome für Product-Spec-Agent zu entwickeln.”

Vom Produktimpuls zur klaren Idee

Hilf Product Ownern dabei, aus einer ersten Idee ein verständliches, strukturiertes und entscheidungsfähiges Produktkonzept zu entwickeln.
Der Fokus liegt im Idea Step: Problem verstehen, Zielbild schärfen, Annahmen sichtbar machen, Optionen vergleichen und daraus eine belastbare Grundlage für die Spezifikation schaffen.

Starte immer damit, den Kontext der Idee zu verstehen. Stelle danach gezielte Fragen – eine nach der anderen –, um Absicht, Problemraum, Zielgruppe, Nutzen, Grenzen und Erfolgskriterien sauber herauszuarbeiten.
Sobald klar ist, was gebaut werden soll und warum, fasse die Idee strukturiert zusammen, stelle mögliche Richtungen vor und hole eine Bestätigung ein.

<HARD-GATE>
Führe KEINE Spezifikationserstellung, KEINE technische Planung, KEINE Implementierung, KEINE Code-Erzeugung und KEIN Scaffolding aus, bevor die Idee klar beschrieben, als Lösungsrichtung abgestimmt und vom Nutzer bestätigt wurde.
Das gilt IMMER – auch bei scheinbar kleinen oder einfachen Vorhaben.
</HARD-GATE>


Anti-Pattern: “Das ist doch zu klein für einen sauberen Idea Step”

Jede Produktidee durchläuft diesen Schritt.
Auch ein kleines Feature, eine einzelne Funktion oder eine kleine Prozessverbesserung braucht zuerst ein gemeinsames Verständnis von Problem, Ziel und Nutzen. Gerade bei „einfachen“ Vorhaben entstehen die meisten Missverständnisse durch unausgesprochene Annahmen.

Der Umfang des Idea Steps darf klein sein, wenn das Thema klein ist – aber er darf nicht übersprungen werden.

Checklist

Du MUSST für jeden dieser Punkte eine Aufgabe anlegen und sie in dieser Reihenfolge bearbeiten:
1.	Kontext verstehen — vorhandene Beschreibung, Notizen, Ziele, frühere Entscheidungen oder Projektrahmen prüfen
2.	Visuelle Unterstützung anbieten (falls die Idee stark visuell ist) — als eigene Nachricht, nicht kombiniert mit einer Frage
3.	Klärungsfragen stellen — immer nur eine Frage pro Nachricht, um Zweck, Zielgruppe, Problem, Einschränkungen und Erfolgskriterien zu verstehen
4.	2-3 Produktansätze vorschlagen — mit Vor- und Nachteilen sowie einer Empfehlung
5.	Idea Summary präsentieren — in klaren Abschnitten, passend zur Komplexität, und Rückmeldung einholen
6.	Idea-Dokument schreiben — als strukturierte Grundlage für den nächsten Schritt speichern
7.	Selbstprüfung durchführen — auf Lücken, Widersprüche, Unklarheiten und unnötigen Scope prüfen
8.	Nutzer prüft die Idea Summary — vor dem Übergang in die Spezifikation
9.	Übergang zur Spezifikation — erst danach in den Spec-Schritt wechseln

Prozessfluss

digraph idea_step {
"Kontext verstehen" [shape=box];
"Visuelle Fragen zu erwarten?" [shape=diamond];
"Visuelle Unterstützung anbieten\n(eigene Nachricht)" [shape=box];
"Klärungsfragen stellen" [shape=box];
"2-3 Produktansätze vorschlagen" [shape=box];
"Idea Summary präsentieren" [shape=box];
"Nutzer bestätigt Richtung?" [shape=diamond];
"Idea-Dokument schreiben" [shape=box];
"Selbstprüfung\n(inline korrigieren)" [shape=box];
"Nutzer prüft Idea Summary?" [shape=diamond];
"Übergang in den Spec Step" [shape=doublecircle];

    "Kontext verstehen" -> "Visuelle Fragen zu erwarten?";
    "Visuelle Fragen zu erwarten?" -> "Visuelle Unterstützung anbieten\n(eigene Nachricht)" [label="ja"];
    "Visuelle Fragen zu erwarten?" -> "Klärungsfragen stellen" [label="nein"];
    "Visuelle Unterstützung anbieten\n(eigene Nachricht)" -> "Klärungsfragen stellen";
    "Klärungsfragen stellen" -> "2-3 Produktansätze vorschlagen";
    "2-3 Produktansätze vorschlagen" -> "Idea Summary präsentieren";
    "Idea Summary präsentieren" -> "Nutzer bestätigt Richtung?";
    "Nutzer bestätigt Richtung?" -> "Idea Summary präsentieren" [label="nein, überarbeiten"];
    "Nutzer bestätigt Richtung?" -> "Idea-Dokument schreiben" [label="ja"];
    "Idea-Dokument schreiben" -> "Selbstprüfung\n(inline korrigieren)";
    "Selbstprüfung\n(inline korrigieren)" -> "Nutzer prüft Idea Summary?";
    "Nutzer prüft Idea Summary?" -> "Idea-Dokument schreiben" [label="Änderungen gewünscht"];
    "Nutzer prüft Idea Summary?" -> "Übergang in den Spec Step" [label="freigegeben"];
}

Der Endzustand ist der Übergang in den Spec Step.
Vorher darf KEIN Spec, KEIN Plan und KEINE Implementierung gestartet werden.

Der Prozess

1. Die Idee verstehen
   •	Prüfe zuerst den vorhandenen Produktkontext
   •	Verstehe, welche Ausgangsidee bereits existiert
   •	Prüfe früh, ob das Vorhaben zu groß für einen einzelnen Idea Step ist
   •	Wenn mehrere unabhängige Themen vermischt sind, hilf bei der Zerlegung in Teilideen
   •	Bearbeite anschließend nur die erste sinnvolle Teilidee vollständig

Wenn das Vorhaben passend geschnitten ist:
•	Stelle Fragen eine nach der anderen
•	Nutze bevorzugt Multiple-Choice-Fragen, wenn das hilft
•	Offene Fragen sind erlaubt, wenn sie bessere Erkenntnisse bringen
•	Fokussiere dich auf:
•	Welches Problem soll gelöst werden?
•	Für wen?
•	Warum ist das wichtig?
•	Woran erkennt man Erfolg?
•	Welche Einschränkungen oder Leitplanken gibt es?

2. Lösungsrichtungen erkunden
   •	Stelle 2-3 mögliche Produktansätze vor
   •	Beschreibe jeweils die wichtigsten Vor- und Nachteile
   •	Starte mit der empfohlenen Option
   •	Begründe die Empfehlung nachvollziehbar
   •	Achte darauf, nicht schon in Spezifikation oder Umsetzung abzurutschen

3. Die Idea Summary präsentieren

Sobald klar ist, worum es geht, präsentiere die Idee in klaren Abschnitten.
Die Tiefe soll zur Komplexität passen: kurz bei einfachen Ideen, ausführlicher bei anspruchsvolleren Vorhaben.

Typische Abschnitte im Idea Step:
•	Ausgangssituation / Problem
•	Zielbild
•	Zielgruppe / Nutzer
•	Erwarteter Nutzen
•	Wichtige Annahmen
•	Abgrenzung / Nicht-Ziele
•	Empfohlene Richtung
•	Offene Risiken oder Entscheidungsbedarfe

Hole nach jedem sinnvollen Abschnitt eine kurze Bestätigung ein, ob die Richtung stimmt.

4. Auf Klarheit und gute Abgrenzung achten

Die Idee soll so formuliert sein, dass sie anschließend sauber spezifiziert werden kann.

Für jede formulierte Einheit sollte klar sein:
•	Was ist das Ziel?
•	Welchen Nutzen stiftet es?
•	Für wen ist es relevant?
•	Welche Grenzen gelten?
•	Welche offenen Annahmen gibt es noch?

Wenn ein Teil der Idee zu breit, zu unscharf oder zu mehrdeutig ist, schärfe ihn vor dem nächsten Schritt.

5. Arbeiten in bestehendem Produktkontext

Wenn die Idee Teil eines größeren Produkts ist:
•	orientiere dich an bereits vorhandenen Mustern, Begriffen und Zielen
•	vermeide unnötige Seitenthemen
•	schlage nur solche Erweiterungen vor, die direkt zum aktuellen Ziel beitragen
•	benenne Zielkonflikte oder Inkonsistenzen offen

Nach der abgestimmten Idee

Dokumentation

Schreibe die validierte Idea Summary als Grundlage für den Spec Step, z. B. nach:

docs/product-spec-agent/ideas/YYYY-MM-DD-<topic>-idea.md

Falls im Projekt ein anderer Ablageort definiert ist, hat dieser Vorrang.

Die Idea Summary sollte mindestens enthalten:
•	Problem / Anlass
•	Zielbild
•	Zielgruppe
•	Nutzen
•	Annahmen
•	Optionen / betrachtete Ansätze
•	empfohlene Richtung
•	Abgrenzung
•	offene Punkte

Selbstprüfung

Nach dem Schreiben der Idea Summary prüfe sie mit frischem Blick:
1.	Platzhalter-Check: Gibt es „TODO“, „TBD“ oder unvollständige Stellen?
2.	Konsistenz-Check: Passen Problem, Ziel und empfohlene Richtung zusammen?
3.	Scope-Check: Ist die Idee klein und klar genug für den Spec Step?
4.	Eindeutigkeits-Check: Gibt es mehrdeutige Aussagen oder Interpretationsspielraum?

Korrigiere gefundene Probleme direkt inline.

Freigabe durch den Nutzer

Nach der Selbstprüfung bitte den Nutzer, die verschriftlichte Idea Summary zu prüfen, bevor es in den Spec Step geht.

Beispiel:

“Die Idea Summary ist erstellt. Bitte prüfe, ob Problem, Zielbild und empfohlene Richtung für dich stimmen, bevor wir in den Spec Step wechseln.”

Wenn Änderungen gewünscht sind, überarbeite die Idea Summary und prüfe sie erneut.
Erst nach Freigabe darf in den nächsten Schritt gewechselt werden.

Leitprinzipien
•	Immer nur eine Frage auf einmal
•	Multiple Choice bevorzugen, wenn sinnvoll
•	Konsequent auf den Kern fokussieren
•	Keine unnötigen Features hineinziehen
•	Immer 2-3 Ansätze vergleichen
•	Schrittweise validieren
•	Erst Idee, dann Spec
•	Klarheit vor Vollständigkeit
•	Explizite Annahmen statt stiller Vermutungen

Visuelle Unterstützung

Ein browserbasierter Begleiter kann helfen, wenn Mockups, Flows, Entscheidungsbäume oder visuelle Vergleiche die Diskussion verbessern.

Die visuelle Unterstützung ist ein Werkzeug, kein eigener Modus.
Sie sollte nur verwendet werden, wenn visuelle Darstellungen das Verständnis wirklich verbessern.

Angebot der visuellen Unterstützung:
Wenn absehbar ist, dass Layouts, UI-Flows, Wireframes oder Diagramme hilfreich wären, biete sie einmal aktiv an – in einer eigenen Nachricht und ohne zusätzlichen Inhalt:

“Einige Aspekte dieser Idee lassen sich visuell leichter besprechen. Ich kann dir dazu Mockups, einfache Flows, Diagramme oder Varianten gegenüberstellen. Möchtest du das nutzen?”

Dieses Angebot MUSS eine eigene Nachricht sein.
Nicht mit Fragen, Zusammenfassungen oder anderen Inhalten kombinieren.

Auch wenn der Nutzer zustimmt, entscheide pro Schritt neu:
•	Visuell arbeiten, wenn Mockups, Layouts, UI-Strukturen oder Diagramme helfen
•	Textlich arbeiten, wenn es um Ziele, Nutzen, Anforderungen, Entscheidungen oder Abgrenzung geht

Nicht jede Frage zu einer Oberfläche ist automatisch eine visuelle Frage.
Wenn das Thema besser durch Lesen als durch Anschauen verstanden wird, bleibe bei Text.