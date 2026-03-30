"use client";

import { useEffect, useState, useCallback, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Loader2, Scale, MessageSquare, HelpCircle, Layers, Download, ShieldCheck, Bot, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/export/ExportDialog";
import { HandoffDialog } from "@/components/handoff/HandoffDialog";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { DecisionLog } from "@/components/decisions/DecisionLog";
import { ClarificationList } from "@/components/clarifications/ClarificationList";
import { useProjectStore } from "@/lib/stores/project-store";
import { useDecisionStore } from "@/lib/stores/decision-store";
import { useClarificationStore } from "@/lib/stores/clarification-store";
import { useTaskStore } from "@/lib/stores/task-store";
import { TaskTree } from "@/components/tasks/TaskTree";
import { CheckResultsPanel } from "@/components/checks/CheckResultsPanel";
import { ExplorerPanel } from "@/components/explorer/ExplorerPanel";
import type { StepType, FlowStep } from "@/lib/api";
import { cn } from "@/lib/utils";

const SpecFlowGraph = dynamic(
  () => import("@/components/spec-flow/SpecFlowGraph").then((m) => m.SpecFlowGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    ),
  }
);

function StepBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-muted text-muted-foreground",
    IN_PROGRESS: "bg-primary text-primary-foreground",
    COMPLETED: "bg-[oklch(0.65_0.15_160)] text-black",
  };
  const labels: Record<string, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[status] ?? styles.OPEN)}>
      {labels[status] ?? status}
    </span>
  );
}

function StepDetailPanel({ step }: { step: FlowStep | undefined }) {
  if (!step) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Click a node in the graph to view step details.
      </div>
    );
  }
  const label = step.stepType.replace("_", " ");
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold capitalize">{label}</h3>
        <StepBadge status={step.status} />
      </div>
      <p className="text-sm text-muted-foreground italic">
        Chat with the agent to build this step.
      </p>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectWorkspacePage({ params }: PageProps) {
  const { id } = use(params);
  const {
    project, projectLoading, projectError,
    flowState, selectedStep,
    loadProject, selectStep, reset,
  } = useProjectStore();

  const [showDetail, setShowDetail] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const [rightTab, setRightTab] = useState<"chat" | "decisions" | "clarifications" | "tasks" | "checks">("chat");
  const { decisions, loadDecisions: loadDecs, reset: resetDecs } = useDecisionStore();
  const pendingCount = decisions.filter((d) => d.status === "PENDING").length;
  const { clarifications: clars, loadClarifications: loadClars, reset: resetClars } = useClarificationStore();
  const openClarCount = clars.filter((c) => c.status === "OPEN").length;
  const { tasks, loadTasks: loadTsks, loadCoverage, reset: resetTasks } = useTaskStore();

  useEffect(() => {
    reset();
    resetDecs();
    resetClars();
    resetTasks();
    loadProject(id);
    loadDecs(id);
    loadClars(id);
    loadTsks(id);
    loadCoverage(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedStepData = flowState?.steps.find((s) => s.stepType === selectedStep);

  const handleSelectStep = useCallback((stepType: StepType) => {
    selectStep(stepType);
    setShowDetail(true);
  }, [selectStep]);

  if (projectLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-destructive">{projectError}</p>
        <Link href="/projects" className="text-sm text-primary hover:underline">Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
        <Link href="/projects" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          Projects
        </Link>
        <ChevronRight size={14} className="text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-xs">{project?.name ?? "..."}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHandoff(true)} className="gap-1.5">
            <Bot size={14} /> Handoff
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowExport(true)} className="gap-1.5">
            <Download size={14} /> Export
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <div className="w-10 shrink-0 border-r flex flex-col items-center py-2 gap-2">
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              showExplorer ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            title="File Explorer"
          >
            <FolderTree size={16} />
          </button>
        </div>

        {/* Explorer Panel */}
        {showExplorer && (
          <div className="w-60 shrink-0 border-r overflow-hidden">
            <ExplorerPanel projectId={id} flowState={flowState} />
          </div>
        )}

        {/* Graph area */}
        <div className="flex flex-1 flex-col overflow-hidden border-r">
          <div className={cn("overflow-hidden transition-all", showDetail ? "h-[55%]" : "flex-1")}>
            <SpecFlowGraph flowState={flowState} onSelectStep={handleSelectStep} />
          </div>
          {showDetail && (
            <div className="flex-1 overflow-hidden border-t">
              <StepDetailPanel step={selectedStepData} />
            </div>
          )}
        </div>
        <div className="w-[340px] shrink-0 overflow-hidden flex flex-col border-l">
          {/* Tab buttons */}
          <div className="flex border-b">
            <button
              onClick={() => setRightTab("chat")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                rightTab === "chat" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare size={13} /> Chat
            </button>
            <button
              onClick={() => setRightTab("decisions")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                rightTab === "decisions" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Scale size={13} /> Decisions
              {pendingCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{pendingCount}</span>
              )}
            </button>
            <button
              onClick={() => setRightTab("clarifications")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                rightTab === "clarifications" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HelpCircle size={13} /> Clarifications
              {openClarCount > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">{openClarCount}</span>
              )}
            </button>
            <button
              onClick={() => setRightTab("tasks")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                rightTab === "tasks" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers size={13} /> Tasks
              {tasks.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tasks.length}</span>
              )}
            </button>
            <button
              onClick={() => setRightTab("checks")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                rightTab === "checks" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck size={13} /> Checks
            </button>
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === "chat" ? (
              <ChatPanel projectId={id} />
            ) : rightTab === "decisions" ? (
              <DecisionLog projectId={id} />
            ) : rightTab === "clarifications" ? (
              <ClarificationList projectId={id} />
            ) : rightTab === "tasks" ? (
              <TaskTree projectId={id} />
            ) : (
              <CheckResultsPanel projectId={id} />
            )}
          </div>
        </div>
      </div>
      <ExportDialog
        projectId={id}
        projectName={project?.name ?? "Project"}
        open={showExport}
        onClose={() => setShowExport(false)}
      />
      <HandoffDialog
        projectId={id}
        projectName={project?.name ?? "Project"}
        open={showHandoff}
        onClose={() => setShowHandoff(false)}
      />
    </div>
  );
}
