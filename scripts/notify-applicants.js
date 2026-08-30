// scripts/notify-applicants.js
// ====================================================================
// อ่านข้อมูลจาก /tmp/applications.json (ที่ fetch-data.js ดึงไว้แล้ว)
// แทนการดึง Firestore ใหม่ — ประหยัด Firestore reads
// ====================================================================

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

const REGULAR_FORM_URL =
  process.env.REGULAR_FORM_URL ||
  "https://bikiniz-fivem.github.io/whitelist-form-Medieval-TH/whitelist-form.html";
const STREAMER_FORM_URL =
  process.env.STREAMER_FORM_URL ||
  "https://bikiniz-fivem.github.io/whitelist-form-Medieval-TH/streamer-form.html";

function formUrlForRecord(record) {
  return record.type === "streamer" ? STREAMER_FORM_URL : REGULAR_FORM_URL;
}

const DISCORD_API = "https://discord.com/api/v10";
const LOCAL_DATA_PATH = "/tmp/applications.json";

const STATUS_MESSAGES = {
  approved: {
    title: "✅ ใบสมัคร Whitelist ของคุณผ่านการพิจารณาแล้ว ยินดีต้อนรับสู่ Erde และพบกันภายในเซิร์ฟเวอร์ครับ ⚔️!",
    body: "เราหวังเป็นอย่างยิ่งว่าจะได้พบคุณภายในโลกของ Erde และหวังว่าคุณจะร่วมสร้างเรื่องราวการ Roleplay และประสบการณ์ดี ๆ ไปกับผู้เล่นคนอื่น ๆ ภายในเซิร์ฟเวอร์ของเราขอให้คุณรักษาบรรยากาศของ Roleplay เคารพผู้เล่นรอบข้าง และร่วมกันเป็นส่วนหนึ่งในการสร้างสังคมที่มีคุณภาพให้กับเซิร์ฟเวอร์ของเรา",
  },
  approved_waiting: {
    title: "✅ ใบสมัคร Whitelist ของคุณผ่านการพิจารณาแล้ว",
    body: "ใบสมัครของคุณผ่านการตรวจสอบแล้ว ตอนนี้อยู่ระหว่างรอเซิร์ฟเวอร์เปิด",
  },
  rejected: {
    title: "❌ ใบสมัคร Whitelist ของคุณไม่ผ่านการพิจารณา",
    body: "ใบสมัครของคุณไม่ผ่านการตรวจสอบในรอบนี้ ดูเหตุผลเพิ่มเติมได้ตามลิงก์ด้านล่าง",
  },
  needs_revision: {
    title: "✏️ ใบสมัคร Whitelist ของคุณต้องแก้ไขก่อน",
    body: "ทีมงานตรวจพบว่าใบสมัครของคุณต้องแก้ไขบางส่วนก่อนพิจารณาต่อ",
  },
};

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

function buildMessageContent(record) {
  const info = STATUS_MESSAGES[record.status];
  if (!info) return null;

  const lines = [info.title, "", info.body];

  if (record.adminComment && record.adminComment.trim()) {
    lines.push("", "💬 ความเห็นจากทีมงาน:", record.adminComment.trim());
  }

  const formUrl = formUrlForRecord(record);
  lines.push(
    "",
    "🔗 เข้าสู่ระบบด้วย Discord บัญชีเดิมที่ลิงก์นี้ เพื่อดูสถานะล่าสุดและความเห็นทีมงานได้ด้วยตัวเอง:",
    formUrl
  );

  if (record.status === "needs_revision") {
    lines.push(
      "",
      "หน้าเดิมจะดึงคำตอบที่คุณเคยกรอกไว้มาให้แก้ไขต่อได้ทันที เมื่อแก้ตามความเห็นทีมงานแล้วกดส่งใบสมัครใหม่ได้เลยครับ"
    );
  }

  return lines.join("\n");
}

async function openDmChannel(discordId, botToken) {
  const res = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: discordId }),
  });

  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch (_) {}
    return { ok: false, status: res.status, detail };
  }

  const data = await res.json();
  return { ok: true, channelId: data.id };
}

async function sendDm(channelId, content, botToken) {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (res.status === 200) return { ok: true };

  let detail = "";
  try { detail = await res.text(); } catch (_) {}
  return { ok: false, status: res.status, detail };
}

function explainError(status) {
  if (status === 403)
    return "ผู้สมัครปิดรับ DM จากสมาชิกเซิร์ฟเวอร์ หรือบอทกับผู้สมัครไม่ได้อยู่เซิร์ฟเวอร์เดียวกัน";
  if (status === 404) return "ไม่พบผู้ใช้ Discord นี้ (Discord ID อาจไม่ถูกต้อง)";
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

  let notified = 0;
  let skipped = 0;
  let failed = 0;

  for (const [discordId, data] of Object.entries(allData)) {
    if (!data.status || data.status === "pending") continue;
    if (!data.reviewedAt) continue;
    if (data.notifiedReviewedAt === data.reviewedAt) {
      skipped++;
      continue;
    }

    const content = buildMessageContent(data);
    if (!content) continue;

    console.log(`กำลังแจ้งเตือนสถานะ "${data.status}" ให้ ${discordId} ...`);

    const dm = await openDmChannel(discordId, botToken);
    if (!dm.ok) {
      const reason = explainError(dm.status);
      await db.collection("applications").doc(discordId).update({
        notifyError: `${reason} (HTTP ${dm.status})`,
        notifyErrorAt: new Date().toISOString(),
      });
      console.error(`  ✘ เปิด DM ไม่สำเร็จ: ${discordId} — ${reason} (HTTP ${dm.status})`);
      failed++;
      continue;
    }

    const sent = await sendDm(dm.channelId, content, botToken);
    if (sent.ok) {
      await db.collection("applications").doc(discordId).update({
        notifiedReviewedAt: data.reviewedAt,
        notifiedStatus: data.status,
        notifiedAt: new Date().toISOString(),
        notifyError: null,
      });
      console.log(`  ✔ แจ้งเตือนสำเร็จ: ${discordId}`);
      notified++;
    } else {
      const reason = explainError(sent.status);
      await db.collection("applications").doc(discordId).update({
        notifyError: `${reason} (HTTP ${sent.status})`,
        notifyErrorAt: new Date().toISOString(),
      });
      console.error(`  ✘ ส่ง DM ไม่สำเร็จ: ${discordId} — ${reason} (HTTP ${sent.status})`);
      failed++;
    }
  }

  console.log(
    `สรุป: แจ้งเตือนสำเร็จ ${notified} คน, ข้าม (แจ้งไปแล้ว) ${skipped} คน, ล้มเหลว ${failed} คน`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("สคริปต์ทำงานล้มเหลว:", err);
  process.exitCode = 1;
});
