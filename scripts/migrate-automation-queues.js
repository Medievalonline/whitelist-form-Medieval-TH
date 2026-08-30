// scripts/migrate-automation-queues.js
// ใช้ครั้งเดียวหลังอัปเดตระบบ เพื่อเติม queue flags ให้เอกสารเดิม

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("ไม่พบ env FIREBASE_SERVICE_ACCOUNT_JSON");
  return JSON.parse(raw);
}

async function main() {
  if (getApps().length === 0) {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }

  const db = getFirestore();
  const snapshot = await db.collection("applications").get();
  let batch = db.batch();
  let writesInBatch = 0;
  let updated = 0;

  async function commitBatch() {
    if (writesInBatch === 0) return;
    await batch.commit();
    batch = db.batch();
    writesInBatch = 0;
  }

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const patch = {};

    if (!("notificationPending" in data)) {
      patch.notificationPending = Boolean(data.reviewedAt && data.status && data.status !== "pending");
    }
    if (!("roleSyncPending" in data)) {
      patch.roleSyncPending = data.status === "approved" && data.discordRoleSynced !== true;
    }

    if (Object.keys(patch).length === 0) continue;
    batch.update(doc.ref, patch);
    writesInBatch++;
    updated++;

    if (writesInBatch === 500) await commitBatch();
  }

  await commitBatch();
  console.log(`ตรวจสอบ ${snapshot.size} ใบสมัคร และอัปเดต queue flags ${updated} รายการ`);
}

main().catch((error) => {
  console.error("migration ล้มเหลว:", error);
  process.exitCode = 1;
});
