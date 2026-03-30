"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isWorkspace = pathname?.startsWith("/projects/") && pathname !== "/projects/new";

  // Don't wrap workspace pages — they have their own full-screen layout
  if (isWorkspace) return <>{children}</>;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r flex flex-col">
        <div className="px-4 py-4 border-b">
          <Link href="/projects" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight">Spec Agent</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/projects"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/projects"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <FolderKanban size={15} />
            Projects
          </Link>
          <Link
            href="/projects/new"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/projects/new"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Plus size={15} />
            New Project
          </Link>
        </nav>

        <div className="px-4 py-3 border-t text-[10px] text-muted-foreground">
          Product Spec Agent v0.1
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
