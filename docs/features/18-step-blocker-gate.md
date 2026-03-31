# Feature 18: Step-Blocker Gate

## Zusammenfassung
Der Wizard-Fortschritt wird blockiert, solange offene Decisions (PENDING) oder Clarifications (OPEN) fuer den aktuellen Step existieren. Der User kann erst zum naechsten Schritt wechseln, wenn alle Blocker aufgeloest sind. Der StepIndicator zeigt blockierte Steps visuell (Amber Warning + Lock Icons), und der "Weiter"-Button wird deaktiviert mit einem Hinweis-Banner. Klick auf den deaktivierten Button wechselt automatisch zum relevanten Tab in der rechten Sidebar.

## User Stories
1. Als PO moechte ich, dass ich nicht zum naechsten Wizard-Schritt springen kann solange offene Klaerungen bestehen, damit keine wichtigen Informationen uebersprungen werden.
2. Als PO moechte ich sofort sehen welche Blocker offen sind (im StepIndicator und am Button), damit ich weiss was ich tun muss.
3. Als PO moechte ich bei Klick auf den blockierten Button automatisch zum richtigen Tab (Clarifications/Decisions) geleitet werden, damit ich den Blocker schnell loesen kann.
4. Als PO moechte ich, dass der Wizard automatisch freigeschaltet wird sobald ich alle Blocker beantwortet habe, ohne die Seite neu laden zu muessen.

## Acceptance Criteria
- [ ] "Weiter"-Button ist disabled wenn offene Decisions (PENDING) oder Clarifications (OPEN) fuer den aktuellen Step existieren
- [ ] Amber-Banner ueber dem Button zeigt Anzahl und Art der Blocker an (z.B. "1 offene Klaerung blockiert den naechsten Schritt")
- [ ] Klick auf den disabled Button wechselt zum relevanten Tab in der rechten Sidebar (Clarifications oder Decisions)
- [ ] Bei mehreren Blocker-Typen wird zum Tab mit dem aeltesten offenen Item gewechselt
- [ ] StepIndicator zeigt blockierten Step als Amber-Kreis mit Ausrufezeichen und pulsierendem Glow
- [ ] Badge unter dem blockierten Step zeigt Blocker-Zusammenfassung (z.B. "1 Klaerung offen")
- [ ] Nachfolgende Steps im StepIndicator zeigen Schloss-Icon und sind ausgegraut
- [ ] Klick auf nachfolgende Steps (mit Schloss) ist deaktiviert
- [ ] Sobald alle Decisions resolved und alle Clarifications answered sind, wird der Button automatisch freigeschaltet
- [ ] StepIndicator aktualisiert sich automatisch wenn Blocker aufgeloest werden (kein Reload noetig)
- [ ] Bereits abgeschlossene Steps (gruener Haken) bleiben navigierbar (Zurueck-Navigation nicht blockiert)

## Technische Details

### Blocker-Berechnung (Frontend)

Neuer Hook: `frontend/src/lib/hooks/use-step-blockers.ts`

```typescript
interface StepBlockers {
  pendingDecisions: Decision[];
  openClarifications: Clarification[];
  isBlocked: boolean;
  blockerCount: number;
  blockerSummary: string; // z.B. "1 Klaerung offen"
}

function useStepBlockers(stepKey: string): StepBlockers
```

- Liest aus `useDecisionStore()` alle Decisions mit `stepType === stepKey && status === "PENDING"`
- Liest aus `useClarificationStore()` alle Clarifications mit `stepType === stepKey && status === "OPEN"`
- Berechnet `isBlocked`, `blockerCount` und eine lesbare `blockerSummary`
- Reaktiv: aktualisiert sich automatisch wenn Stores sich aendern

### StepIndicator Aenderungen

Datei: `frontend/src/components/wizard/StepIndicator.tsx`

Aktueller Zustand: Steps haben 3 visuelle States (COMPLETED/ACTIVE/PENDING).
Neue States:
- **BLOCKED**: Amber Kreis mit "!" Icon, pulsierender Glow, Badge darunter
- **LOCKED**: Schloss-Icon, ausgegraut, cursor: not-allowed, onClick deaktiviert

Logik:
- Aktueller Step: pruefen ob `useStepBlockers(activeStep).isBlocked`
- Wenn blockiert: Step als BLOCKED rendern, alle nachfolgenden als LOCKED
- Badge-Text kommt aus `blockerSummary`

### WizardForm Aenderungen

Datei: `frontend/src/components/wizard/WizardForm.tsx`

1. Hook einbinden: `const { isBlocked, blockerSummary, pendingDecisions, openClarifications } = useStepBlockers(activeStep)`
2. "Weiter"-Button: `disabled={saving || chatPending || isBlocked}`
3. Amber-Banner (BlockerBanner-Komponente) ueber dem Button-Bereich wenn `isBlocked`
4. onClick auf disabled Button: `setRightTab(firstBlockerTab)` in page.tsx aufrufen

### Tab-Wechsel bei Klick auf disabled Button

Problem: `setRightTab` lebt in `page.tsx`, nicht in `WizardForm`.

Loesung: Callback-Prop `onBlockerClick` von page.tsx an WizardForm durchreichen:
```typescript
// page.tsx
<WizardForm
  projectId={id}
  onBlockerClick={(tab: "decisions" | "clarifications") => setRightTab(tab)}
/>
```

### Neue Komponente: BlockerBanner

Datei: `frontend/src/components/wizard/BlockerBanner.tsx`

```typescript
interface BlockerBannerProps {
  blockerSummary: string;
  onBannerClick: () => void;
}
```

- Amber-Hintergrund (`bg-amber-500/10 border-amber-500/30`)
- Warning-Icon + Text + Hinweis "Beantworte die Klaerung im Chat-Panel rechts"
- Klickbar: loest `onBannerClick` aus (Tab-Wechsel)

### Interaktion mit bestehendem System
- Decision-Store und Clarification-Store bleiben unveraendert (Daten sind bereits vorhanden)
- `completeStep()` in wizard-store muss NICHT geaendert werden (Button ist vorher schon disabled)
- Backend braucht keine Aenderungen (Blocker-Berechnung rein im Frontend)

## Design-Referenz

Mockups gespeichert in `.superpowers/brainstorm/` (lokale Dateien):
- `step-indicator-designs.html` — 3 StepIndicator-Varianten (gewaehlt: A - Amber Warning + Lock Icons)
- `blocked-button-design.html` — Blockierter Button mit Banner

### StepIndicator States

| State | Kreis | Label | Connector | Klickbar |
|-------|-------|-------|-----------|----------|
| COMPLETED | Gruen + Haken | Grau | Gruen | Ja |
| ACTIVE (frei) | Blau + Nummer | Blau | Grau | Ja (aktuell) |
| BLOCKED | Amber + "!" + Pulse | Amber + Badge | Grau | Ja (aktuell) |
| LOCKED | Schloss-Icon, ausgegraut | Grau | Grau | Nein |
| PENDING | Grau + Nummer | Grau | Grau | Nein |

### Blocker-Banner Texte
- "1 offene Klaerung blockiert den naechsten Schritt"
- "1 offene Entscheidung blockiert den naechsten Schritt"
- "1 Entscheidung und 2 Klaerungen blockieren den naechsten Schritt"

## Abhaengigkeiten
- Feature 02 (Guided Decisions) – Decision-Store mit PENDING/RESOLVED Status
- Feature 03 (Clarification Engine) – Clarification-Store mit OPEN/ANSWERED Status
- Feature 11 (Guided Wizard Forms) – StepIndicator und WizardForm

## Aufwand
M
