/**
 * Supabase Backend — Drop-in replacement for @base44/sdk client.
 *
 * Exports `base44` with the same API shape as the Base44 SDK:
 *   base44.entities.<Entity>.create / list / filter / get / update / delete / ...
 *   base44.auth.me / isAuthenticated / loginViaEmailPassword / logout / ...
 *   base44.integrations.Core.UploadFile / InvokeLLM / ...
 *   base44.analytics.track(...)
 *
 * To switch from Base44 to Supabase, change src/api/base44Client.js to:
 *   export { base44 } from "@/api/supabaseBackend";
 */
import { supabase } from "@/lib/supabaseClient";
import { safeReturnTo } from "@/lib/authReturnTo";

// ─── Entity → Table mapping ───────────────────────────────────
const ENTITY_TABLES = {
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
  PatwariHalqa: "patwari_halqas",
  Referral: "referrals",
  ChatMessage: "chat_messages",
  User: "profiles",
};

// ─── Get current user id ──────────────────────────────────────
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ─── Parse sort string ("-updated_date" → { field, ascending }) ─
function parseSort(sort) {
  if (!sort) return null;
  const desc = sort.startsWith("-");
  return { field: desc ? sort.slice(1) : sort, ascending: !desc };
}

// ─── Apply MongoDB-style query to a Supabase query builder ─────
function applyFilters(query, table) {
  let q = supabase.from(table).select("*");
  if (!query || typeof query !== "object") return q;

  for (const [key, value] of Object.entries(query)) {
    if (key === "$or" && Array.isArray(value)) {
      const parts = value
        .map((obj) =>
          Object.entries(obj)
            .map(([k, v]) => `${k}.eq.${typeof v === "string" ? v : JSON.stringify(v)}`)
            .join(",")
        )
        .join(",");
      q = q.or(parts);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      if (value.$in) q = q.in(key, value.$in);
      else if (value.$gte != null) q = q.gte(key, value.$gte);
      else if (value.$lte != null) q = q.lte(key, value.$lte);
      else if (value.$gt != null) q = q.gt(key, value.$gt);
      else if (value.$lt != null) q = q.lt(key, value.$lt);
      else if (value.$ne != null) q = q.neq(key, value.$ne);
    } else {
      q = q.eq(key, value);
    }
  }
  return q;
}

