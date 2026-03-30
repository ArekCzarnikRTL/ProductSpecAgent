"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import type { FileEntry } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  entries: FileEntry[];
  onFileClick: (path: string) => void;
}

export function FileTree({ entries, onFileClick }: FileTreeProps) {
  return (
    <div className="text-sm">
      {entries.map((entry) => (
        <FileTreeNode key={entry.path} entry={entry} depth={0} onFileClick={onFileClick} />
      ))}
    </div>
  );
}

function FileTreeNode({ entry, depth, onFileClick }: {
  entry: FileEntry;
  depth: number;
  onFileClick: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);

  if (entry.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1.5 px-2 py-1 hover:bg-muted/50 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? <FolderOpen size={13} className="text-primary" /> : <Folder size={13} className="text-primary" />}
          <span className="text-xs font-medium">{entry.name}</span>
        </button>
        {expanded && entry.children && (
          <div>
            {entry.children.map((child) => (
              <FileTreeNode key={child.path} entry={child} depth={depth + 1} onFileClick={onFileClick} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileClick(entry.path)}
      className="flex w-full items-center gap-1.5 px-2 py-1 hover:bg-muted/50 transition-colors"
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <File size={13} className="text-muted-foreground" />
      <span className="text-xs truncate">{entry.name}</span>
      <span className="ml-auto text-[10px] text-muted-foreground">{formatSize(entry.size)}</span>
    </button>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
