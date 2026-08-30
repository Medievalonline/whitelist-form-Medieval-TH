// scripts/fetch-data.js
// ====================================================================
// ดึงเฉพาะเอกสารที่มีงานอัตโนมัติค้างอยู่ แล้วแชร์ข้อมูลให้ sync/notify
// ไม่อ่านใบสมัครทั้ง collection และไม่อ่านใบสมัคร pending ที่ไม่มีงานต่อ
// ====================================================================

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

const COLLECTION = "applications";
const OUTPUT_PATH = "/tmp/applications.json";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "ไม่พบ env FIREBASE_SERVICE_ACCOUNT_JSON — ตรวจสอบ GitHub Secret"
    );
  }
  return JSON.parse(raw);
}

async function main() {
  if (getApps().length === 0) {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }
  const db = getFirestore();
  const collection = db.collection(COLLECTION);

  console.log("กำลังดึงเฉพาะงานอัตโนมัติที่ค้างอยู่จาก Firestore...");
  const [roleQueue, notificationQueue] = await Promise.all([
    collection.where("roleSyncPending", "==", true).get(),
    collection.where("notificationPending", "==", true).get(),
  ]);

  const result = {};
  for (const snapshot of [roleQueue, notificationQueue]) {
    for (const doc of snapshot.docs) {
      result[doc.id] = doc.data();
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf8");
  console.log(
    `พบเอกสารที่ต้องดำเนินการ ${Object.keys(result).length} รายการ ` +
      `(role queue ${roleQueue.size}, notification queue ${notificationQueue.size})`
  );
}

main().catch((err) => {
  console.error("fetch-data ล้มเหลว:", err);
  process.exitCode = 1;
});
