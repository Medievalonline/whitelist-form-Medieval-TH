// scripts/sync-discord-roles.js
// ====================================================================
// สคริปต์นี้รันโดย GitHub Actions ตามตารางเวลา (ดู .github/workflows/
// sync-discord-roles.yml) แทนที่การใช้ Cloud Functions (ที่ต้องผูกบัตร
// อัปเกรดแผน Blaze) — ทำงานแบบเดียวกัน แค่เป็น "เช็คเป็นรอบๆ" แทน
// "ทริกเกอร์ทันที"
//
// ทำงานดังนี้:
// 1. ต่อ Firestore ด้วย Firebase Admin SDK (ใช้ Service Account เท่านั้น
//    ไม่ใช่ Cloud Functions จึงไม่ต้องมีแผน Blaze)
// 2. ดึงใบสมัครทั้งหมดที่ status == "approved" และยังไม่เคย sync
// 3. เรียก Discord API แอดยศให้แต่ละคน
// 4. เขียนผลกลับ Firestore (discordRoleSynced / discordRoleError)
//    เพื่อกันไม่ให้แอดซ้ำในรอบถัดไป
// ====================================================================

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ---------------------------------------------------------------------
// TODO: แก้ 2 ค่านี้ให้ตรงกับเซิร์ฟเวอร์ Discord ของคุณ (วิธีหาอยู่ใน README)
// ---------------------------------------------------------------------
const GUILD_ID = "1398750722501378158";
const APPROVED_ROLE_ID = "1525260047779627109";

const DISCORD_API = "https://discord.com/api/v10";
const COLLECTION = "applications";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "ไม่พบ env FIREBASE_SERVICE_ACCOUNT_JSON — ตรวจสอบ GitHub Secret"
    );
  }
  return JSON.parse(raw);
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
  } catch (_) {
    /* เพิกเฉย */
  }
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
  if (
    GUILD_ID.startsWith("ใส่_") ||
    APPROVED_ROLE_ID.startsWith("ใส่_")
  ) {
    throw new Error(
      "ยังไม่ได้ใส่ GUILD_ID / APPROVED_ROLE_ID ในไฟล์ scripts/sync-discord-roles.js"
    );
  }

  initializeApp({ credential: cert(loadServiceAccount()) });
  const db = getFirestore();

  const snap = await db
    .collection(COLLECTION)
    .where("status", "==", "approved")
    .get();

  if (snap.empty) {
    console.log("ไม่มีใบสมัครที่ approved อยู่ในตอนนี้");
    return;
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const discordId = doc.id;

    if (data.discordRoleSynced === true) {
      skipped++;
      continue;
    }

    console.log(`กำลังแอดยศให้ ${discordId} ...`);
    const result = await addDiscordRole(discordId, botToken);

    if (result.ok) {
      await doc.ref.update({
        discordRoleSynced: true,
        discordRoleSyncedAt: new Date().toISOString(),
        discordRoleError: null,
      });
      console.log(`  ✔ สำเร็จ: ${discordId}`);
      synced++;
    } else {
      const reason = explainError(result.status);
      await doc.ref.update({
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
    process.exitCode = 1; // ทำให้ GitHub Actions ขึ้นสถานะแดง เตือนให้ทีมงานเข้ามาดู
  }
}

main().catch((err) => {
  console.error("สคริปต์ทำงานล้มเหลว:", err);
  process.exitCode = 1;
});
