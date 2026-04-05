"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/lib/stores/project-store";
import { Bot, User, Info } from "lucide-react";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground animate-fade-in">
        <Info size={12} className="shrink-0 text-muted-foreground" />
        <span>{message.content}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2.5 animate-fade-in-up", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
        isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      )}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
        isUser ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-secondary text-secondary-foreground"
      )}>
        {message.content}
      </div>
    </div>
  );
}
