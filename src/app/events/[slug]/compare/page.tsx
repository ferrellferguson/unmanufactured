"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SnapshotDiff } from "@/components/snapshots/snapshot-diff";
import type { Event } from "@/lib/db/schema";

interface TimelineSnapshot {
  id: string;
  modelId: string;
  modelProvider: string;
  responseText: string;
  pollCycleId: string;
  tokenCount: number | null;
  createdAt: string;
}

export default function ComparePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [snapshots, setSnapshots] = useState<TimelineSnapshot[]>([]);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((events: Event[]) => {
        const found = events.find((e) => e.slug === slug);
        if (found) setEvent(found);
      })
      .catch(console.error);
  }, [slug]);

  const loadSnapshots = useCallback(() => {
    if (!event) return;
    fetch(`/api/events/${event.id}/timeline`)
      .then((r) => r.json())
      .then((data: { snapshots: TimelineSnapshot[] }) => {
        setSnapshots(data.snapshots);
      })
      .catch(console.error);
  }, [event]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const leftSnap = snapshots.find((s) => s.id === leftId);
  const rightSnap = snapshots.find((s) => s.id === rightId);

  if (!event) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        href={`/events/${slug}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        &larr; Back to {event.title}
      </Link>
      <h1 className="text-xl font-bold mt-2 mb-4">
        Compare Snapshots: {event.title}
      </h1>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">
            Left Snapshot
          </label>
          <Select value={leftId} onValueChange={setLeftId}>
            <SelectTrigger>
              <SelectValue placeholder="Select snapshot..." />
            </SelectTrigger>
            <SelectContent>
              {snapshots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.modelId} — {new Date(s.createdAt).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">
            Right Snapshot
          </label>
          <Select value={rightId} onValueChange={setRightId}>
            <SelectTrigger>
              <SelectValue placeholder="Select snapshot..." />
            </SelectTrigger>
            <SelectContent>
              {snapshots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.modelId} — {new Date(s.createdAt).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {leftSnap && rightSnap ? (
        <SnapshotDiff left={leftSnap} right={rightSnap} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Select two snapshots to compare.
        </p>
      )}
    </div>
  );
}
