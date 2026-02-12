"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DriftTimeline } from "@/components/timeline/drift-timeline";
import { SnapshotCard } from "@/components/snapshots/snapshot-card";
import { SnapshotDiff } from "@/components/snapshots/snapshot-diff";
import { SourcePanel } from "@/components/sources/source-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import type { Event, DriftScore, Source } from "@/lib/db/schema";

interface TimelineSnapshot {
  id: string;
  modelId: string;
  modelProvider: string;
  responseText: string;
  pollCycleId: string;
  tokenCount: number | null;
  createdAt: string;
}

interface TimelineSearchResult {
  id: string;
  pollCycleId: string;
  query: string;
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate: string | null;
  createdAt: string;
}

interface TimelineContextRejection {
  id: string;
  snapshotId: string;
  searchResultId: string;
  providedFact: string;
  rejected: boolean;
  similarityScore: number;
  detectedAt: string;
}

interface TimelineData {
  snapshots: TimelineSnapshot[];
  driftScores: DriftScore[];
  memoryHoles: {
    id: string;
    missingFromSnapshotId: string;
    detectedAt: string;
    factNodeId: string;
    lastSeenSnapshotId: string;
    similarityScore: number;
  }[];
  pollCycles: any[];
  searchResults: TimelineSearchResult[];
  contextRejections: TimelineContextRejection[];
}

