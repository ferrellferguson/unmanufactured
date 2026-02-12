import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { pollAllEvents } from "@/lib/inngest/functions/poll-all-events";
import { pollSingleEvent } from "@/lib/inngest/functions/poll-single-event";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pollAllEvents, pollSingleEvent],
});
