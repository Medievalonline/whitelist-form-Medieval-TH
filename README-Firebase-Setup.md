# เชื่อมต่อระบบ Whitelist กับ Firebase — คู่มือติดตั้ง

ไฟล์ที่แก้ไข/เพิ่มเข้ามา:

- `firebase-config.js` **← ไฟล์เดียวที่ต้องแก้ไข** ใส่ config โปรเจกต์ Firebase ของคุณ
- `firebase-storage.js` — ตัวเชื่อมฐานข้อมูล (ไม่ต้องแก้ไข)
- `whitelist-form.html`, `status.html`, `admin.html` — เพิ่ม 2 บรรทัด `<script src="...">`
  ต่อจากเดิม ส่วน logic เดิมทั้งหมด (Discord OAuth, คำถามฟอร์ม, การอนุมัติ ฯลฯ) **ไม่ถูกแก้ไข**

ก่อนหน้านี้ทั้ง 3 หน้าใช้ `window.storage` ซึ่งเป็นระบบเก็บข้อมูลชั่วคราวที่ทำงานได้เฉพาะตอนรันในสภาพแวดล้อมของ Claude เท่านั้น (ไม่ทำงานจริงเมื่อ deploy ขึ้น GitHub Pages) — ตอนนี้เปลี่ยนให้ `window.storage` ตัวเดียวกันไปเรียก Firebase Firestore จริงแทน ทั้ง 3 หน้าจึงอ่าน/เขียนข้อมูลชุดเดียวกันได้จริงบนเว็บที่ deploy แล้ว

## ขั้นตอนตั้งค่า Firebase

1. ไปที่ https://console.firebase.google.com/ → สร้างโปรเจกต์ใหม่ (ใช้แผนฟรี Spark ได้)
2. เมนูซ้าย → **Build → Firestore Database → Create database**
   - เลือก **Start in production mode**
   - เลือก Location ที่ใกล้ผู้เล่น เช่น `asia-southeast1`
3. ไปที่ **Project settings** (ไอคอนเฟือง) → เลื่อนลง **Your apps** → กด **`</>`** (Add web app)
   - ตั้งชื่อแอปอะไรก็ได้ → **Register app**
   - Firebase จะแสดัง config object (`apiKey`, `authDomain`, `projectId` ฯลฯ)
4. คัดลอกค่าไปแปะแทนที่ `YOUR_...` ใน `firebase-config.js`
5. ไปที่ **Firestore Database → Rules** แล้ววางกฎด้านล่าง แทนที่กฎ default → **Publish**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /applications/{discordId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

6. อัปโหลดไฟล์ทั้งหมด (5 ไฟล์: 3 หน้า HTML + `firebase-config.js` + `firebase-storage.js`)
   ไปที่ repo GitHub Pages เดิม (`whitelist-form-Medieval-TH`) แทนไฟล์เก่า แล้ว push

เท่านี้ทั้ง 3 หน้าก็เชื่อมกันผ่านฐานข้อมูลจริงแล้ว: สมัครที่ `whitelist-form.html` → เช็คสถานะที่ `status.html` → ทีมงานตรวจ/อนุมัติที่ `admin.html` → ผู้สมัครเห็นผลอัปเดตทันทีที่หน้า status

## ⚠️ หมายเหตุเรื่องความปลอดภัย (สำคัญ อ่านก่อนใช้งานจริง)

กฎ Firestore ด้านบน (`allow read/write: if true`) เปิดให้ **ใครก็เขียนข้อมูลใน Firestore ได้โดยตรง** ผ่าน browser console แม้ไม่ได้ล็อกอิน Discord จริง — ระดับความเสี่ยงเท่ากับระบบเดิมที่ใช้ `window.storage` (ซึ่งก็ไม่มีการตรวจสอบสิทธิ์ฝั่งเซิร์ฟเวอร์เช่นกัน) เพราะระบบนี้เป็น static site ล้วนๆ ไม่มี backend คอยตรวจสอบ token กับ Discord จริง

ความเสี่ยงที่ยังคงอยู่ (ไม่ต่างจากเดิม):
- ผู้ใช้ที่เปิด DevTools สามารถปลอมตัวเป็น Discord ID อื่น หรือแก้ `status` เป็น `approved` เองได้โดยตรงผ่าน Firestore
- รายชื่อ `STAFF_DISCORD_IDS` ใน `admin.html` เป็นแค่การกรอง UI ฝั่ง browser ไม่ใช่การตรวจสอบสิทธิ์จริง

ถ้าต้องการความปลอดภัยที่แน่นขึ้นในอนาคต แนวทางคือเพิ่ม **Cloud Functions** เป็น backend เล็กๆ คอยตรวจสอบ Discord access token กับ Discord API จริง แล้วออก Firebase Custom Auth Token ให้ frontend ใช้ล็อกอินเข้า Firebase Auth จากนั้นเขียน Firestore Rules ให้อิง `request.auth.uid` แทนการเปิดกว้างแบบนี้ — ถ้าสนใจให้ผมช่วยต่อยอดส่วนนี้บอกได้เลยครับ
