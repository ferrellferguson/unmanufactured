"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import type { Event } from "@/lib/db/schema";

export default function ChatPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((events: Event[]) => {
        const found = events.find((e) => e.slug === slug);
        if (found) setEvent(found);
      })
      .catch(console.error);
  }, [slug]);

  if (!event) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/events/${slug}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        &larr; Back to {event.title}
      </Link>
      <h1 className="text-xl font-bold mt-2 mb-4">
        Interrogation: {event.title}
      </h1>
      <ChatPanel eventId={event.id} />
    </div>
  );
}
