"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles, Loader2, Layers, BookOpen, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/lib/stores/task-store";
import type { SpecTask, TaskItemStatus, TaskType } from "@/lib/api";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  EPIC: <Layers size={13} />,
  STORY: <BookOpen size={13} />,
  TASK: <CheckSquare size={13} />,
};

const TYPE_COLORS: Record<TaskType, string> = {
  EPIC: "text-primary",
  STORY: "text-[oklch(0.6_0.18_300)]",
  TASK: "text-muted-foreground",
};

const STATUS_BADGES: Record<TaskItemStatus, { cls: string; label: string }> = {
  TODO: { cls: "bg-muted text-muted-foreground", label: "Todo" },
  IN_PROGRESS: { cls: "bg-primary text-primary-foreground", label: "In Progress" },
  DONE: { cls: "bg-[oklch(0.65_0.15_160)] text-black", label: "Done" },
};

interface TaskTreeProps {
  projectId: string;
}

export function TaskTree({ projectId }: TaskTreeProps) {
  const { tasks, loading, generating, generatePlan, loadTasks, selectedTaskId, selectTask } = useTaskStore();

  const epics = tasks.filter((t) => t.type === "EPIC");

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading tasks...</div>;

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
        <Layers size={24} className="opacity-30" />
        <p className="text-sm">No tasks yet.</p>
        <p className="text-xs">Generate a plan from your spec to create tasks.</p>
        <Button size="sm" disabled={generating} onClick={() => generatePlan(projectId).then(() => loadTasks(projectId))}>
          {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate Plan</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-primary" />
          <span className="text-sm font-semibold">Tasks</span>
          <span className="text-xs text-muted-foreground">({tasks.length})</span>
        </div>
        <Button size="xs" variant="ghost" disabled={generating} onClick={() => generatePlan(projectId)}>
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Regenerate
        </Button>
      </div>
      <div className="p-2 space-y-1">
        {epics.map((epic) => (
          <TreeNode key={epic.id} task={epic} allTasks={tasks} depth={0} selectedId={selectedTaskId} onSelect={selectTask} />
        ))}
      </div>
    </div>
  );
}

function TreeNode({ task, allTasks, depth, selectedId, onSelect }: {
  task: SpecTask;
  allTasks: SpecTask[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = allTasks.filter((t) => t.parentId === task.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === task.id;
  const badge = STATUS_BADGES[task.status];

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect(isSelected ? null : task.id);
        }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50",
          isSelected && "bg-muted"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
        ) : (
          <span className="w-[13px]" />
        )}
        <span className={TYPE_COLORS[task.type]}>{TYPE_ICONS[task.type]}</span>
        <span className="flex-1 truncate">{task.title}</span>
        <span className="text-[10px] text-muted-foreground mr-1">{task.estimate}</span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", badge.cls)}>
          {badge.label}
        </span>
      </button>
      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeNode key={child.id} task={child} allTasks={allTasks} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
