// scripts/fetch-data.js
// ====================================================================
// ดึงข้อมูลจาก Firestore ครั้งเดียว แล้วบันทึกเป็น /tmp/applications.json
// เพื่อให้ sync-discord-roles.js และ notify-applicants.js
// อ่านจากไฟล์แทน ลด Firestore reads จาก 2 → 1 ครั้งต่อการรัน
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

  console.log("กำลังดึงข้อมูลจาก Firestore...");
  const snap = await db.collection(COLLECTION).get();

  // แปลง snapshot เป็น object { [discordId]: data }
  const result = {};
  for (const doc of snap.docs) {
    result[doc.id] = doc.data();
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf8");
  console.log(
    `บันทึกข้อมูล ${snap.size} รายการไปที่ ${OUTPUT_PATH} เรียบร้อยแล้ว`
  );
}

main().catch((err) => {
  console.error("fetch-data ล้มเหลว:", err);
  process.exitCode = 1;
});
