import { inngest } from "../client";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isDueForPoll } from "@/lib/polling/intervals";

export const pollAllEvents = inngest.createFunction(
  { id: "poll-all-events", name: "Poll All Active Events" },
  { cron: "*/15 * * * *" }, // Every 15 minutes — adaptive logic decides who actually polls
  async ({ step }) => {
    const activeEvents = await step.run("fetch-active-events", async () => {
      return db
        .select()
        .from(events)
        .where(eq(events.status, "active"));
    });

    // Filter to only events that are due based on their age and last poll time
    const dueEvents = activeEvents.filter((event) =>
      isDueForPoll(event.createdAt, event.lastPolledAt)
    );

    // Fan out: send an event for each due event to poll individually
    const fanOutEvents = dueEvents.map((event) => ({
      name: "app/poll.single-event" as const,
      data: { eventId: event.id },
    }));

    if (fanOutEvents.length > 0) {
      await step.sendEvent("fan-out-polls", fanOutEvents);
    }

    return {
      active: activeEvents.length,
      due: dueEvents.length,
      skipped: activeEvents.length - dueEvents.length,
    };
  }
);
