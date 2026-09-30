import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { pollAllEvents } from "@/lib/inngest/functions/poll-all-events";
import { pollSingleEvent } from "@/lib/inngest/functions/poll-single-event";

// Checkpointing runs several steps per request, so give the route room to work.
// Keep this above the client's checkpointing maxRuntime.
export const maxDuration = 120;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pollAllEvents, pollSingleEvent],
  serveOrigin: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
  servePath: "/api/inngest",
});
