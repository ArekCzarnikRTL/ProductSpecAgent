"use client";
import { FormField } from "../FormField";
import { ChipSelect } from "../ChipSelect";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { cn } from "@/lib/utils";

export function IdeaForm({ projectId }: { projectId: string }) {
  const { data, updateField } = useWizardStore();
  const fields = data?.steps["IDEA"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("IDEA", key, val);

  return (
    <div className="space-y-5">
      <FormField label="Produktname" required>
        <input value={get("productName")} onChange={(e) => set("productName", e.target.value)}
          placeholder="z.B. TaskFlow Pro" className={cn("w-full rounded-md border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring")} />
      </FormField>
      <FormField label="Produktidee / Vision" required>
        <textarea value={get("vision")} onChange={(e) => set("vision", e.target.value)}
          placeholder="Beschreibe deine Produktidee in 2-3 Saetzen..." rows={4}
          className={cn("w-full resize-y rounded-md border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]")} />
      </FormField>
      <FormField label="Kategorie">
        <ChipSelect options={["SaaS", "Mobile App", "CLI Tool", "Library", "Desktop App", "API"]} value={get("category")} onChange={(v) => set("category", v)} />
      </FormField>
    </div>
  );
}
