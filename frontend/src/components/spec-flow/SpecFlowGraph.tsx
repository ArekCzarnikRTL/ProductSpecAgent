"use client";

import { useEffect, useRef } from "react";
import { useRete } from "rete-react-plugin";
import { createEditor, type EditorContext } from "./editor";
import { FlowNodeComponent } from "./FlowNode";
import type { FlowState, StepType } from "@/lib/api";

interface SpecFlowGraphProps {
  flowState: FlowState | null;
  onSelectStep?: (stepType: StepType) => void;
}

export function SpecFlowGraph({ flowState, onSelectStep }: SpecFlowGraphProps) {
  const ctxRef = useRef<EditorContext | null>(null);

  const [ref, editor] = useRete((container) =>
    createEditor(container, FlowNodeComponent)
  );

  useEffect(() => {
    if (!editor) return;
    const ctx = editor as unknown as EditorContext;
    ctxRef.current = ctx;
    if (onSelectStep) ctx.onNodeClick(onSelectStep);
  }, [editor, onSelectStep]);

  useEffect(() => {
    if (!flowState || !ctxRef.current) return;
    const ctx = ctxRef.current;
    for (const step of flowState.steps) {
      ctx.updateNodeStatus(step.stepType, step.status);
    }
  }, [flowState]);

  return <div ref={ref} className="h-full w-full" style={{ background: "var(--color-background)" }} />;
}
