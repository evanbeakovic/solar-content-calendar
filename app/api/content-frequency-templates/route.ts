import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/content-frequency-templates?client_id=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const client_id = searchParams.get("client_id");

    if (!client_id) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("content_frequency_templates")
      .select("*")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ templates: data });
  } catch (err: any) {
    console.error("GET /api/content-frequency-templates error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/content-frequency-templates — create new template
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const { client_id, name, platforms, is_default } = body;

    if (!client_id || !name || !platforms) {
      return NextResponse.json(
        { error: "client_id, name, and platforms are required" },
        { status: 400 }
      );
    }

    if (is_default) {
      await supabase
        .from("content_frequency_templates")
        .update({ is_default: false })
        .eq("client_id", client_id);
    }

    const { data, error } = await supabase
      .from("content_frequency_templates")
      .insert({ client_id, name, platforms, is_default: is_default || false })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (err: any) {
    console.error("POST /api/content-frequency-templates error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/content-frequency-templates — update existing template
export async function PUT(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const { id, client_id, name, platforms, is_default } = body;

    if (!id || !client_id) {
      return NextResponse.json({ error: "id and client_id are required" }, { status: 400 });
    }

    if (is_default) {
      await supabase
        .from("content_frequency_templates")
        .update({ is_default: false })
        .eq("client_id", client_id)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("content_frequency_templates")
      .update({
        name,
        platforms,
        is_default: is_default || false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (err: any) {
    console.error("PUT /api/content-frequency-templates error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/content-frequency-templates?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("content_frequency_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/content-frequency-templates error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
