# Feature 6: Beautiful UI

## Zusammenfassung
Eine moderne, attraktive Oberfläche die komplexe Produktarbeit übersichtlich und motivierend macht. Dashboard mit Überblick über alle Projekte, Spec-Status, offene Entscheidungen und nächste Schritte.

## User Stories
1. Als PO möchte ich ein Dashboard sehen, das mir alle meine Projekte mit Status zeigt.
2. Als PO möchte ich auf einen Blick erkennen, wo ich im Spec-Prozess stehe und was als nächstes kommt.
3. Als PO möchte ich eine Oberfläche, die sich modern anfühlt und Spass macht zu benutzen.

## Acceptance Criteria
- [ ] Dashboard zeigt Projekt-Karten mit Fortschrittsbalken
- [ ] Jedes Projekt zeigt: Name, Status, offene Decisions, offene Clarifications, nächster Schritt
- [ ] Dark/Light Mode via shadcn/ui Theme
- [ ] Responsive Layout (Desktop-first, Tablet nutzbar)
- [ ] Node-Graph (Rete.js) ist interaktiv: Zoom, Pan, Klick auf Nodes öffnet Details
- [ ] Konsistentes Design-System basierend auf shadcn/ui Primitives

## Technische Details
- **Frontend**: shadcn/ui Components, Tailwind CSS, Rete.js für Node-Graph
- **Components**: Dashboard, ProjectCard, SpecFlowGraph, DecisionCard, TaskBoard
- **Theming**: shadcn/ui Theme mit Custom-Farben für Status-Indikatoren
- **Layout**: Sidebar-Navigation + Main Content Area

## Abhängigkeiten
- Feature 0 (Project Setup)

## Aufwand
L (Large)
