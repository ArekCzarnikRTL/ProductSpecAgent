"use client";
import { FormField } from "../FormField";
import { TagInput } from "../TagInput";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function ScopeForm({ projectId }: { projectId: string }) {
  const { data, updateField } = useWizardStore();
  const fields = data?.steps["SCOPE"]?.fields ?? {};
  const getTags = (key: string): string[] => (fields[key] as string[]) ?? [];
  const set = (key: string, val: any) => updateField("SCOPE", key, val);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="In Scope" required>
          <TagInput tags={getTags("inScope")} onAdd={(t) => set("inScope", [...getTags("inScope"), t])} onRemove={(t) => set("inScope", getTags("inScope").filter((x: string) => x !== t))} placeholder="Feature hinzufuegen..." color="green" />
        </FormField>
        <FormField label="Out of Scope">
          <TagInput tags={getTags("outOfScope")} onAdd={(t) => set("outOfScope", [...getTags("outOfScope"), t])} onRemove={(t) => set("outOfScope", getTags("outOfScope").filter((x: string) => x !== t))} placeholder="Ausschluss hinzufuegen..." color="red" />
        </FormField>
      </div>
    </div>
  );
}
