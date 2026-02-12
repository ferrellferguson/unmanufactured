"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { DriftScore } from "@/lib/db/schema";

const MODEL_COLORS: Record<string, string> = {
  "claude-sonnet-4-20250514": "#d97706",
  "gpt-4o": "#10b981",
  "grok-3": "#6366f1",
  "gemini-2.0-flash": "#ef4444",
};

const MODEL_Y: Record<string, number> = {
  "claude-sonnet-4-20250514": 4,
  "gpt-4o": 3,
  "grok-3": 2,
  "gemini-2.0-flash": 1,
};

interface TimelineSnapshot {
  id: string;
  modelId: string;
  modelProvider: string;
  responseText: string;
  pollCycleId: string;
  tokenCount: number | null;
  createdAt: string;
}

interface TimelineProps {
  snapshots: TimelineSnapshot[];
  driftScores: DriftScore[];
  memoryHoles: { id: string; missingFromSnapshotId: string; detectedAt: string }[];
  driftThreshold: number;
  onSnapshotClick: (snapshot: TimelineSnapshot) => void;
}

export function DriftTimeline({
  snapshots,
  driftScores,
  memoryHoles,
  driftThreshold,
  onSnapshotClick,
}: TimelineProps) {
  // Build data points
  const driftMap = new Map(
    driftScores.map((d) => [d.currentSnapshotId, d])
  );
  const holeSnapshotIds = new Set(
    memoryHoles.map((h) => h.missingFromSnapshotId)
  );

  const dataPoints = snapshots.map((s) => {
    const drift = driftMap.get(s.id);
    return {
      time: new Date(s.createdAt).getTime(),
      modelY: MODEL_Y[s.modelId] ?? 0,
      modelId: s.modelId,
      driftMagnitude: drift?.driftMagnitude ?? 0,
      ghostPivot: drift?.ghostPivot ?? false,
      memoryHole: holeSnapshotIds.has(s.id),
      snapshot: s,
      displayTime: new Date(s.createdAt).toLocaleString(),
    };
  });

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;

    const size = Math.max(6, Math.min(20, payload.driftMagnitude * 200));
    const color = payload.ghostPivot
      ? "#ef4444" // red for ghost pivots
      : payload.memoryHole
        ? "#000000" // black for memory holes
        : MODEL_COLORS[payload.modelId] ?? "#888";

    return (
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={color}
        stroke={payload.ghostPivot ? "#fff" : "none"}
        strokeWidth={payload.ghostPivot ? 2 : 0}
        opacity={0.85}
        style={{ cursor: "pointer" }}
        onClick={() => onSnapshotClick(payload.snapshot)}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <div className="font-medium">{data.modelId}</div>
        <div className="text-muted-foreground">{data.displayTime}</div>
        <div className="mt-1">
          Drift: {(data.driftMagnitude * 100).toFixed(1)}%
        </div>
        {data.ghostPivot && (
          <div className="text-red-500 font-medium mt-1">GHOST PIVOT</div>
        )}
        {data.memoryHole && (
          <div className="text-white bg-black px-1 rounded font-medium mt-1">
            MEMORY HOLE
          </div>
        )}
      </div>
    );
  };

  if (dataPoints.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No snapshots yet. Click &ldquo;Poll Now&rdquo; to start tracking.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t) =>
            new Date(t).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
            })
          }
          tick={{ fontSize: 11 }}
        />
        <YAxis
          dataKey="modelY"
          type="number"
          domain={[0.5, 4.5]}
          ticks={[1, 2, 3, 4]}
          tickFormatter={(v: number) =>
            ["", "Gemini", "Grok", "GPT-4o", "Claude"][v] ?? ""
          }
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Scatter data={dataPoints} shape={<CustomDot />} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
