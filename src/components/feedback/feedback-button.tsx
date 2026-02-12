"use client";

import { useState } from "react";
import { FeedbackModal } from "./feedback-modal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        Feedback
      </button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
