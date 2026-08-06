#!/usr/bin/env node
/**
 * setup-pocketbase.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates all PocketBase collections and API rules for Точилка.
 * Run once after PocketBase is deployed and superuser is created.
 */

const API = process.env.POCKETBASE_URL || "https://api.tochilka.app";
const EMAIL = process.env.PB_ADMIN_EMAIL || "admin@tochilka.app";
const PASSWORD = process.env.PB_ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error("Error: PB_ADMIN_PASSWORD environment variable is required.");
  process.exit(1);
}

// ── HTTP Helper ──────────────────────────────────────────────────────────

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = token;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { ok: res.ok, status: res.status, data };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Authenticate ──
  console.log("🔐 Authenticating as superuser...");
  const auth = await request(
    "POST",
    "/api/collections/_superusers/auth-with-password",
    { identity: EMAIL, password: PASSWORD }
  );

  if (!auth.ok) {
    console.error("❌ Authentication failed:", JSON.stringify(auth.data));
    process.exit(1);
  }

  const token = auth.data.token;
  console.log("✅ Authenticated successfully\n");

  // ── 2. Define API Rules ──

  // Standard rules for tutor-owned collections
  const tutorRules = {
    listRule: '@request.auth.id != "" && tutorId = @request.auth.id',
    viewRule: '@request.auth.id != "" && tutorId = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && tutorId = @request.auth.id',
    deleteRule: '@request.auth.id != "" && tutorId = @request.auth.id',
  };

  // Rules for user_config (uses userId instead of tutorId)
  const configRules = {
    listRule: '@request.auth.id != "" && userId = @request.auth.id',
    viewRule: '@request.auth.id != "" && userId = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && userId = @request.auth.id',
    deleteRule: '@request.auth.id != "" && userId = @request.auth.id',
  };

  // Rules for community_news (public read, admin-only write)
  const newsRules = {
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  };

  // ── 3. Define Collections ──

  const collections = [
    {
      name: "students",
      type: "base",
      ...tutorRules,
      fields: [
        { name: "tutorId", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "gender", type: "text" },
        { name: "studentGender", type: "text" },
        { name: "grade", type: "text" },
        { name: "timezone", type: "text" },
        { name: "phone", type: "text" },
        { name: "guestHash", type: "text" },
        { name: "balance", type: "number" },
        { name: "ltv", type: "number" },
        { name: "hwDebtCount", type: "number" },
        { name: "colorVersion", type: "number" },
        { name: "colorHue", type: "number" },
        { name: "isArchived", type: "bool" },
        { name: "active", type: "bool" },
        { name: "colorOklch", type: "json" },
        { name: "contacts", type: "json" },
        { name: "subjects", type: "json" },
        { name: "notes", type: "editor" },
      ],
    },
    {
      name: "groups",
      type: "base",
      ...tutorRules,
      fields: [
        { name: "tutorId", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "subject", type: "text" },
        { name: "studentIds", type: "json" },
        { name: "colorOklch", type: "json" },
        { name: "colorVersion", type: "number" },
        { name: "colorHue", type: "number" },
        { name: "programs", type: "json" },
        { name: "active", type: "bool" },
      ],
    },
    {
      name: "programs",
      type: "base",
      ...tutorRules,
      fields: [
        { name: "tutorId", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "subject", type: "text" },
        { name: "colorOklch", type: "json" },
        { name: "colorVersion", type: "number" },
        { name: "colorHue", type: "number" },
        { name: "sections", type: "json" },
        { name: "topics", type: "json" },
      ],
    },
    {
      name: "lessons",
      type: "base",
      ...tutorRules,
      fields: [
        { name: "tutorId", type: "text", required: true },
        { name: "date", type: "text" },
        { name: "startTime", type: "text" },
        { name: "endTime", type: "text" },
        { name: "type", type: "text" },
        { name: "studentId", type: "text" },
        { name: "groupId", type: "text" },
        { name: "displayName", type: "text" },
        { name: "subjectName", type: "text" },
        { name: "status", type: "text" },
        { name: "seriesId", type: "text" },
        { name: "repeatUntil", type: "text" },
        { name: "price", type: "number" },
        { name: "paymentAmount", type: "number" },
        { name: "homework", type: "json" },
        { name: "hwDoneBy", type: "json" },
        { name: "reschedules", type: "json" },
        { name: "studentPayments", type: "json" },
        { name: "groupStudentIds", type: "json" },
        { name: "isRecurring", type: "bool" },
      ],
    },
    {
      name: "payments",
      type: "base",
      ...tutorRules,
      fields: [
        { name: "tutorId", type: "text", required: true },
        { name: "studentId", type: "text" },
        { name: "studentName", type: "text" },
        { name: "amount", type: "number" },
        { name: "currency", type: "text" },
        { name: "paidAt", type: "text" },
        { name: "comment", type: "text" },
      ],
    },
    {
      name: "user_config",
      type: "base",
      ...configRules,
      fields: [
        { name: "userId", type: "text", required: true },
        { name: "theme", type: "text" },
        { name: "timezone", type: "text" },
        { name: "currency", type: "text" },
        { name: "scheduleColorBy", type: "text" },
        { name: "workingDays", type: "json" },
        { name: "dashboardMetrics", type: "json" },
        { name: "requisites", type: "editor" },
      ],
    },
    {
      name: "community_news",
      type: "base",
      ...newsRules,
      fields: [
        { name: "text", type: "editor" },
        { name: "channelName", type: "text" },
        { name: "postUrl", type: "url" },
        { name: "imageData", type: "text" },
        { name: "isVideo", type: "bool" },
        { name: "messageId", type: "number" },
      ],
    },
  ];

  // ── 4. Create Collections ──

  console.log("📦 Creating collections...\n");

  for (const col of collections) {
    const res = await request("POST", "/api/collections", col, token);
    if (res.ok) {
      console.log(`   ✅ ${col.name} — created (${col.fields.length} fields)`);
    } else if (
      res.status === 400 &&
      JSON.stringify(res.data).includes("already exists")
    ) {
      console.log(`   ⚠️  ${col.name} — already exists, skipping`);
    } else {
      console.log(
        `   ❌ ${col.name} — error (${res.status}): ${JSON.stringify(res.data)}`
      );
    }
  }

  // ── 5. Update `users` Auth Collection ──

  console.log("\n👤 Updating 'users' auth collection rules...");

  // First, get the existing users collection
  const usersGet = await request("GET", "/api/collections/users", null, token);
  if (!usersGet.ok) {
    console.error("   ❌ Could not fetch users collection:", usersGet.data);
  } else {
    const usersCol = usersGet.data;
    const usersId = usersCol.id;

    // Check if 'name' field already exists
    const existingFields = usersCol.fields || [];
    const hasName = existingFields.some((f) => f.name === "name");

    const fieldsToAdd = [];
    if (!hasName) {
      fieldsToAdd.push({ name: "name", type: "text" });
    }

    const updatePayload = {
      listRule: 'id = @request.auth.id',
      viewRule: 'id = @request.auth.id',
      createRule: '',
      updateRule: 'id = @request.auth.id',
      deleteRule: 'id = @request.auth.id',
    };

    if (fieldsToAdd.length > 0) {
      updatePayload.fields = [...existingFields, ...fieldsToAdd];
    }

    const updateRes = await request(
      "PATCH",
      `/api/collections/${usersId}`,
      updatePayload,
      token
    );

    if (updateRes.ok) {
      console.log("   ✅ users — API rules set, custom fields added");
    } else {
      console.log(
        `   ❌ users — error: ${JSON.stringify(updateRes.data)}`
      );
    }
  }

  // ── 6. Final verification ──

  console.log("\n📋 Verifying all collections...\n");
  const listRes = await request("GET", "/api/collections", null, token);

  if (listRes.ok) {
    const items = listRes.data?.items || listRes.data || [];
    const names = Array.isArray(items) ? items.map((c) => c.name) : [];
    const expected = [
      "users",
      "students",
      "groups",
      "programs",
      "lessons",
      "payments",
      "user_config",
      "community_news",
    ];
    for (const name of expected) {
      const found = names.includes(name);
      console.log(`   ${found ? "✅" : "❌"} ${name}`);
    }
  }

  console.log("\n🎉 Setup complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
