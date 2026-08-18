// scripts/sync-google-sheets-apps-script.js
// ====================================================================
// อ่านใบสมัครจาก Firebase Firestore แล้วส่งชุดข้อมูลไปยัง Google Apps Script
// Web App เพื่อบันทึกลง Google Sheets โดยไม่ใช้ Google Sheets API โดยตรง
//
// ใช้ Firebase Service Account เดิมของระบบ
// ต้องตั้งค่า:
// - APPS_SCRIPT_WEB_APP_URL เป็น Repository Variable
// - APPS_SCRIPT_WEBHOOK_TOKEN เป็น GitHub Secret ใหม่สำหรับยืนยันคำขอ
// ====================================================================

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const COLLECTION = "applications";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "ไม่พบ env FIREBASE_SERVICE_ACCOUNT_JSON — ใช้ Secret เดิมของระบบได้เลย"
    );
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON ไม่ใช่ JSON ที่ถูกต้อง: ${error.message}`);
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`ไม่พบ env ${name} — ตรวจสอบ GitHub Variables/Secrets`);
  }
  return value.trim();
}

function cleanForJson(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "object") {
    try {
      JSON.stringify(value);
      return value;
    } catch (_) {
      return String(value);
    }
  }
  return value;
}

function normalizeRecord(doc) {
  const data = doc.data();
  return {
    discordId: doc.id,
    discordUsername: cleanForJson(data.discordUsername || ""),
    type: data.type === "streamer" ? "streamer" : "regular",
    status: cleanForJson(data.status || "pending"),
    adminComment: cleanForJson(data.adminComment || ""),
    reviewedBy: cleanForJson(data.reviewedBy || ""),
    submittedAt: cleanForJson(data.submittedAt || ""),
    reviewedAt: cleanForJson(data.reviewedAt || ""),
    resubmittedAt: cleanForJson(data.resubmittedAt || ""),
    steamId: cleanForJson(data.steamId || ""),
    socialMedia: cleanForJson(data.socialMedia || ""),
    streamLink: cleanForJson(data.streamLink || ""),
    answers: cleanForJson(data.answers || {}),
  };
}

async function main() {
  const webAppUrl = requiredEnv("APPS_SCRIPT_WEB_APP_URL");
  const webhookToken = requiredEnv("APPS_SCRIPT_WEBHOOK_TOKEN");
  const serviceAccount = loadServiceAccount();

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  const db = getFirestore();
  const snapshot = await db.collection(COLLECTION).get();
  const records = snapshot.docs
    .filter((doc) => doc.data() && doc.data().status)
    .map(normalizeRecord);

  const response = await fetch(webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: webhookToken,
      records,
      sentAt: new Date().toISOString(),
    }),
  });

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (_) {
    result = { ok: false, error: responseText.slice(0, 500) };
  }

  if (!response.ok || result.ok !== true) {
    throw new Error(
      `Apps Script ตอบกลับไม่สำเร็จ HTTP ${response.status}: ${result.error || responseText.slice(0, 500)}`
    );
  }

  console.log(
    `ส่งข้อมูลไป Google Sheets สำเร็จ: ${records.length} ใบสมัคร, อัปเดต ${result.updated || 0} แถว, เพิ่มใหม่ ${result.appended || 0} แถว`
  );
}

main().catch((error) => {
  console.error("สคริปต์ส่งข้อมูลไป Google Apps Script ล้มเหลว:", error);
  process.exitCode = 1;
});