// ─── Entity factory ───────────────────────────────────────────
function createEntity(table) {
  return {
    async create(data) {
      const userId = await getCurrentUserId();
      const payload = { ...data, created_by_id: userId };
      const { data: result, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },

    async bulkCreate(arr) {
      const userId = await getCurrentUserId();
      const payload = arr.map((d) => ({ ...d, created_by_id: userId }));
      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) throw new Error(error.message);
      return data || [];
    },

    async list(sort, limit) {
      let q = supabase.from(table).select("*");
      const s = parseSort(sort);
      if (s) q = q.order(s.field, { ascending: s.ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },

    async filter(query, sort, limit) {
      let q = applyFilters(query, table);
      const s = parseSort(sort);
      if (s) q = q.order(s.field, { ascending: s.ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async update(id, data) {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },

    async bulkUpdate(arr) {
      const { data, error } = await supabase
        .from(table)
        .upsert(arr, { onConflict: "id" })
        .select();
      if (error) throw new Error(error.message);
      return data || [];
    },

    async updateMany(query, update) {
      const setData = update.$set || update;
      let q = supabase.from(table).update(setData);
      if (query && typeof query === "object") {
        for (const [key, value] of Object.entries(query)) {
          q = q.eq(key, value);
        }
      }
      const { error } = await q;
      if (error) throw new Error(error.message);
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async deleteMany(query) {
      let q = supabase.from(table).delete();
      if (query && typeof query === "object") {
        for (const [key, value] of Object.entries(query)) {
          if (value !== null && typeof value === "object" && value.$in) {
            q = q.in(key, value.$in);
          } else {
            q = q.eq(key, value);
          }
        }
      }
      const { error } = await q;
      if (error) throw new Error(error.message);
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`public:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            const typeMap = { INSERT: "create", UPDATE: "update", DELETE: "delete" };
            callback({
              type: typeMap[payload.eventType] || payload.eventType.toLowerCase(),
              data: payload.new || payload.old,
            });
          }
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    },

    schema() {
      return {};
    },
  };
}

// ─── Build all entities ───────────────────────────────────────
const entities = {};
for (const [entityName, tableName] of Object.entries(ENTITY_TABLES)) {
  entities[entityName] = createEntity(tableName);
}

// ─── Auth ─────────────────────────────────────────────────────
const auth = {
  async me() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || "",
      role: profile?.role || "user",
      created_date: profile?.created_date || user.created_at,
    };
  },

  async isAuthenticated() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Resolve returnTo safely (same-origin validation strips open-redirect values)
    window.location.href = safeReturnTo();
    return data;
  },

  async loginWithProvider(provider, fromUrl) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: fromUrl || window.location.origin },
    });
    if (error) throw error;
    return data;
  },

  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    // Does NOT log in — user unverified (if email confirmation enabled)
    return data;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });
    if (error) throw error;

    // After OTP verification, set session and hard redirect
    window.location.href = safeReturnTo();
    return data;
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw error;
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    // Always show generic success (API hides whether email exists)
  },

  async resetPassword({ resetToken, newPassword }) {
    // Supabase sets the session via the recovery URL automatically.
    // The resetToken is not used — the session is already active.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    // Hard redirect to login
    window.location.href = "/login";
  },

  async updateMe(data) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: result, error } = await supabase
      .from("profiles")
      // NOTE: role is intentionally NOT updatable here — clients must never set
      // their own role. Only a server-side admin function with asServiceRole may
      // change roles, otherwise any user could self-escalate to admin.
      .update({
        full_name: data.full_name,
      })
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.reload();
    }
  },

  async redirectToLogin(nextUrl) {
    const url = nextUrl
      ? `/login?returnTo=${encodeURIComponent(nextUrl)}`
      : "/login";
    window.location.href = url;
  },
};

// ─── Users (invite — requires server-side admin API) ──────────
const users = {
  async inviteUser(email, role) {
    throw new Error(
      "User invitation requires the Supabase Admin API (service role key). " +
        "Create a Supabase Edge Function for this."
    );
  },
};

// ─── Integrations ─────────────────────────────────────────────
const integrations = {
  Core: {
    async UploadFile({ file }) {
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const { error } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("uploads").getPublicUrl(fileName);
      return { file_url: data.publicUrl };
    },

    async UploadPrivateFile({ file }) {
      const fileName = `private/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(fileName, file, { public: false });
      if (error) throw new Error(error.message);
      return { file_uri: data.path };
    },

    async CreateFileSignedUrl({ file_uri, expires_in = 300 }) {
      const { data, error } = await supabase.storage
        .from("uploads")
        .createSignedUrl(file_uri, expires_in);
      if (error) throw new Error(error.message);
      return { signed_url: data.signedUrl };
    },

    // AI / external integrations — require Supabase Edge Functions with API keys.
    // See: supabase/functions/ directory. Until configured, these throw a clear
    // message so the UI's try/catch can show it to the user (not a silent crash).
    async InvokeLLM({ prompt, response_json_schema }) {
      throw new Error("AI فیچر ابھی دستیاب نہیں — Supabase Edge Function سیٹ اپ کریں (InvokeLLM)۔");
    },
    async SendEmail() {
      throw new Error("ای میل بھیجنے کے لیے Edge Function سیٹ اپ کریں (SendEmail)۔");
    },
    async GenerateImage() {
      throw new Error("تصویر بنانے کے لیے Edge Function سیٹ اپ کریں (GenerateImage)۔");
    },
    async TranscribeAudio() {
      throw new Error("آڈيو ٹرانسکرائب کے لیے Edge Function سیٹ اپ کریں۔");
    },
    async GenerateSpeech() {
      throw new Error("speech بنانے کے لیے Edge Function سیٹ اپ کریں۔");
    },
    async GenerateVideo() {
      throw new Error("ویڈیو بنانے کے لیے Edge Function سیٹ اپ کریں۔");
    },
    async ExtractDataFromUploadedFile() {
      throw new Error("فائل سے ڈیٹا نکالنے کے لیے Edge Function سیٹ اپ کریں۔");
    },
    async SendPushNotification() {
      throw new Error("Push notification کے لیے Edge Function سیٹ اپ کریں۔");
    },
  },
};

// ─── Analytics ────────────────────────────────────────────────
const analytics = {
  track({ eventName, properties }) {
    // Optional: log to a Supabase table or external analytics service
    console.log("[analytics]", eventName, properties || {});
  },
};

// ─── Service Role (for backend functions only) ────────────────
const asServiceRole = {
  connectors: {
    async getConnection(type) {
      throw new Error("Connectors require server-side implementation.");
    },
  },
  integrations: integrations,
};

// ─── Export ───────────────────────────────────────────────────
export const base44 = {
  entities,
  auth,
  users,
  integrations,
  analytics,
  asServiceRole,
};