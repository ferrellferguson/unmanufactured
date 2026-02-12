"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SnapshotDiffProps {
  left: {
    modelId: string;
    responseText: string;
    createdAt: string;
  };
  right: {
    modelId: string;
    responseText: string;
    createdAt: string;
  };
}

export function SnapshotDiff({ left, right }: SnapshotDiffProps) {
  // Simple word-level diff highlighting
  const leftWords = left.responseText.split(/\s+/);
  const rightWords = right.responseText.split(/\s+/);
  const rightSet = new Set(rightWords);
  const leftSet = new Set(leftWords);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {left.modelId} — {new Date(left.createdAt).toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {leftWords.map((word, i) => (
              <span
                key={i}
                className={!rightSet.has(word) ? "bg-red-500/20 text-red-300" : ""}
              >
                {word}{" "}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {right.modelId} — {new Date(right.createdAt).toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {rightWords.map((word, i) => (
              <span
                key={i}
                className={!leftSet.has(word) ? "bg-green-500/20 text-green-300" : ""}
              >
                {word}{" "}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
