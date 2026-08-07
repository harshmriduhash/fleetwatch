import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * The incident engine is deterministic: thresholds decide, models never do.
 * Only the postmortem prose is model-generated, and it is always a draft.
 */
export const draftPostmortem = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        title: z.string(),
        agentName: z.string(),
        severity: z.string(),
        openedAt: z.string(),
        resolvedAt: z.string().nullable(),
        timeline: z.array(z.object({ at: z.string(), type: z.string(), detail: z.string() })),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { draft: null, error: "AI drafting is not configured." };

    const timeline = data.timeline
      .map((e) => `- ${e.at} [${e.type}] ${e.detail}`)
      .join("\n");

    const prompt = `You are an SRE writing an incident postmortem for an AI agent outage.

Incident: ${data.title}
Agent: ${data.agentName}
Severity: ${data.severity}
Opened: ${data.openedAt}
Resolved: ${data.resolvedAt ?? "not yet resolved"}

Timeline:
${timeline}

Write a concise markdown postmortem with these sections: Summary, Impact, Timeline, Probable root cause, Action items (as a checklist).
Be factual and only use what the timeline supports. Where the cause is not determinable from the timeline, say so explicitly rather than speculating. No preamble.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.status === 429) return { draft: null, error: "Rate limit reached. Try again shortly." };
      if (res.status === 402)
        return { draft: null, error: "AI credits exhausted for this workspace." };
      if (!res.ok) return { draft: null, error: "Drafting service unavailable." };
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const draft = json.choices?.[0]?.message?.content ?? null;
      return { draft, error: draft ? null : "No draft returned." };
    } catch {
      return { draft: null, error: "Drafting service unavailable." };
    }
  });
