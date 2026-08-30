// scripts/sync-discord-roles.js
// ====================================================================
// อ่านข้อมูลจาก /tmp/applications.json (ที่ fetch-data.js ดึงไว้แล้ว)
// แทนการดึง Firestore ใหม่ — ประหยัด Firestore reads
// ====================================================================

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

const GUILD_ID = "1398750722501378158";
const APPROVED_ROLE_ID = "1525260047779627109";

const DISCORD_API = "https://discord.com/api/v10";
const LOCAL_DATA_PATH = "/tmp/applications.json";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "ไม่พบ env FIREBASE_SERVICE_ACCOUNT_JSON — ตรวจสอบ GitHub Secret"
    );
  }
  return JSON.parse(raw);
}

// อ่านจาก cache ที่ fetch-data.js บันทึกไว้
function loadLocalData() {
  if (!fs.existsSync(LOCAL_DATA_PATH)) {
    throw new Error(
      `ไม่พบไฟล์ ${LOCAL_DATA_PATH} — ต้องรัน fetch-data.js ก่อน`
    );
  }
  return JSON.parse(fs.readFileSync(LOCAL_DATA_PATH, "utf8"));
}

async function addDiscordRole(discordId, botToken) {
  const url = `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordId}/roles/${APPROVED_ROLE_ID}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (res.status === 204) return { ok: true, status: 204 };

  let detail = "";
  try {
    detail = await res.text();
  } catch (_) {}
  return { ok: false, status: res.status, detail };
}

function explainError(status) {
  if (status === 403)
    return "บอทไม่มีสิทธิ์ Manage Roles หรือยศบอทอยู่ต่ำกว่ายศที่จะแอด";
  if (status === 404)
    return "ไม่พบผู้ใช้นี้ในเซิร์ฟเวอร์ (ผู้สมัครอาจยังไม่ได้เข้าเซิร์ฟเวอร์ Discord)";
  if (status === 401) return "Bot Token ไม่ถูกต้องหรือหมดอายุ";
  return "ไม่ทราบสาเหตุ";
}

async function main() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error("ไม่พบ env DISCORD_BOT_TOKEN — ตรวจสอบ GitHub Secret");
  }

  if (getApps().length === 0) {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }
  const db = getFirestore();

  // อ่านจาก cache แทน Firestore
  const allData = loadLocalData();
  const entries = Object.entries(allData).filter(
    ([, data]) => data.status === "approved" && data.roleSyncPending === true
  );

  if (entries.length === 0) {
    console.log("ไม่มีใบสมัครที่รอเพิ่มยศ Discord อยู่ในตอนนี้");
    return;
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const [discordId, data] of entries) {
    if (data.discordRoleSynced === true) {
      skipped++;
      continue;
    }

    console.log(`กำลังแอดยศให้ ${discordId} ...`);
    const result = await addDiscordRole(discordId, botToken);

    if (result.ok) {
      await db.collection("applications").doc(discordId).update({
        discordRoleSynced: true,
        roleSyncPending: false,
        discordRoleSyncedAt: new Date().toISOString(),
        discordRoleError: null,
      });
      console.log(`  ✔ สำเร็จ: ${discordId}`);
      synced++;
    } else {
      const reason = explainError(result.status);
      await db.collection("applications").doc(discordId).update({
        discordRoleError: `${reason} (HTTP ${result.status})`,
        discordRoleErrorAt: new Date().toISOString(),
      });
      console.error(
        `  ✘ ล้มเหลว: ${discordId} — ${reason} (HTTP ${result.status}) ${result.detail}`
      );
      failed++;
    }
  }

  console.log(
    `สรุป: แอดสำเร็จ ${synced} คน, ข้าม (แอดไปแล้ว) ${skipped} คน, ล้มเหลว ${failed} คน`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("สคริปต์ทำงานล้มเหลว:", err);
  process.exitCode = 1;
});
