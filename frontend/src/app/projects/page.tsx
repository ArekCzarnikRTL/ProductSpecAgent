"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, Calendar, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { listProjects, type Project } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn your ideas into structured product specs.
            </p>
          </div>
          <Link href="/projects/new" className={cn(buttonVariants(), "inline-flex items-center gap-2")}>
            <Plus size={16} />
            New Project
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.length === 0 && !error ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FolderKanban size={24} />
              </div>
              <div>
                <p className="font-medium">No projects yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first project to start building a product spec.
                </p>
              </div>
              <Link href="/projects/new" className={cn(buttonVariants(), "inline-flex items-center gap-2")}>
                <Plus size={16} />
                New Project
              </Link>
            </div>
          ) : (
            projects.map((p) => (
              <Card key={p.id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban size={16} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{p.name}</CardTitle>
                      <CardDescription className="mt-1">{p.status}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1" />
                <CardFooter className="flex items-center justify-between border-t pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    {formatDate(p.createdAt)}
                  </span>
                  <Link
                    href={`/projects/${p.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Open
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
