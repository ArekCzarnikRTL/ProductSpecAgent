"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Info, Loader2, RefreshCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runChecks, type CheckReport, type CheckResult, type CheckSeverity } from "@/lib/api";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<CheckSeverity, { icon: React.ReactNode; color: string; badgeVariant: "destructive" | "warning" | "ghost" }> = {
  ERROR: { icon: <ShieldAlert size={13} />, color: "text-destructive", badgeVariant: "destructive" },
  WARNING: { icon: <AlertTriangle size={13} />, color: "text-amber-400", badgeVariant: "warning" },
  INFO: { icon: <Info size={13} />, color: "text-muted-foreground", badgeVariant: "ghost" },
};

interface CheckResultsPanelProps {
  projectId: string;
}

export function CheckResultsPanel({ projectId }: CheckResultsPanelProps) {
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRunChecks() {
    setLoading(true);
    try {
      const r = await runChecks(projectId);
      setReport(r);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleRunChecks();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !report) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className={report?.summary.passed ? "text-[oklch(0.65_0.15_160)]" : "text-destructive"} />
          <span className="text-sm font-semibold">Checks</span>
        </div>
        <Button size="xs" variant="ghost" onClick={handleRunChecks} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Run
        </Button>
      </div>

      {!report ? (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
          <ShieldCheck size={24} className="opacity-30" />
          <p className="text-sm">Run checks to validate your project.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="px-4 py-3 border-b flex items-center gap-3">
            {report.summary.passed ? (
              <Badge variant="success">Passed</Badge>
            ) : (
              <Badge variant="destructive">{report.summary.errors} errors</Badge>
            )}
            {report.summary.warnings > 0 && (
              <Badge variant="warning">{report.summary.warnings} warnings</Badge>
            )}
            {report.summary.infos > 0 && (
              <Badge variant="ghost">{report.summary.infos} info</Badge>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {report.results.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                All checks passed. No issues found.
              </div>
            ) : (
              report.results.map((r) => <CheckResultItem key={r.id} result={r} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CheckResultItem({ result }: { result: CheckResult }) {
  const config = SEVERITY_CONFIG[result.severity];
  const [showFix, setShowFix] = useState(false);

  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5", config.color)}>{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{result.message}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={config.badgeVariant}>{result.severity}</Badge>
            <span className="text-[10px] text-muted-foreground">{result.category}</span>
          </div>
        </div>
      </div>
      {result.suggestedFix && (
        <button
          onClick={() => setShowFix(!showFix)}
          className="flex items-center gap-1 text-[10px] text-primary hover:underline"
        >
          <Lightbulb size={10} />
          {showFix ? "Hide suggestion" : "Show suggestion"}
        </button>
      )}
      {showFix && result.suggestedFix && (
        <div className="rounded-md bg-primary/5 border border-primary/10 px-2.5 py-1.5 text-xs text-muted-foreground">
          {result.suggestedFix}
        </div>
      )}
    </div>
  );
}
