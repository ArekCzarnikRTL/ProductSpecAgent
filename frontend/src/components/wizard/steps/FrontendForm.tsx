"use client";
import { FormField } from "../FormField";
import { ChipSelect } from "../ChipSelect";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function FrontendForm({ projectId }: { projectId: string }) {
  const { data, updateField } = useWizardStore();
  const fields = data?.steps["FRONTEND"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("FRONTEND", key, val);

  return (
    <div className="space-y-5">
      <FormField label="Framework" required>
        <ChipSelect options={["Next.js + React", "Vue + Nuxt", "Svelte + SvelteKit", "Angular", "Remix", "Astro"]} value={get("framework")} onChange={(v) => set("framework", v)} />
      </FormField>
      <FormField label="UI Library">
        <ChipSelect options={["shadcn/ui", "Material UI", "Ant Design", "Chakra UI", "Radix + Custom", "Keine"]} value={get("uiLibrary")} onChange={(v) => set("uiLibrary", v)} />
      </FormField>
      <FormField label="Styling">
        <ChipSelect options={["Tailwind CSS", "CSS Modules", "Styled Components", "Emotion", "Vanilla CSS"]} value={get("styling")} onChange={(v) => set("styling", v)} />
      </FormField>
      <FormField label="Theme">
        <ChipSelect options={["Dark only", "Light only", "Both (Toggle)"]} value={get("theme")} onChange={(v) => set("theme", v)} />
      </FormField>
    </div>
  );
}
