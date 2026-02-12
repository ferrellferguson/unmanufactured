"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatPanelProps {
  eventId: string;
}

export function ChatPanel({ eventId }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: {
      type: "fetch" as const,
      url: `/api/events/${eventId}/chat`,
    },
  } as any);

  const isLoading = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue } as any);
    setInputValue("");
  }

  // Extract text content from message parts
  function getMessageText(msg: (typeof messages)[number]): string {
    if ("content" in msg && typeof (msg as any).content === "string") {
      return (msg as any).content;
    }
    if ("parts" in msg && Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");
    }
    return "";
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div className="text-sm font-medium mb-2">Interrogation Chat</div>
      <ScrollArea className="flex-1 border rounded-lg p-4 mb-3">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Ask questions about this event&apos;s narrative across models. The AI
            has access to all snapshots, drift scores, and memory holes.
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm ${
                  msg.role === "user"
                    ? "text-primary font-medium"
                    : "text-foreground"
                }`}
              >
                <span className="text-xs text-muted-foreground uppercase">
                  {msg.role}:
                </span>
                <div className="mt-1 whitespace-pre-wrap">
                  {getMessageText(msg)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      {error && (
        <div className="text-xs text-red-500 mb-2">{error.message}</div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about narrative drift, ghost pivots, or specific claims..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading} size="sm">
          {isLoading ? "..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
