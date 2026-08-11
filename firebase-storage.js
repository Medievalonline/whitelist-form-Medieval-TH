// firebase-storage.js
// ====================================================================
// ตัวเชื่อมฐานข้อมูล Firebase Firestore ให้ใช้งานผ่านหน้าตา API เดิม
// (window.storage.get / .set / .delete / .list) ที่ทั้ง 3 หน้าเรียกใช้อยู่แล้ว
// เพื่อไม่ต้องแก้ logic เดิมในแต่ละหน้าเลย แค่เปลี่ยนที่เก็บข้อมูลจริงด้านหลัง
// จาก storage ชั่วคราวมาเป็น Firestore ที่ใช้งานได้จริงบนเว็บที่ deploy แล้ว
//
// ทุกหน้า (whitelist-form.html, status.html, admin.html) โหลดไฟล์นี้ร่วมกัน
// จึงอ่าน/เขียนข้อมูลชุดเดียวกันใน collection "applications" ของ Firestore
//
// ไม่ต้องแก้ไฟล์นี้ — ไปตั้งค่าที่ firebase-config.js แทน
// ====================================================================

window.storage = (function () {
  const COLLECTION = "applications";
  const SDK_VERSION = "10.13.2";
  let readyPromise = null;

  function init() {
    if (!readyPromise) {
      readyPromise = (async () => {
        if (!window.FIREBASE_CONFIG) {
          throw new Error(
            "ไม่พบ FIREBASE_CONFIG — ตรวจสอบว่าโหลด firebase-config.js ก่อน firebase-storage.js"
          );
        }
        const appMod = await import(
          `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`
        );
        const fsMod = await import(
          `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`
        );
        const app = appMod.initializeApp(window.FIREBASE_CONFIG);
        const db = fsMod.getFirestore(app);
        return { db, fs: fsMod };
      })();
    }
    return readyPromise;
  }

  // key เดิมมีรูปแบบ 'application:<discordId>' — ใช้ discordId เป็น document id ใน Firestore
  function docIdFromKey(key) {
    return key.indexOf("application:") === 0
      ? key.slice("application:".length)
      : key;
  }

  async function get(key /* , shared */) {
    const { db, fs } = await init();
    const ref = fs.doc(db, COLLECTION, docIdFromKey(key));
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) return null;
    return { key, value: JSON.stringify(snap.data()), shared: true };
  }

  async function set(key, value /* , shared */) {
    const { db, fs } = await init();
    const ref = fs.doc(db, COLLECTION, docIdFromKey(key));
    const data = JSON.parse(value);
    await fs.setDoc(ref, data);
    return { key, value, shared: true };
  }

  async function del(key /* , shared */) {
    const { db, fs } = await init();
    const ref = fs.doc(db, COLLECTION, docIdFromKey(key));
    await fs.deleteDoc(ref);
    return { key, deleted: true, shared: true };
  }

  async function list(prefix /* , shared */) {
    const { db, fs } = await init();
    const snap = await fs.getDocs(fs.collection(db, COLLECTION));
    const keys = [];
    snap.forEach((d) => keys.push("application:" + d.id));
    return { keys, prefix, shared: true };
  }

  return { get, set, delete: del, list };
})();
