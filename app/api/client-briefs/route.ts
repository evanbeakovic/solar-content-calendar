import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/client-briefs?client_id=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const client_id = searchParams.get("client_id");

    if (!client_id) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("client_briefs")
      .select("*")
      .eq("client_id", client_id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ brief: data });
  } catch (err: any) {
    console.error("GET /api/client-briefs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/client-briefs — create or update (upsert by client_id)
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const {
      client_id,
      business_type,
      industry,
      target_audience,
      brand_voice,
      content_pillars,
      tone_examples,
      language,
      extra_notes,
      brand_guidelines,
      ai_style_summary,
    } = body;

    if (!client_id) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("client_briefs")
      .upsert(
        {
          client_id,
          business_type,
          industry,
          target_audience,
          brand_voice,
          content_pillars,
          tone_examples,
          language: language || "English",
          extra_notes,
          brand_guidelines,
          ai_style_summary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ brief: data });
  } catch (err: any) {
    console.error("POST /api/client-briefs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
