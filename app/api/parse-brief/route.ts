import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".md") && !fileName.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Please upload a .md or .txt file" },
        { status: 400 }
      );
    }

    const text = await file.text();

    if (!text.trim()) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `You are extracting structured data from a client brief document for a social media management app.

Extract the following fields from the brief below and return ONLY a valid JSON object — no markdown, no explanation, just the raw JSON.

Fields to extract:
- business_type: string (what type of business, e.g. "Family-owned winery")
- industry: string (e.g. "Wine & olive oil production")
- target_audience: string (who they are trying to reach)
- brand_voice: string (tone adjectives or short description)
- content_pillars: array of strings (list of content pillars or themes)
- tone_examples: string (how to write, what to avoid, caption examples)
- language: string (language for content, default to "English" if not specified)
- extra_notes: string (seasonal calendar, key dates, hero products, services, website, tagline, anything else relevant)
- brand_guidelines: string (DO's, DON'Ts, approved CTAs, competitors to never mention, specific rules — formatted as bullet points)

Rules:
- If a field cannot be found, return empty string "" for strings or [] for arrays
- Never invent information not in the brief
- Return only the JSON object, nothing else

Brief document:
---
${text}
---`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Claude API error");
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ fields: parsed });
  } catch (err: any) {
    console.error("POST /api/parse-brief error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
