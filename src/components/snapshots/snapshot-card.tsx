"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DriftScore } from "@/lib/db/schema";

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-4-20250514": "Claude",
  "gpt-4o": "GPT-4o",
  "grok-3": "Grok 3",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
};

interface SnapshotCardProps {
  snapshot: {
    id: string;
    modelId: string;
    modelProvider: string;
    responseText: string;
    tokenCount: number | null;
    createdAt: string;
  };
  driftScore?: DriftScore | null;
  contextRejectionCount?: number;
  expanded?: boolean;
  onClick?: () => void;
}

export function SnapshotCard({
  snapshot,
  driftScore,
  contextRejectionCount = 0,
  expanded = false,
  onClick,
}: SnapshotCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${expanded ? "ring-2 ring-primary" : "hover:border-primary/30"}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {MODEL_LABELS[snapshot.modelId] ?? snapshot.modelId}
          </CardTitle>
          <div className="flex items-center gap-2">
            {contextRejectionCount > 0 && (
              <Badge className="bg-orange-600 text-white text-xs">
                {contextRejectionCount} Context Rejection{contextRejectionCount > 1 ? "s" : ""}
              </Badge>
            )}
            {driftScore?.ghostPivot && (
              <Badge variant="destructive" className="text-xs">
                Ghost Pivot
              </Badge>
            )}
            {driftScore && (
              <Badge
                variant={
                  driftScore.driftMagnitude > 0.1
                    ? "destructive"
                    : driftScore.driftMagnitude > 0.05
                      ? "secondary"
                      : "outline"
                }
                className="text-xs font-mono"
              >
                {(driftScore.driftMagnitude * 100).toFixed(1)}% drift
              </Badge>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {new Date(snapshot.createdAt).toLocaleString()}
          {snapshot.tokenCount && ` · ${snapshot.tokenCount} tokens`}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`text-sm whitespace-pre-wrap ${expanded ? "" : "line-clamp-4"}`}
        >
          {snapshot.responseText}
        </div>
        {!expanded && snapshot.responseText.length > 300 && (
          <p className="text-xs text-muted-foreground mt-2">
            Click to expand...
          </p>
        )}
        {driftScore?.ghostPivot && driftScore.ghostPivotExplanation && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <div className="text-xs font-medium text-red-500 mb-1">
              Ghost Pivot Detected
            </div>
            <div className="text-xs text-red-300">
              {driftScore.ghostPivotExplanation}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
