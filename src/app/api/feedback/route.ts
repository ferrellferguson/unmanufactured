import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const name = body.name?.trim() || null;
  const email = body.email?.trim() || null;

  const [row] = await db
    .insert(feedback)
    .values({ message, name, email })
    .returning();

  // Send email notification (best-effort, don't fail the request)
  const feedbackEmail = process.env.FEEDBACK_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && feedbackEmail) {
    try {
      const resend = new Resend(resendKey);
      const result = await resend.emails.send({
        from: "Unmanufactured Feedback <feedback@unmanufactured.org>",
        to: feedbackEmail,
        subject: `New feedback${name ? ` from ${name}` : ""}`,
        text: [
          `Message:\n${message}`,
          name ? `Name: ${name}` : null,
          email ? `Email: ${email}` : null,
          `\nSubmitted: ${row.createdAt.toISOString()}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      console.log("Feedback email sent:", JSON.stringify(result));
    } catch (err) {
      console.error("Failed to send feedback email:", err);
    }
  } else {
    console.warn("Feedback email skipped: RESEND_API_KEY or FEEDBACK_EMAIL not set");
  }

  return NextResponse.json({ id: row.id }, { status: 201 });
}
