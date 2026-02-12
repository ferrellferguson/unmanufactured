"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function FeedbackModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, name, email }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setStatus("success");
      setMessage("");
      setName("");
      setEmail("");
      setTimeout(() => {
        onOpenChange(false);
        setStatus("idle");
      }, 1500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setStatus("idle"); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Have a suggestion or found an issue? Let us know.
          </DialogDescription>
        </DialogHeader>
        {status === "success" ? (
          <p className="py-6 text-center text-sm text-green-400">
            Thanks for your feedback!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fb-message">Message *</Label>
              <Textarea
                id="fb-message"
                placeholder="What's on your mind?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fb-name">Name</Label>
                <Input
                  id="fb-name"
                  placeholder="Optional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fb-email">Email</Label>
                <Input
                  id="fb-email"
                  type="email"
                  placeholder="Optional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {status === "error" && (
              <p className="text-sm text-red-400">
                Something went wrong. Please try again.
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={status === "loading" || !message.trim()}>
                {status === "loading" ? "Sending..." : "Send Feedback"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
