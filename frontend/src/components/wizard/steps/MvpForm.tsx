"use client";
import { FormField } from "../FormField";
import { ChipSelect } from "../ChipSelect";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function MvpForm({ projectId }: { projectId: string }) {
  const { data, updateField } = useWizardStore();
  const fields = data?.steps["MVP"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("MVP", key, val);

  // Get inScope features from SCOPE step
  const scopeFields = data?.steps["SCOPE"]?.fields ?? {};
  const inScope = (scopeFields["inScope"] as string[]) ?? [];

  return (
    <div className="space-y-5">
      <FormField label="MVP-Ziel" required>
        <textarea value={get("goal")} onChange={(e) => set("goal", e.target.value)}
          placeholder="Was soll das MVP leisten?" rows={3}
          className="w-full resize-y rounded-md border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]" />
      </FormField>
      {inScope.length > 0 && (
        <FormField label="MVP Features (aus Scope)">
          <ChipSelect options={inScope} value={(fields["mvpFeatures"] as string[]) ?? []} onChange={(v) => set("mvpFeatures", v)} multiSelect />
        </FormField>
      )}
      <FormField label="Erfolgskriterien">
        <textarea value={get("successCriteria")} onChange={(e) => set("successCriteria", e.target.value)}
          placeholder="Woran erkennst du, dass das MVP erfolgreich ist?" rows={2}
          className="w-full resize-y rounded-md border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </FormField>
    </div>
  );
}
