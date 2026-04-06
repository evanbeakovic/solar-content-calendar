import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET /api/content-plan-previews?client_id=xxx&status=pending
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const client_id = searchParams.get("client_id");
    const status = searchParams.get("status");

    if (!client_id) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    let query = supabase
      .from("content_plan_previews")
      .select("*")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ previews: data });
  } catch (err: any) {
    console.error("GET /api/content-plan-previews error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/content-plan-previews — save a new generated plan preview
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const {
      client_id,
      generated_by,
      month,
      frequency_template_id,
      month_notes,
      posts,
    } = body;

    if (!client_id || !generated_by || !month || !posts) {
      return NextResponse.json(
        { error: "client_id, generated_by, month, and posts are required" },
        { status: 400 }
      );
    }

    // Dismiss any existing pending previews for same client + month
    await supabase
      .from("content_plan_previews")
      .update({ status: "dismissed" })
      .eq("client_id", client_id)
      .eq("month", month)
      .eq("status", "pending");

    const { data, error } = await supabase
      .from("content_plan_previews")
      .insert({
        client_id,
        generated_by,
        month,
        frequency_template_id: frequency_template_id || null,
        month_notes: month_notes || null,
        posts,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ preview: data });
  } catch (err: any) {
    console.error("POST /api/content-plan-previews error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/content-plan-previews — update status or posts array
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const { id, status, posts } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (posts) updates.posts = posts;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("content_plan_previews")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ preview: data });
  } catch (err: any) {
    console.error("PATCH /api/content-plan-previews error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
