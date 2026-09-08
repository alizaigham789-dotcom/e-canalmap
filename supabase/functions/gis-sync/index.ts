// ============================================================
// gis-sync — Supabase Edge Function (Deno)
// Automated GIS cadastral sync: refreshes land_maps.total_parcels
// from drawing_data and links land_survey_records to their maps.
//
// Auth — either:
//   • CRON_SECRET header  = x-cron-secret: <CRON_SECRET>   (scheduled runs)
//   • Admin JWT           = Authorization: Bearer <jwt>     (manual runs)
//
// Env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
//
// Deploy:
//   supabase functions deploy gis-sync --no-verify-jwt
// Invoke:
//   curl -X POST https://<project>.functions.supabase.co/gis-sync \
//        -H "x-cron-secret: $CRON_SECRET"
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PARCEL_TYPES = new Set(["mustateel", "muraba", "acre"]);

function jsonBody(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Count parcel objects inside a drawing_data JSON string. */
function countParcels(drawingData: string | null): number {
  if (!drawingData) return 0;
  try {
    const objs = JSON.parse(drawingData);
    if (!Array.isArray(objs)) return 0;
    return objs.filter((o: any) => o && PARCEL_TYPES.has(o.type)).length;
  } catch {
    return 0;
  }
}

/** Extract mustateel labels (khasra numbers) from drawing_data. */
function extractKhasraLabels(drawingData: string | null): Set<string> {
  const labels = new Set<string>();
  if (!drawingData) return labels;
  try {
    const objs = JSON.parse(drawingData);
    if (!Array.isArray(objs)) return labels;
    for (const o of objs) {
      if (o && PARCEL_TYPES.has(o.type) && o.label) {
        labels.add(String(o.label));
      }
    }
  } catch {
    /* ignore */
  }
  return labels;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonBody(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!supabaseUrl || !serviceKey) {
    return jsonBody(500, { error: "Missing server configuration" });
  }

  // ── Auth: cron secret OR admin JWT ──────────────────────────
  const authHeader = req.headers.get("authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const isCron = cronSecret && cronHeader === cronSecret;

  let isAdmin = isCron;
  let adminUser: { id: string; email: string } | null = null;

  if (!isCron && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error } = await admin.auth.getUser(token);
    if (error || !userData.user) {
      return jsonBody(401, { error: "Invalid token" });
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("role, full_name")
      .eq("id", userData.user.id)
      .single();
    if (profile?.role !== "admin") {
      return jsonBody(403, { error: "Admin access required" });
    }
    isAdmin = true;
    adminUser = { id: userData.user.id, email: userData.user.email || "" };
  }

  if (!isAdmin) {
    return jsonBody(401, { error: "Unauthorized — provide CRON_SECRET or admin JWT" });
  }

  // Service-role client bypasses RLS for the sync operation.
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let mapsProcessed = 0;
  let mapsUpdated = 0;
  let surveysLinked = 0;

  try {
    // ── 1. Sync land_maps.total_parcels from drawing_data ─────
    const { data: maps, error: mapsErr } = await sb
      .from("land_maps")
      .select("id, title, drawing_data, total_parcels");

    if (mapsErr) throw new Error(`land_maps fetch: ${mapsErr.message}`);

    for (const m of maps || []) {
      mapsProcessed++;
      const counted = countParcels(m.drawing_data);
      if (counted !== m.total_parcels) {
        const { error: updErr } = await sb
          .from("land_maps")
          .update({ total_parcels: counted })
          .eq("id", m.id);
        if (updErr) {
          errors.push(`map ${m.id}: ${updErr.message}`);
        } else {
          mapsUpdated++;
        }
      }
    }

    // ── 2. Link orphan land_survey_records to maps by khasra ──
    const { data: surveys, error: survErr } = await sb
      .from("land_survey_records")
      .select("id, khasra_no, map_id");

    if (survErr) throw new Error(`land_survey_records fetch: ${survErr.message}`);

    if (surveys && surveys.length) {
      // Build khasra → map_id index from all maps' drawing_data.
      const khasraToMap = new Map<string, string>();
      for (const m of maps || []) {
        const labels = extractKhasraLabels(m.drawing_data);
        for (const lbl of labels) {
          if (!khasraToMap.has(lbl)) khasraToMap.set(lbl, m.id);
        }
      }

      for (const s of surveys) {
        if (s.map_id) continue; // already linked
        const matchId = khasraToMap.get(String(s.khasra_no));
        if (matchId) {
          const { error: linkErr } = await sb
            .from("land_survey_records")
            .update({ map_id: matchId })
            .eq("id", s.id);
          if (linkErr) {
            errors.push(`survey ${s.id}: ${linkErr.message}`);
          } else {
            surveysLinked++;
          }
        }
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return jsonBody(200, {
    ok: errors.length === 0,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    triggered_by: isCron ? "cron" : `admin:${adminUser?.email || "unknown"}`,
    summary: {
      maps_processed: mapsProcessed,
      maps_updated: mapsUpdated,
      surveys_linked: surveysLinked,
      errors: errors.length,
    },
    errors: errors.slice(0, 20),
  });
});