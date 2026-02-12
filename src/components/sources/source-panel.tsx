"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Source } from "@/lib/db/schema";

interface SourcePanelProps {
  eventId: string;
  sources: Source[];
  onSourcesChange: () => void;
  onToggleSource?: (sourceId: string, isActive: boolean) => void;
}

export function SourcePanel({
  eventId,
  sources,
  onSourcesChange,
  onToggleSource,
}: SourcePanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/events/${eventId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, content }),
      });
      setTitle("");
      setUrl("");
      setContent("");
      setShowForm(false);
      onSourcesChange();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(sourceId: string, isActive: boolean) {
    try {
      await fetch(`/api/events/${eventId}/sources`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, isActive }),
      });
      onSourcesChange();
      onToggleSource?.(sourceId, isActive);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Sources / Evidence</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Add Source"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <Label htmlFor="src-title" className="text-xs">
                  Title
                </Label>
                <Input
                  id="src-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Source title"
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="src-url" className="text-xs">
                  URL (optional)
                </Label>
                <Input
                  id="src-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="src-content" className="text-xs">
                  Content
                </Label>
                <Textarea
                  id="src-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste article text, key facts, or evidence..."
                  rows={4}
                  required
                  className="text-sm"
                />
              </div>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Adding..." : "Add Source"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {sources.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No sources added yet. Sources are fed into the prompt when polling
          models.
        </p>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                source.isActive
                  ? "border-border"
                  : "border-border/50 opacity-60"
              }`}
            >
              <Switch
                checked={source.isActive}
                onCheckedChange={(checked) =>
                  handleToggle(source.id, checked)
                }
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {source.title}
                </div>
                {source.url && (
                  <div className="text-xs text-muted-foreground truncate">
                    {source.url}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {source.content}
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {source.isActive ? "active" : "disabled"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