export default function EventDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<TimelineSnapshot | null>(null);
  const [diffSnapshots, setDiffSnapshots] = useState<
    [TimelineSnapshot, TimelineSnapshot] | null
  >(null);
  const [polling, setPolling] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch event by slug (find from list)
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((events: Event[]) => {
        const found = events.find((e) => e.slug === slug);
        if (found) setEvent(found);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const loadTimeline = useCallback(() => {
    if (!event) return;
    fetch(`/api/events/${event.id}/timeline`)
      .then((r) => r.json())
      .then(setTimeline)
      .catch(console.error);
  }, [event]);

  const loadSources = useCallback(() => {
    if (!event) return;
    fetch(`/api/events/${event.id}/sources`)
      .then((r) => r.json())
      .then(setSources)
      .catch(console.error);
  }, [event]);

  useEffect(() => {
    loadTimeline();
    loadSources();
  }, [loadTimeline, loadSources]);

  async function handlePollNow() {
    if (!event) return;
    setPolling(true);
    try {
      // Use direct poll endpoint (no Inngest needed)
      const res = await fetch(`/api/events/${event.id}/poll-direct`, {
        method: "POST",
      });
      const data = await res.json();
      console.log("Poll results:", data);
      loadTimeline();
    } catch (err) {
      console.error(err);
    } finally {
      setPolling(false);
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Event not found.</p>
        <Link href="/" className="text-primary hover:underline">
          &larr; Back to events
        </Link>
      </div>
    );
  }

  const snapshotDriftMap = new Map(
    (timeline?.driftScores ?? []).map((d) => [d.currentSnapshotId, d])
  );

  // Group snapshots by poll cycle
  const snapshotsByModel = (timeline?.snapshots ?? []).reduce(
    (acc, s) => {
      if (!acc[s.modelId]) acc[s.modelId] = [];
      acc[s.modelId].push(s);
      return acc;
    },
    {} as Record<string, TimelineSnapshot[]>
  );

  const ghostPivotCount =
    timeline?.driftScores.filter((d) => d.ghostPivot).length ?? 0;
  const memoryHoleCount = timeline?.memoryHoles.length ?? 0;
  const contextRejectionCount =
    timeline?.contextRejections?.filter((cr) => cr.rejected).length ?? 0;

  // Map: snapshotId -> count of rejected context rejections
  const snapshotRejectionCounts = new Map<string, number>();
  for (const cr of timeline?.contextRejections ?? []) {
    if (cr.rejected) {
      snapshotRejectionCounts.set(
        cr.snapshotId,
        (snapshotRejectionCounts.get(cr.snapshotId) ?? 0) + 1
      );
    }
  }

  // Group search results by poll cycle
  const searchResultsByPollCycle = new Map<string, TimelineSearchResult[]>();
  for (const sr of timeline?.searchResults ?? []) {
    const list = searchResultsByPollCycle.get(sr.pollCycleId) ?? [];
    list.push(sr);
    searchResultsByPollCycle.set(sr.pollCycleId, list);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            &larr; All Events
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">
            {event.title}
          </h1>
          {event.description && (
            <p className="text-muted-foreground mt-1">{event.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={event.status === "active" ? "default" : "secondary"}>
              {event.status}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              Threshold: {event.driftThreshold.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {timeline?.snapshots.length ?? 0} snapshots
            </span>
            {ghostPivotCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {ghostPivotCount} Ghost Pivot{ghostPivotCount > 1 ? "s" : ""}
              </Badge>
            )}
            {memoryHoleCount > 0 && (
              <Badge className="bg-black text-white text-xs">
                {memoryHoleCount} Memory Hole{memoryHoleCount > 1 ? "s" : ""}
              </Badge>
            )}
            {contextRejectionCount > 0 && (
              <Badge className="bg-orange-600 text-white text-xs">
                {contextRejectionCount} Context Rejection{contextRejectionCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePollNow}
            disabled={polling}
            variant={polling ? "secondary" : "default"}
          >
            {polling ? "Polling..." : "Poll Now"}
          </Button>
          <Link href={`/events/${slug}/chat`}>
            <Button variant="outline">Interrogate</Button>
          </Link>
        </div>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Narrative Drift Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <DriftTimeline
            snapshots={timeline?.snapshots ?? []}
            driftScores={timeline?.driftScores ?? []}
            memoryHoles={timeline?.memoryHoles ?? []}
            driftThreshold={event.driftThreshold}
            onSnapshotClick={setSelectedSnapshot}
          />
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
              Claude
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              GPT-4o
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
              Grok
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              Gemini
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span>Larger dot = more drift</span>
            <span className="text-red-500">Red ring = Ghost Pivot</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Snapshots */}
        <div className="col-span-2">
          <Tabs defaultValue="latest">
            <TabsList>
              <TabsTrigger value="latest">Latest Snapshots</TabsTrigger>
              <TabsTrigger value="all">All Snapshots</TabsTrigger>
              <TabsTrigger value="diff">Compare</TabsTrigger>
            </TabsList>

            <TabsContent value="latest" className="space-y-3 mt-4">
              {Object.entries(snapshotsByModel).map(([modelId, snaps]) => {
                const latest = snaps[0];
                if (!latest) return null;
                return (
                  <SnapshotCard
                    key={modelId}
                    snapshot={latest}
                    driftScore={snapshotDriftMap.get(latest.id)}
                    contextRejectionCount={snapshotRejectionCounts.get(latest.id) ?? 0}
                    expanded={selectedSnapshot?.id === latest.id}
                    onClick={() =>
                      setSelectedSnapshot(
                        selectedSnapshot?.id === latest.id ? null : latest
                      )
                    }
                  />
                );
              })}
            </TabsContent>

            <TabsContent value="all" className="space-y-3 mt-4">
              {(timeline?.snapshots ?? []).map((snap) => (
                <SnapshotCard
                  key={snap.id}
                  snapshot={snap}
                  driftScore={snapshotDriftMap.get(snap.id)}
                  contextRejectionCount={snapshotRejectionCounts.get(snap.id) ?? 0}
                  expanded={selectedSnapshot?.id === snap.id}
                  onClick={() =>
                    setSelectedSnapshot(
                      selectedSnapshot?.id === snap.id ? null : snap
                    )
                  }
                />
              ))}
            </TabsContent>

            <TabsContent value="diff" className="mt-4">
              {timeline && timeline.snapshots.length >= 2 ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comparing the two most recent snapshots from the same model.
                  </p>
                  {Object.entries(snapshotsByModel).map(
                    ([modelId, snaps]) => {
                      if (snaps.length < 2) return null;
                      return (
                        <div key={modelId} className="mb-6">
                          <h3 className="text-sm font-medium mb-2">
                            {modelId}
                          </h3>
                          <SnapshotDiff left={snaps[1]} right={snaps[0]} />
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Need at least 2 poll cycles to compare.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Sources + Chat */}
        <div className="space-y-6">
          <SourcePanel
            eventId={event.id}
            sources={sources}
            onSourcesChange={loadSources}
          />

          {/* Search Results from latest poll cycle */}
          {timeline?.searchResults && timeline.searchResults.length > 0 && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Search Results ({timeline.searchResults.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {timeline.searchResults.slice(0, 5).map((sr) => (
                    <div key={sr.id} className="text-xs border-b border-border/50 pb-2">
                      <a
                        href={sr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {sr.title}
                      </a>
                      <span className="text-muted-foreground ml-1 font-mono">
                        ({(sr.score * 100).toFixed(0)}%)
                      </span>
                      {sr.publishedDate && (
                        <span className="text-muted-foreground ml-1">
                          · {sr.publishedDate}
                        </span>
                      )}
                      <p className="text-muted-foreground mt-0.5 line-clamp-2">
                        {sr.content}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <Separator />
          <ChatPanel eventId={event.id} />
        </div>
      </div>
    </div>
  );
}
