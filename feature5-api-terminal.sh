#!/bin/bash
# Solar App — Feature 5: API Foundation
# Run from project root: /Users/evanbeakovic/Solar App/
# Checkpoint first:
# git add . && git commit -m "checkpoint before: content planning API foundation"

# ─── Create directories ───────────────────────────────────────────────────────
mkdir -p "app/api/client-briefs"
mkdir -p "app/api/content-frequency-templates"
mkdir -p "app/api/content-plan-previews"

# ─── 1. client-briefs/route.ts ────────────────────────────────────────────────
cat > "app/api/client-briefs/route.ts" << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

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
EOF

# ─── 2. content-frequency-templates/route.ts ─────────────────────────────────
cat > "app/api/content-frequency-templates/route.ts" << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

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
EOF

# ─── 3. content-plan-previews/route.ts ───────────────────────────────────────
cat > "app/api/content-plan-previews/route.ts" << 'EOF'
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
EOF

echo ""
echo "✅ Done. Three API routes created:"
echo "   app/api/client-briefs/route.ts"
echo "   app/api/content-frequency-templates/route.ts"
echo "   app/api/content-plan-previews/route.ts"
echo ""
echo "Next steps:"
echo "  1. npx tsc --noEmit --skipLibCheck 2>&1"
echo "  2. git add . && git commit -m 'feat: content planning API routes'"
