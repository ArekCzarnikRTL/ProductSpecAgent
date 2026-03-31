# Resizable Right Sidebar – Design Spec

## Overview
Make the right sidebar (Chat + Tabs) horizontally resizable via a drag handle on its left edge. Custom `useResizable` hook + `ResizeHandle` component. No new dependencies.

## Components

### `useResizable` Hook
- File: `frontend/src/lib/hooks/use-resizable.ts`
- Tracks `width` and `isDragging` state
- On mousedown: captures `startX`, `startWidth`
- On mousemove (document-level): calculates `newWidth = startWidth - (clientX - startX)`, clamps to [280, 600]
- On mouseup: stops dragging, restores `userSelect`
- During drag: sets `document.body.style.userSelect = "none"`
- Cleanup on unmount

### `ResizeHandle` Component
- File: `frontend/src/components/layout/ResizeHandle.tsx`
- 4px wide, full height, `cursor-col-resize`
- Hover: subtle blue highlight
- Dragging: stronger blue highlight
- Receives `isDragging` prop + `onMouseDown` from hook

### `page.tsx` Changes
- Replace `w-[340px]` with `style={{ width }}` from hook
- Wrap sidebar content: `<ResizeHandle />` + inner `<div>` for tabs
- Add `flex-row` to sidebar container

## Constraints
- Min width: 280px
- Max width: 600px
- Default: 340px
- No localStorage persistence
- No changes to Explorer panel or other layout sections
