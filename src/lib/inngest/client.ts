import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "unmanufactured",
  // v4 defaults to cloud mode, which requires a signing key. Opt into the local
  // Dev Server explicitly instead of relying on an implicit default.
  isDev: process.env.NODE_ENV === "development",
  // Checkpointing is on by default in v4 and lets several steps run in one
  // request. The serve default of 10s is well below our route's maxDuration, so
  // raise it — runs longer than this fall back to async (v3-style) execution.
  checkpointing: { maxRuntime: "90s" },
});
