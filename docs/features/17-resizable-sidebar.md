# Feature 17: Resizable Right Sidebar

## Zusammenfassung
Die rechte Sidebar (Chat, Decisions, Clarifications, Tasks, Checks) soll in der Breite per Drag verstellbar sein. Ein duenner Drag-Handle am linken Rand der Sidebar erlaubt es dem User, die Sidebar zwischen 280px und 600px zu ziehen. Umgesetzt als Custom React Hook (`useResizable`) plus `ResizeHandle`-Komponente – keine neue Dependency noetig.

## User Stories
1. Als PO moechte ich die Chat-Sidebar breiter ziehen koennen, damit ich laengere Agent-Antworten besser lesen kann.
2. Als PO moechte ich die Sidebar schmaler ziehen koennen, damit ich mehr Platz fuer das Wizard-Formular habe.
3. Als PO moechte ich visuelles Feedback beim Resize sehen (Cursor, Highlight), damit klar ist wo ich ziehen kann.

## Acceptance Criteria
- [ ] Am linken Rand der rechten Sidebar befindet sich ein vertikaler Drag-Handle (4px breit, volle Hoehe)
- [ ] Drag-Handle zeigt `cursor: col-resize` bei Hover
- [ ] Drag-Handle zeigt visuellen Highlight bei Hover und waehrend des Drags (z.B. blaue Linie)
- [ ] Sidebar-Breite laesst sich per Drag stufenlos zwischen 280px (min) und 600px (max) aendern
- [ ] Default-Breite bleibt 340px (wie bisher)
- [ ] Waehrend des Drags wird Textselektion im gesamten Fenster unterdrueckt
- [ ] Nach links ziehen = Sidebar wird breiter, nach rechts ziehen = Sidebar wird schmaler
- [ ] Wizard-Formular-Bereich (flex: 1) passt sich automatisch an die neue Sidebar-Breite an
- [ ] Alle Inhalte der Sidebar (Chat, Decisions, etc.) passen sich an die neue Breite an
- [ ] Bei Seiten-Reload wird die Breite auf den Default (340px) zurueckgesetzt

## Technische Details

### Neuer Hook: `useResizable`

Pfad: `frontend/src/lib/hooks/use-resizable.ts`

```typescript
interface UseResizableOptions {
  initialWidth: number;   // 340
  minWidth: number;       // 280
  maxWidth: number;       // 600
  direction: "left";      // Drag-Richtung (links = groesser)
}

interface UseResizableReturn {
  width: number;
  isDragging: boolean;
  handleProps: {
    onMouseDown: (e: MouseEvent) => void;
  };
}
```

Logik:
- `onMouseDown` auf dem Handle speichert `startX` und `startWidth`
- `mousemove` auf `document`: `newWidth = startWidth - (clientX - startX)` (links ziehen = groesser, da Sidebar rechts liegt)
- `clamp(newWidth, minWidth, maxWidth)`
- `mouseup` auf `document`: Drag beenden
- Waehrend Drag: `document.body.style.userSelect = "none"` setzen, bei mouseup zuruecksetzen
- Cleanup via `useEffect` return

### Neue Komponente: `ResizeHandle`

Pfad: `frontend/src/components/layout/ResizeHandle.tsx`

- Dünner vertikaler Streifen: `w-1 h-full cursor-col-resize`
- Hover-State: `hover:bg-blue-500/50`
- Drag-State: `bg-blue-500/70` (via `isDragging` Prop)
- Positioniert als erstes Kind innerhalb der Sidebar (linker Rand)

### Aenderung in `page.tsx`

Datei: `frontend/src/app/projects/[id]/page.tsx`

Aktuelle Sidebar-Definition:
```
<div className="w-[340px] shrink-0 overflow-hidden flex flex-col border-l">
```

Neue Sidebar-Definition:
```
<div className="shrink-0 overflow-hidden flex flex-row border-l" style={{ width }}>
  <ResizeHandle isDragging={isDragging} {...handleProps} />
  <div className="flex-1 overflow-hidden flex flex-col">
    {/* bestehender Tab-Inhalt */}
  </div>
</div>
```

- `w-[340px]` wird entfernt, stattdessen `style={{ width }}` aus dem Hook
- Sidebar bekommt `flex-row` um Handle + Content nebeneinander zu legen
- Bestehender Tab-Content wird in ein inneres `flex-col` div gewrappt

### Interaktion mit bestehendem System
- Explorer-Panel (links, 240px) bleibt unveraendert
- Wizard-Formular-Bereich (flex: 1) schrumpft/waechst automatisch
- Alle Tab-Inhalte (Chat, Decisions, etc.) sind bereits flex-basiert und passen sich an

## Abhaengigkeiten
- Feature 06 (Beautiful UI) – bestehendes Layout
- Feature 13 (Wizard-Chat Integration) – Chat-Panel in der Sidebar

## Aufwand
S
