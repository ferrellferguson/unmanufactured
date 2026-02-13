"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Event } from "@/lib/db/schema";

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-24">
      {/* Hero Section */}
      <section className="pt-16 pb-8 text-center space-y-6">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          All facts. No manufacturing.
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          We poll multiple AI models about the same event over time and detect
          when narratives shift without new evidence. Track the story. Catch the
          drift.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button asChild size="lg">
            <a href="#tracked-events">Explore Events</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/events/new">Track New Event</Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* How It Works */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold tracking-tight text-center">
          How It Works
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="text-4xl font-bold text-muted-foreground/40 mb-2">
                1
              </div>
              <CardTitle>Track an Event</CardTitle>
              <CardDescription>
                Add any news event. We query Claude, GPT-4o, Grok 3, and Gemini
                with the same prompt, grounded by real-time search results.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-4xl font-bold text-muted-foreground/40 mb-2">
                2
              </div>
              <CardTitle>Detect Drift</CardTitle>
              <CardDescription>
                Each poll cycle compares responses to previous ones using
                embedding similarity, measuring how the narrative changes over
                time.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-4xl font-bold text-muted-foreground/40 mb-2">
                3
              </div>
              <CardTitle>Expose Anomalies</CardTitle>
              <CardDescription>
                Ghost Pivots flag narratives that shift without new sources.
                Memory Holes catch facts silently dropped. Context Rejections
                detect when models ignore evidence they were given.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Feature Highlights */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold tracking-tight text-center">
          Features
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Model Polling</CardTitle>
              <CardDescription>
                4 AI models queried in parallel on every cycle for independent
                perspectives on the same event.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Search Grounding</CardTitle>
              <CardDescription>
                Real-time Tavily search results fed to models so they can&apos;t
                hide behind training cutoffs.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Narrative Drift Detection</CardTitle>
              <CardDescription>
                Embedding-based cosine similarity tracks how stories change
                between polls.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Context Rejection</CardTitle>
              <CardDescription>
                Detects when models ignore facts they were explicitly provided,
                revealing selective reasoning.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Tracked Events */}
      <section id="tracked-events" className="scroll-mt-8 space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Tracked Events
            </h2>
            {!loading && events.length > 0 && (
              <Badge variant="secondary">{events.length}</Badge>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/events/new">Track New Event</Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading events...</div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No events being tracked yet.
              </p>
              <Link
                href="/events/new"
                className="text-primary hover:underline font-medium"
              >
                Create your first event &rarr;
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.slug}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <Badge
                        variant={
                          event.status === "active" ? "default" : "secondary"
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                    {event.description && (
                      <CardDescription>{event.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                      <span>
                        Drift threshold: {(event.driftThreshold * 100).toFixed(0)}%
                      </span>
                      <span>
                        Created:{" "}
                        {new Date(event.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
