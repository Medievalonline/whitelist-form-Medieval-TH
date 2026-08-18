// scripts/notify-applicants.js
// ====================================================================
// สคริปต์นี้รันโดย GitHub Actions ตามตารางเวลาเดียวกับ sync-discord-roles.js
// (ดู .github/workflows/sync-discord-roles.yml) — ทำหน้าที่ "ทัก DM ส่วนตัว"
// ไปหาผู้สมัครทุกครั้งที่ทีมงานตรวจใบสมัครเสร็จ (กด "บันทึกผลการตรวจสอบ"
// ใน admin.html) ไม่ว่าผลจะเป็น ผ่าน / ผ่านแล้วรอเซิฟเปิด / ไม่ผ่าน / ต้องแก้ไข
//
// ทำงานดังนี้:
// 1. ต่อ Firestore ด้วย Firebase Admin SDK (ใช้ Service Account เดียวกับ
//    sync-discord-roles.js ไม่ต้องสร้างใหม่)
// 2. ดึงใบสมัครทั้งหมดในคอลเลกชัน "applications"
// 3. เทียบ reviewedAt (เวลาที่ทีมงานตรวจล่าสุด) กับ notifiedReviewedAt
//    (เวลาที่เคยแจ้งเตือนไปแล้วครั้งล่าสุด) — ถ้าไม่ตรงกัน = มีผลตรวจใหม่
//    ที่ยังไม่เคยแจ้ง (ครอบคลุมทั้งกรณีเปลี่ยนสถานะ และกรณีทีมงานแก้ comment
//    ซ้ำในสถานะเดิม เช่น แก้ข้อความ "ต้องแก้ไข" รอบสอง)
// 4. เปิด DM กับผู้สมัคร แล้วส่งข้อความบอกผลตรวจ + ลิงก์กลับไปหน้าสมัครเดิมตามประเภทใบสมัคร
// 5. เขียนผลกลับ Firestore (notifiedReviewedAt / notifyError) กันแจ้งซ้ำ
//
// สคริปต์นี้ "ไม่ต้องการสิทธิ์ Manage Roles" เหมือน sync-discord-roles.js
// แต่ผู้สมัครต้องเป็นสมาชิกในเซิร์ฟเวอร์ Discord เดียวกับบอทแล้ว (หรือเปิด
// รับ DM จากสมาชิกเซิร์ฟเวอร์) มิฉะนั้น Discord API จะตอบ 403
// ====================================================================

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ---------------------------------------------------------------------
// ลิงก์หน้าแบบฟอร์ม — ใช้สำหรับให้ผู้สมัคร Login ด้วย Discord บัญชีเดิม
// เพื่อดูสถานะ, ดูความเห็นทีมงาน, และแก้ไข/ส่งใบสมัครใหม่ได้ด้วยตัวเอง
// (แยกลิงก์ตามประเภทใบสมัคร record.type: 'streamer' หรือปกติ)
// ---------------------------------------------------------------------
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
const COLLECTION = "applications";

// ต้องตรงกับสถานะที่หน้า admin-chop-hee.html ใช้บันทึก
const STATUS_MESSAGES = {
  approved: {
    title: "✅ ใบสมัคร Whitelist ของคุณผ่านการพิจารณาแล้ว!",
    body: "ยินดีด้วยครับ ใบสมัครของคุณผ่านการตรวจสอบเรียบร้อยแล้ว",
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
    try {
      detail = await res.text();
    } catch (_) {
      /* เพิกเฉย */
    }
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
  try {
    detail = await res.text();
  } catch (_) {
    /* เพิกเฉย */
  }
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

  const snap = await db.collection(COLLECTION).get();

  if (snap.empty) {
    console.log("ไม่มีใบสมัครในระบบตอนนี้");
    return;
  }

  let notified = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const discordId = doc.id;

    // ข้ามเอกสารที่ไม่ใช่ใบสมัคร (เช่น answerkey:regular / answerkey:streamer
    // ที่ไม่มีฟิลด์ status) และใบที่ยังไม่ผ่านการตรวจ (pending)
    if (!data.status || data.status === "pending") {
      continue;
    }

    // ยังไม่เคยตรวจจริง (ไม่มี reviewedAt) ข้ามไปก่อน
    if (!data.reviewedAt) {
      continue;
    }

    // เคยแจ้งเตือนผลตรวจรอบนี้ไปแล้ว (reviewedAt ไม่เปลี่ยน) ข้าม
    if (data.notifiedReviewedAt === data.reviewedAt) {
      skipped++;
      continue;
    }

    const content = buildMessageContent(data);
    if (!content) {
      // สถานะที่ไม่รู้จัก (ไม่ควรเกิดขึ้น) ข้ามไปเพื่อความปลอดภัย
      continue;
    }

    console.log(`กำลังแจ้งเตือนสถานะ "${data.status}" ให้ ${discordId} ...`);

    const dm = await openDmChannel(discordId, botToken);
    if (!dm.ok) {
      const reason = explainError(dm.status);
      await doc.ref.update({
        notifyError: `${reason} (HTTP ${dm.status})`,
        notifyErrorAt: new Date().toISOString(),
      });
      console.error(`  ✘ เปิด DM ไม่สำเร็จ: ${discordId} — ${reason} (HTTP ${dm.status}) ${dm.detail}`);
      failed++;
      continue;
    }

    const sent = await sendDm(dm.channelId, content, botToken);
    if (sent.ok) {
      await doc.ref.update({
        notifiedReviewedAt: data.reviewedAt,
        notifiedStatus: data.status,
        notifiedAt: new Date().toISOString(),
        notifyError: null,
      });
      console.log(`  ✔ แจ้งเตือนสำเร็จ: ${discordId}`);
      notified++;
    } else {
      const reason = explainError(sent.status);
      await doc.ref.update({
        notifyError: `${reason} (HTTP ${sent.status})`,
        notifyErrorAt: new Date().toISOString(),
      });
      console.error(`  ✘ ส่ง DM ไม่สำเร็จ: ${discordId} — ${reason} (HTTP ${sent.status}) ${sent.detail}`);
      failed++;
    }
  }

  console.log(
    `สรุป: แจ้งเตือนสำเร็จ ${notified} คน, ข้าม (แจ้งไปแล้ว) ${skipped} คน, ล้มเหลว ${failed} คน`
  );

  if (failed > 0) {
    process.exitCode = 1; // ทำให้ GitHub Actions ขึ้นสถานะแดง เตือนให้ทีมงานเข้ามาดู
  }
}

main().catch((err) => {
  console.error("สคริปต์ทำงานล้มเหลว:", err);
  process.exitCode = 1;
});
