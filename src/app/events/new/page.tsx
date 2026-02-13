"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptTemplate, setPromptTemplate] = useState(
    "## Event to Analyze\n\nProvide a comprehensive, factual analysis of this event. Focus on verified facts, note uncertainties, and flag any claims that lack supporting evidence."
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [driftThreshold, setDriftThreshold] = useState("5");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          promptTemplate: promptTemplate.includes(title)
            ? promptTemplate
            : `## Event: ${title}\n\n${promptTemplate}`,
          searchQuery: searchQuery || undefined,
          driftThreshold: parseFloat(driftThreshold) / 100,
        }),
      });

      if (!res.ok) throw new Error("Failed to create event");

      const event = await res.json();
      router.push(`/events/${event.slug}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Event</CardTitle>
          <CardDescription>
            Set up a new event to track across AI models. The prompt template
            will be used to query each model during polling cycles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                placeholder="e.g., Minneapolis ICE Shooting"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the event being tracked..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt Template</Label>
              <Textarea
                id="prompt"
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                rows={6}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This template is sent to each AI model along with active
                sources. It should describe the event and what analysis you want.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="searchQuery">Search Query (optional)</Label>
              <Input
                id="searchQuery"
                placeholder="e.g., Alex Pretti Minneapolis ICE shooting 2025"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Custom search query for fetching real-time results via Tavily.
                Defaults to the event title if left blank.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">
                Drift Threshold (1% - 50%)
              </Label>
              <Input
                id="threshold"
                type="number"
                min="1"
                max="50"
                step="1"
                value={driftThreshold}
                onChange={(e) => setDriftThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Narrative shifts above this threshold are flagged. Lower =
                more sensitive. Default 5%.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
