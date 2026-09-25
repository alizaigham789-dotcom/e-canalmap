/**
 * Data Migration Script — Base44 → Supabase
 *
 * This script runs in the browser console (or Node with minor tweaks).
 * It exports all entity records from your Base44 REST API and imports them
 * into your Supabase database.
 *
 * BEFORE RUNNING:
 * 1. Create a Supabase account at supabase.com (sign up with alizaigham789@gmail.com)
 * 2. Create a new project
 * 3. Run supabase/schema.sql in the SQL Editor
 * 4. Get your Project URL + anon key from Settings → API
 * 5. Get your Base44 API key (from app.base44.com → your app → Settings → API)
 *
 * USAGE (browser console on any page of your app):
 *   window.__migrate({ baseUrl: "https://e-canalsmaps.base44.app/api", apiKey: "YOUR_KEY", supabaseUrl: "https://xxx.supabase.co", supabaseKey: "anon-key" })
 *
 * Or paste this entire file into a browser console after setting the config below.
 */

const MIGRATION_CONFIG = {
  baseUrl: "https://e-canalsmaps.base44.app/api", // Your Base44 API base URL
  apiKey: "", // Set locally before running; never commit a real key
  supabaseUrl: "", // ← PASTE YOUR SUPABASE PROJECT URL HERE
  supabaseKey: "", // ← PASTE YOUR SUPABASE ANON KEY HERE
};

// Entity name → Supabase table name mapping
const ENTITY_MAP = {
  LandMap: "land_maps",
  ParatWarabandi: "parat_warabandis",
  ParatWarabandiRecord: "parat_warabandi_records",
  MapSnapshot: "map_snapshots",
  Form33CRecord: "form33c_records",
  FormFieldConfig: "form_field_configs",
  FormulaConfig: "formula_configs",
  FardMasrooba: "fard_masroobas",
  TaskAssignment: "task_assignments",
  Subscription: "subscriptions",
  Form1Register: "form1_registers",
  Naqsha27B: "naqsha_27b",
};

// Field name mapping (Base44 field → Supabase column)
const FIELD_MAP = {
  // Common fields that need renaming for specific tables
  // Most fields map 1:1; add overrides here if needed
};

// ─── Fetch all records from a Base44 entity ───────────────────
async function fetchFromBase44(entityName, config) {
  const records = [];
  let skip = 0;
  const limit = 500;

  while (true) {
    const url = `${config.baseUrl}/entities/${entityName}?limit=${limit}&skip=${skip}&sort_by=-created_date`;
    const res = await fetch(url, {
      headers: { api_key: config.apiKey },
    });
    if (!res.ok) {
      console.error(`Failed to fetch ${entityName}: ${res.status} ${res.statusText}`);
      return records;
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    records.push(...batch);
    console.log(`  ${entityName}: fetched ${records.length} records`);
    if (batch.length < limit) break;
    skip += limit;
  }
  return records;
}

// ─── Insert records into Supabase ─────────────────────────────
async function insertIntoSupabase(tableName, records, config) {
  if (records.length === 0) {
    console.log(`  ${tableName}: no records to insert`);
    return 0;
  }

  // Transform: rename fields, strip nulls that would fail constraint checks
  const transformed = records.map((r) => {
    const out = {};
    for (const [key, value] of Object.entries(r)) {
      // Skip Base44 internal fields not in our schema
      if (key === "_id" || key === "__v") continue;

      // Apply field name mapping
      const mappedKey = FIELD_MAP[`${tableName}.${key}`] || key;
      out[mappedKey] = value;
    }
    return out;
  });

  // Insert in batches of 200
  const batchSize = 200;
  let inserted = 0;

  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize);
    const url = `${config.supabaseUrl}/rest/v1/${tableName}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal,resolution=ignore-duplicates",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  ${tableName}: insert failed at batch ${i}: ${res.status}`, errText);
      continue;
    }
    inserted += batch.length;
    console.log(`  ${tableName}: inserted ${inserted}/${transformed.length}`);
  }

  return inserted;
}

// ─── Main migration function ──────────────────────────────────
async function runMigration(config = MIGRATION_CONFIG) {
  if (!config.apiKey || !config.supabaseUrl || !config.supabaseKey) {
    console.error("❌ Missing config! Set baseUrl, apiKey, supabaseUrl, supabaseKey.");
    console.error("   Edit the MIGRATION_CONFIG at the top of this script.");
    return;
  }

  console.log("🚀 Starting migration: Base44 → Supabase");
  console.log(`   Source: ${config.baseUrl}`);
  console.log(`   Target: ${config.supabaseUrl}`);

  const summary = {};

  for (const [entityName, tableName] of Object.entries(ENTITY_MAP)) {
    console.log(`\n📥 Migrating ${entityName} → ${tableName}...`);

    // 1. Fetch from Base44
    const records = await fetchFromBase44(entityName, config);
    console.log(`   Fetched ${records.length} records from Base44`);

    // 2. Insert into Supabase
    const inserted = await insertIntoSupabase(tableName, records, config);
    summary[entityName] = { fetched: records.length, inserted };

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n✅ Migration complete!");
  console.table(summary);
  console.log("\nNext steps:");
  console.log("  1. Verify data in Supabase dashboard → Table Editor");
  console.log("  2. Switch base44Client.js to use supabaseBackend.js");
  console.log("  3. Test the app end-to-end");
}

// ─── Auto-run if config is set ────────────────────────────────
if (MIGRATION_CONFIG.apiKey && MIGRATION_CONFIG.supabaseUrl && MIGRATION_CONFIG.supabaseKey) {
  runMigration().catch((err) => console.error("Migration failed:", err));
} else {
  console.log("📋 Migration script loaded. Set MIGRATION_CONFIG values then call runMigration().");
  console.log("   Or edit the config at the top and re-paste this script.");
}

// Export for manual use
window.__migrate = runMigration;