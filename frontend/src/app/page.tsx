import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Product Spec Agent</CardTitle>
          <CardDescription>
            Von der Idee zur umsetzbaren Produktspezifikation
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Erstelle strukturierte Produktspezifikationen mit AI-Unterstuetzung.
            Guided Decisions, Clarification Engine und Agent-ready Export.
          </p>
          <Button>Neues Projekt starten</Button>
        </CardContent>
      </Card>
    </div>
  );
}
