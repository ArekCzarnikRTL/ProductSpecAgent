"use client";
import { FormField } from "../FormField";
import { ChipSelect } from "../ChipSelect";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function BackendForm({ projectId }: { projectId: string }) {
  const { data, updateField } = useWizardStore();
  const fields = data?.steps["BACKEND"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("BACKEND", key, val);

  return (
    <div className="space-y-5">
      <FormField label="Sprache / Framework" required>
        <ChipSelect options={["Kotlin + Spring Boot", "Node.js + Express", "Python + FastAPI", "Go", "Rust + Actix", "Java + Spring"]} value={get("framework")} onChange={(v) => set("framework", v)} />
      </FormField>
      <FormField label="API-Stil" required>
        <ChipSelect options={["REST", "GraphQL", "gRPC", "WebSockets"]} value={get("apiStyle")} onChange={(v) => set("apiStyle", v)} />
      </FormField>
      <FormField label="Auth-Methode" required>
        <ChipSelect options={["JWT", "Session", "OAuth 2.0", "API Key", "Keine"]} value={get("auth")} onChange={(v) => set("auth", v)} />
      </FormField>
    </div>
  );
}
