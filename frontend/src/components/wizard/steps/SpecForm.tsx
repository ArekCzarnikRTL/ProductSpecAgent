"use client";
import { FormField } from "../FormField";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function SpecForm({ projectId }: { projectId: string }) {
  const { data, updateField } = useWizardStore();
  const fields = data?.steps["SPEC"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("SPEC", key, val);

  // Auto-generate spec summary from previous steps
  const idea = data?.steps["IDEA"]?.fields ?? {};
  const problem = data?.steps["PROBLEM"]?.fields ?? {};
  const audience = data?.steps["TARGET_AUDIENCE"]?.fields ?? {};
  const scope = data?.steps["SCOPE"]?.fields ?? {};
  const mvp = data?.steps["MVP"]?.fields ?? {};

  const autoSpec = [
    idea["productName"] ? `# ${idea["productName"]}` : "",
    "",
    problem["coreProblem"] ? `## Problem\n${problem["coreProblem"]}` : "",
    audience["primary"] ? `## Zielgruppe\n${audience["primary"]}` : "",
    scope["inScope"] ? `## Scope\n${(scope["inScope"] as string[])?.join(", ")}` : "",
    mvp["goal"] ? `## MVP\n${mvp["goal"]}` : "",
  ].filter(Boolean).join("\n\n");

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Automatisch aus den vorherigen Schritten generiert. Du kannst die Zusammenfassung bearbeiten.</p>
      <FormField label="Produktspezifikation">
        <textarea value={get("specContent") || autoSpec} onChange={(e) => set("specContent", e.target.value)}
          rows={15}
          className="w-full resize-y rounded-md border bg-input px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[300px]" />
      </FormField>
    </div>
  );
}
