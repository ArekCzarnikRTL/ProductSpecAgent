"use client";
import { FormField } from "../FormField";
import { ChipSelect } from "../ChipSelect";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function ArchitectureForm({ projectId }: { projectId: string }) {
  const { data, updateField } = useWizardStore();
  const fields = data?.steps["ARCHITECTURE"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("ARCHITECTURE", key, val);

  return (
    <div className="space-y-5">
      <FormField label="System-Architektur" required>
        <ChipSelect options={["Monolith", "Microservices", "Serverless", "Hybrid"]} value={get("architecture")} onChange={(v) => set("architecture", v)} />
      </FormField>
      <FormField label="Datenbank" required>
        <ChipSelect options={["PostgreSQL", "MongoDB", "SQLite", "MySQL", "Filesystem", "Redis"]} value={get("database")} onChange={(v) => set("database", v)} />
      </FormField>
      <FormField label="Deployment" required>
        <ChipSelect options={["Docker Compose", "Vercel + Cloud", "Self-hosted", "Kubernetes", "AWS"]} value={get("deployment")} onChange={(v) => set("deployment", v)} />
      </FormField>
      <FormField label="Architektur-Notizen">
        <textarea value={get("notes")} onChange={(e) => set("notes", e.target.value)}
          placeholder="Zusaetzliche Architektur-Details..." rows={3}
          className="w-full resize-y rounded-md border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </FormField>
    </div>
  );
}
