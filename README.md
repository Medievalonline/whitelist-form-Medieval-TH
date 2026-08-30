# Medieval Online TH — Whitelist Form

ระบบสมัคร **Whitelist สำหรับ Medieval Online TH** พร้อมระบบจัดเก็บข้อมูลผ่าน **Firebase Firestore** และระบบจัดการใบสมัครสำหรับทีมงาน

ระบบประกอบด้วย:

- 📝 Whitelist Application
- 📊 ตรวจสอบและแก้ไขใบสมัครผ่านหน้าสมัครเดิม
- 🛡️ Admin Panel สำหรับทีมงาน
- 🔥 Firebase Firestore Database
- 🎮 Discord ID Integration
- 🤖 ระบบเพิ่มยศ Discord อัตโนมัติหลังอนุมัติ
- ⚙️ GitHub Actions สำหรับ Sync ยศ Discord
- 📡 ผู้สมัครตรวจผลและแก้ไขใบสมัครผ่านหน้าสมัครเดิม
- 📩 ระบบส่ง DM แจ้งผลตรวจผ่าน Discord พร้อมลิงก์ฟอร์มเดิมแยกทั่วไป/สตรีมเมอร์
- ⚡ GitHub Actions อ่านเฉพาะใบสมัครที่มีงานต้องดำเนินการ เพื่อลด Firestore reads

รายละเอียดการติดตั้งส่วนแจ้งเตือนดูที่ [README-Discord-Notification.md](README-Discord-Notification.md)

> **สำคัญ:** Repository นี้ไม่ใช่ Static HTML อย่างเดียว หากต้องการให้ระบบสมัคร Whitelist และ Admin ทำงานจริง จำเป็นต้องตั้งค่า Firebase Firestore ก่อน

---

# 🔗 Repository

[Medievalonline/whitelist-form-Medieval-TH](https://github.com/Medievalonline/whitelist-form-Medieval-TH?utm_source=chatgpt.com)

---

# 📁 โครงสร้างไฟล์

Repository มีโครงสร้างหลักประมาณนี้:

```text
whitelist-form-Medieval-TH/
│
├── .github/
│   └── workflows/
│       └── sync-discord-roles.yml
│
├── domains/
│   └── ...
│
├── scripts/
│   └── sync-discord-roles.js
│
├── admin-chop-hee.html
├── whitelist-form.html
├── streamer-form.html
│
├── firebase-config.js
├── firebase-storage.js
├── firestore.rules
│
├── package.json
├── README.md
├── README-Firebase-Setup.md
└── README-Discord-Notification.md
```

Repository ปัจจุบันมีไฟล์หลักตามรายการข้างต้น รวมถึง Workflow สำหรับ Sync Discord Roles/แจ้งผล และ Node.js scripts สำหรับดึงข้อมูลที่จำเป็นและจัดการ Discord โดยไม่มีการซิงก์ Google Sheets

---

# 🧩 ระบบทำงานอย่างไร

ระบบแบ่งออกเป็น 3 ส่วนหลัก:

```text
ผู้สมัคร
   │
   ▼
whitelist-form.html
   │
   │ ส่งใบสมัคร
   ▼
Firebase Firestore
   │
   ▼
admin-chop-hee.html
   │
   │ Staff อนุมัติ
   ▼
GitHub Actions
   │
         └── ส่ง DM แจ้งผล + ลิงก์หน้าสมัครเดิม

   ▼
   │
   ▼
Discord Server
   │
   ▼
เพิ่มยศ Approved
```

เมื่อผู้สมัครส่งใบสมัคร ข้อมูลจะถูกเก็บใน Firestore จากนั้นทีมงานสามารถตรวจสอบและอนุมัติผ่าน `admin-chop-hee.html` ผู้สมัครจะกลับไปยังหน้าสมัครเดิมผ่านลิงก์ใน DM เพื่อดูสถานะ ความเห็น และแก้ไขใบสมัครต่อ

เมื่อใบสมัครมีสถานะ `approved` ระบบ GitHub Actions จะตรวจสอบใบสมัครและสามารถเพิ่มยศ Discord ให้ผู้สมัครได้

---

# 💻 สิ่งที่ต้องเตรียม

## สำหรับเว็บไซต์

จำเป็นต้องมี:

- GitHub Account
- Firebase Account
- GitHub Pages หรือ Web Hosting
- Repository นี้

## สำหรับระบบ Discord Role Sync

จำเป็นต้องมีเพิ่มเติม:

- Discord Server
- Discord Bot
- Bot Token
- Discord Server ID / Guild ID
- Discord Role ID
- Firebase Service Account
- Node.js 20 หรือใหม่กว่า

ไฟล์ `package.json` ของ Repository กำหนด Node.js เป็น `>=20` และใช้ `firebase-admin` สำหรับระบบ Sync Discord Roles

---

# 🚀 ขั้นตอนที่ 1 — ดาวน์โหลด Repository

สามารถ Clone Repository ด้วย Git:

```bash
git clone https://github.com/Medievalonline/whitelist-form-Medieval-TH.git
```

จากนั้น:

```bash
cd whitelist-form-Medieval-TH
```

หรือสามารถดาวน์โหลด ZIP จาก GitHub:

```text
Code
→ Download ZIP
```

---

# 🔥 ขั้นตอนที่ 2 — สร้าง Firebase Project

เข้า Firebase Console:

[Firebase Console](https://console.firebase.google.com/?utm_source=chatgpt.com)

จากนั้น:

```text
Create a project
```

ตั้งชื่อ Project เช่น:

```text
medievalonline-whitelist
```

จากนั้นสร้าง Project ให้เรียบร้อย

---

# 🗄️ ขั้นตอนที่ 3 — เปิด Firestore Database

เข้า:

```text
Firebase Console
→ Build
→ Firestore Database
→ Create database
```

เลือก:

```text
Start in production mode
```

จากนั้นเลือก Location

สำหรับประเทศไทย แนะนำ:

```text
asia-southeast1
```

หรือ Region ที่ใกล้ผู้เล่นของคุณที่สุด

วิธีนี้สอดคล้องกับคู่มือ Firebase ของ Repository ที่แนะนำให้ใช้ Firestore และเลือก Region ใกล้ผู้ใช้งาน เช่น `asia-southeast1`

---

# 🌐 ขั้นตอนที่ 4 — เพิ่ม Web App ใน Firebase

ไปที่:

```text
Firebase Console
→ Project Settings
```

เลื่อนลงไปที่:

```text
Your apps
```

กด:

```text
</>
Add app
```

เลือก Web App

ตั้งชื่อ เช่น:

```text
Medieval Whitelist Website
```

จากนั้นกด:

```text
Register app
```

Firebase จะให้ Configuration ประมาณนี้:

```javascript
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};
```

---

# ⚙️ ขั้นตอนที่ 5 — ตั้งค่า firebase-config.js

เปิด:

```text
firebase-config.js
```

แล้วนำ Configuration จาก Firebase มาใส่ในไฟล์นี้

ตัวอย่าง:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

> อย่านำ Firebase Service Account JSON มาใส่ในไฟล์นี้
>
> `firebase-config.js` เป็น Configuration สำหรับ Frontend ส่วน Service Account ใช้เฉพาะฝั่ง GitHub Actions / Node.js

Repository ระบุให้แก้ `firebase-config.js` เป็นไฟล์หลักสำหรับใส่ Firebase configuration ของ Project ใหม่

---

# 🔐 ขั้นตอนที่ 6 — ตั้งค่า Firestore Rules

เปิด:

```text
Firebase Console
→ Firestore Database
→ Rules
```

จากนั้นเปิดไฟล์ `firestore.rules` ใน Repository ชุดนี้ แล้วคัดลอกเนื้อหาทั้งหมดไปวางแทน Rules เดิม จากนั้นกด:

```text
Publish
```

Rules เวอร์ชันนี้รองรับเอกสารที่ระบบใช้ร่วมกัน ได้แก่ `settings`, `answerkey:regular` และ `answerkey:streamer` หากยังใช้ตัวอย่าง Rules เก่าที่ไม่อนุญาตเอกสารเหล่านี้ ปุ่มเปิด–ปิดรับไวริสและการบันทึกเฉลยจากหน้า admin จะไม่ทำงาน

### ⚠️ คำเตือนด้านความปลอดภัย

โปรเจกต์นี้เป็น Static Site ที่ตรวจสอบทีมงานด้วย Discord OAuth ฝั่ง Browser ดังนั้นการตรวจสอบรายชื่อทีมงานยังไม่ใช่การยืนยันสิทธิ์ระดับ Server อย่างสมบูรณ์ ควรใช้ Rules จากไฟล์ `firestore.rules` ที่มากับโปรเจกต์ และไม่ควรเปิดสิทธิ์ `allow read/write: if true` ให้กับทุกเอกสารโดยไม่เข้าใจความเสี่ยง

เพราะผู้ใช้งานสามารถเปิด Browser DevTools แล้วส่งข้อมูลเข้า Firestore โดยตรงได้ รวมถึงสามารถปลอม Discord ID หรือแก้ข้อมูลบางอย่างได้

Repository เองก็ระบุข้อจำกัดนี้ไว้ชัดเจน และแนะนำว่าในอนาคตควรใช้ Firebase Authentication / Backend เพื่อยืนยันสิทธิ์จริง

---

# 📄 ขั้นตอนที่ 7 — ไฟล์ที่ต้อง Upload

สำหรับระบบ Firebase ขั้นพื้นฐาน ต้องมีไฟล์สำคัญอย่างน้อย:

```text
whitelist-form.html
streamer-form.html
admin-chop-hee.html

firebase-config.js
firebase-storage.js

firestore.rules
```

โดย `firebase-storage.js` ทำหน้าที่เชื่อมระบบ Storage ที่หน้าเว็บเรียกใช้กับ Firestore และหน้า `whitelist-form.html`, `streamer-form.html` และ `admin-chop-hee.html` ใช้ข้อมูลชุดเดียวกัน

---

# 🌐 ขั้นตอนที่ 8 — Deploy ด้วย GitHub Pages

หากต้องการใช้ GitHub Pages:

เข้า Repository:

```text
Settings
→ Pages
```

เลือก:

```text
Source:
Deploy from a branch
```

เลือก:

```text
Branch: main
Folder: / (root)
```

จากนั้น:

```text
Save
```

รอ GitHub Deploy

เว็บไซต์จะมี URL ประมาณ:

```text
https://USERNAME.github.io/whitelist-form-Medieval-TH/
```

หน้า Whitelist:

```text
https://USERNAME.github.io/whitelist-form-Medieval-TH/whitelist-form.html
```

หน้าสมัครสตรีมเมอร์:

```text
https://USERNAME.github.io/whitelist-form-Medieval-TH/streamer-form.html
```

หน้า Admin:

```text
https://USERNAME.github.io/whitelist-form-Medieval-TH/admin-chop-hee.html
```

---

# 📝 หน้า Whitelist

ไฟล์:

```text
whitelist-form.html
```

ใช้สำหรับให้ผู้เล่นกรอกข้อมูลสมัคร Whitelist

ข้อมูลจะถูกส่งไปยัง:

```text
Firebase Firestore
```

---

# 📩 การแจ้งผลผู้สมัครผ่าน Discord

เมื่อทีมงานบันทึกผลตรวจใน `admin-chop-hee.html` ระบบ GitHub Actions จะส่ง DM ไปยัง Discord ของผู้สมัคร โดยเลือก URL กลับไปยังหน้าสมัครเดิมตามประเภทใบสมัคร ผู้สมัครสามารถดูความเห็นและแก้คำตอบเดิมจากหน้านั้นได้โดยตรง

ระบบรองรับสถานะ `pending`, `approved`, `approved_waiting`, `rejected` และ `needs_revision` โดยจะไม่ส่ง DM ซ้ำสำหรับผลตรวจรอบเดิม

---

# 🛡️ หน้า Admin

ไฟล์:

```text
admin-chop-hee.html
```

ใช้สำหรับทีมงานตรวจสอบใบสมัคร

สามารถใช้สำหรับ:

```text
ดูใบสมัคร
ตรวจสอบข้อมูล
อนุมัติ
ไม่อนุมัติ
ตรวจสอบสถานะ
```

> **สำคัญ:** รายชื่อ Staff ที่กำหนดใน `admin-chop-hee.html` เป็นการควบคุมฝั่ง Browser ไม่ใช่ระบบ Authentication ที่ปลอดภัยจริง Repository ระบุข้อจำกัดนี้ไว้เช่นกัน

---

# 🎮 ตั้งค่า Discord Role

ระบบมี Script:

```text
scripts/sync-discord-roles.js
```

สำหรับเพิ่ม Role ให้ Discord User หลังจากใบสมัครได้รับการอนุมัติ

Script จะ:

```text
ค้นหา applications
        ↓
status == approved
        ↓
ตรวจสอบ discordRoleSynced
        ↓
เรียก Discord API
        ↓
เพิ่ม Discord Role
        ↓
บันทึกผลกลับ Firestore
```

ระบบจะข้ามคนที่เคย Sync แล้ว เพื่อป้องกันการเพิ่ม Role ซ้ำ โดยใช้ `roleSyncPending` เป็นคิวและจะ retry อัตโนมัติเมื่อ Discord API ล้มเหลว

ระบบแจ้ง DM ใช้คิว `notificationPending` เช่นเดียวกัน ส่วน workflow จะอ่านเฉพาะเอกสารที่มีคิวค้างอยู่ ไม่อ่านใบสมัครทั้ง collection ทุกชั่วโมง

### ย้ายข้อมูลเดิมเข้าสู่คิวแบบใหม่

หลังอัปเดตโค้ดครั้งแรก ให้รันคำสั่งนี้หนึ่งครั้งจากเครื่องที่มี Service Account และตั้งค่า environment `FIREBASE_SERVICE_ACCOUNT_JSON` แล้ว:

```bash
npm ci
npm run migrate-queues
```

คำสั่งนี้จะอ่านข้อมูลเดิมหนึ่งครั้งและเติม queue flags ให้ใบสมัครที่มีผลตรวจแล้ว หากไม่รัน ใบสมัครเก่าที่ไม่มี flags อาจไม่ถูกนำไปแจ้ง DM หรือเพิ่มยศใน workflow ใหม่

---

# 🤖 ขั้นตอนที่ 9 — สร้าง Discord Bot

สร้าง Bot ใน:

[Discord Developer Portal](https://discord.com/developers/applications?utm_source=chatgpt.com)

สร้าง Application ใหม่

จากนั้น:

```text
Bot
→ Add Bot
```

สร้าง Bot Token

> **ห้ามนำ Bot Token ไปใส่ใน HTML หรือ JavaScript ที่ผู้ใช้งานสามารถเปิดดูได้**

---

# 👑 ขั้นตอนที่ 10 — ตั้งค่า Discord Bot Permission

Bot ต้องสามารถ:

```text
Manage Roles
```

และต้องวาง Role ของ Bot **สูงกว่า Role ที่ต้องการให้ Bot แจก**

ตัวอย่าง:

```text
Owner
Admin
Medieval Bot       ← Bot
Whitelist Approved ← Role ที่ Bot ต้องแจก
Member
```

หาก Bot อยู่ต่ำกว่า Role เป้าหมาย Discord API จะตอบกลับด้วย HTTP 403

Script ใน Repository มีการตรวจสอบกรณี Bot ไม่มีสิทธิ์ Manage Roles หรือ Role ของ Bot ต่ำกว่า Role เป้าหมายไว้แล้ว

---

# 🆔 ขั้นตอนที่ 11 — ตั้งค่า Guild ID และ Role ID

เปิด:

```text
scripts/sync-discord-roles.js
```

ค้นหา:

```javascript
const GUILD_ID = "...";
const APPROVED_ROLE_ID = "...";
```

ใส่ค่าของ Discord Server และ Role ที่ต้องการ

ตัวอย่าง:

```javascript
const GUILD_ID = "123456789012345678";
const APPROVED_ROLE_ID = "987654321098765432";
```

### วิธีเปิด Developer Mode

Discord:

```text
User Settings
→ Advanced
→ Developer Mode
```

เปิดใช้งาน

จากนั้นคลิกขวา Server:

```text
Copy Server ID
```

และคลิกขวา Role:

```text
Copy Role ID
```

---

# 🔑 ขั้นตอนที่ 12 — Firebase Service Account

ระบบ GitHub Actions ไม่ควรใช้ Firebase Web API Key เพื่อเข้าถึง Firestore แบบ Admin

ต้องสร้าง:

```text
Firebase Service Account
```

เข้า:

```text
Firebase Console
→ Project Settings
→ Service Accounts
```

เลือก:

```text
Generate new private key
```

ดาวน์โหลด JSON

ตัวอย่าง:

```text
firebase-service-account.json
```

> **ห้าม Upload JSON นี้เข้า GitHub Repository**

เพราะไฟล์นี้มีสิทธิ์ระดับ Server/Admin

---

# 🔐 ขั้นตอนที่ 13 — ตั้งค่า GitHub Secrets

เข้า Repository:

```text
Settings
→ Secrets and variables
→ Actions
```

กด:

```text
New repository secret
```

เพิ่ม Secret:

```text
DISCORD_BOT_TOKEN
```

ค่า:

```text
YOUR_DISCORD_BOT_TOKEN
```

จากนั้นเพิ่ม:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

และนำ **เนื้อหาทั้งหมดของ Firebase Service Account JSON** มาใส่

ตัวอย่างรูปแบบ:

```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----...",
  "client_email": "...",
  "client_id": "...",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

Script ของ Repository อ่าน Secret ทั้งสองตัวนี้จาก Environment Variable โดยตรง

---

# ⚙️ GitHub Actions

Repository มี Workflow:

```text
.github/workflows/sync-discord-roles.yml
```

สำหรับเรียก:

```text
scripts/sync-discord-roles.js
```

Workflow นี้ทำให้ระบบสามารถตรวจสอบใบสมัครที่ Approved แล้วเพิ่ม Discord Role เป็นระยะ ๆ โดยไม่จำเป็นต้องใช้ Cloud Functions

---

# 📦 ขั้นตอนที่ 14 — ติดตั้ง Node.js

สำหรับการทำงานของ Discord Role Sync ต้องใช้:

```text
Node.js 20+
```

ตรวจสอบ:

```bash
node -v
```

ตัวอย่าง:

```text
v20.x.x
```

จากนั้นติดตั้ง Package:

```bash
npm install
```

Repository ใช้:

```text
firebase-admin
```

สำหรับเชื่อมต่อ Firebase จากฝั่ง Server/Automation

---

# 🧪 ทดสอบ Discord Role Sync

หลังตั้งค่า Secret และ Config ครบแล้ว สามารถทดสอบ Script ได้ด้วย:

```bash
npm install
npm run sync
```

Script จะค้นหาใบสมัคร:

```text
status = approved
```

แล้วตรวจสอบว่า:

```text
discordRoleSynced != true
```

จากนั้นจะพยายามเพิ่ม Role ให้ Discord ID ของผู้สมัคร

---

# ❌ ปัญหา HTTP 403

หากพบ:

```text
HTTP 403
```

ให้ตรวจสอบ:

```text
Bot มี Manage Roles หรือไม่
```

และ:

```text
Bot Role อยู่สูงกว่า Approved Role หรือไม่
```

---

# ❌ ปัญหา HTTP 404

หากพบ:

```text
HTTP 404
```

ระบบอาจไม่พบผู้สมัครใน Discord Server

ให้ตรวจสอบว่า:

```text
ผู้สมัครเข้า Discord Server แล้วหรือยัง
```

Script ของระบบแยก Error 403, 404 และ 401 เอาไว้แล้ว

---

# ❌ ปัญหา HTTP 401

หากพบ:

```text
HTTP 401
```

ตรวจสอบ:

```text
DISCORD_BOT_TOKEN
```

ว่า:

- ถูกต้องหรือไม่
- ถูกลบหรือ Reset หรือไม่
- ใส่ใน GitHub Secret ถูกชื่อหรือไม่

---

# 🔄 ลำดับการทำงานของระบบทั้งหมด

ตัวอย่างการใช้งานจริง:

### 1. ผู้เล่นเข้าหน้า Whitelist

```text
whitelist-form.html
```

### 2. กรอกใบสมัคร

```text
Discord ID
ข้อมูลตัวละคร
คำตอบ Whitelist
ข้อมูลอื่น ๆ
```

### 3. ระบบบันทึกข้อมูล

```text
Firebase Firestore
```

### 4. Staff เปิด Admin

```text
admin-chop-hee.html
```

### 5. Staff ตรวจสอบใบสมัคร

```text
Pending
```

### 6. Staff อนุมัติ

```text
Approved
```

### 7. GitHub Actions ทำงาน

```text
sync-discord-roles.js
```

### 8. ระบบเรียก Discord API

```text
Discord User
      ↓
Add Role
```

### 9. ระบบบันทึกผล

```text
discordRoleSynced = true
```

### 10. ระบบแจ้งผลผู้สมัคร

```text
notify-applicants.js
→ Discord DM
→ ลิงก์หน้าสมัครเดิมตามประเภทใบสมัคร
```

---

# 🔒 ความปลอดภัย

## ⚠️ ห้ามเผยแพร่

ห้ามนำข้อมูลต่อไปนี้ไปใส่ใน HTML:

```text
Discord Bot Token
Firebase Service Account JSON
Private Key
GitHub Token
GitHub Actions Secret
```

โดยเฉพาะ:

```text
DISCORD_BOT_TOKEN
FIREBASE_SERVICE_ACCOUNT_JSON
```

ควรเก็บไว้ใน:

```text
GitHub Actions Secrets
```

เท่านั้น

---

# ⚠️ Firestore Security

ระบบปัจจุบันมีข้อจำกัดด้าน Security เพราะ Frontend สามารถเข้าถึง Firestore ได้โดยตรง

Rules แบบเปิด:

```javascript
allow read: if true;
allow write: if true;
```

ไม่ควรถือว่าเป็นระบบ Authentication

ผู้ใช้งานที่มีความรู้ด้าน Browser Developer Tools สามารถพยายามส่งข้อมูลเข้า Firestore โดยตรงได้

Repository ระบุความเสี่ยงนี้ไว้ในคู่มือ Firebase เช่นกัน

---

# 🔐 แนะนำสำหรับ Production

หากนำระบบไปใช้จริงกับ Server ที่มีผู้เล่นจำนวนมาก แนะนำพัฒนาระบบต่อเป็น:

```text
Discord OAuth2
        ↓
Backend
        ↓
ตรวจสอบ Discord User
        ↓
Firebase Authentication
        ↓
Firestore
```

และใช้ Firestore Rules เช่น:

```javascript
allow read: if request.auth != null;
allow write: if request.auth != null;
```

พร้อมตรวจสอบสิทธิ์ของผู้ใช้จริงจาก Backend

ไม่ควรพึ่งพาการซ่อนปุ่ม Admin ด้วย JavaScript เพียงอย่างเดียว

---

# 🧰 การอัปเดตเว็บไซต์

หลังแก้ไขไฟล์:

```bash
git add .
git commit -m "Update whitelist system"
git push origin main
```

GitHub Pages จะ Deploy เวอร์ชันใหม่โดยอัตโนมัติ

GitHub Actions สำหรับ Discord Role Sync ก็จะใช้ Code ล่าสุดจาก Repository

---

# 📋 Checklist ก่อนเปิดใช้งานจริง

### Firebase

- [ ] สร้าง Firebase Project
- [ ] เปิด Firestore
- [ ] เลือก Region
- [ ] สร้าง Web App
- [ ] แก้ `firebase-config.js`
- [ ] ตั้ง Firestore Rules
- [ ] ทดสอบเขียนข้อมูล
- [ ] ทดสอบอ่านข้อมูล

### Website

- [ ] `whitelist-form.html` เปิดได้
- [ ] `admin-chop-hee.html` เปิดได้
- [ ] Form ส่งข้อมูลได้
- [ ] ข้อมูลเข้า Firestore
- [ ] ทีมงานบันทึกผลตรวจได้
- [ ] Admin เห็นใบสมัคร

### Discord

- [ ] สร้าง Discord Bot
- [ ] Bot เข้า Server แล้ว
- [ ] Bot มี `Manage Roles`
- [ ] Bot Role อยู่สูงกว่า Approved Role
- [ ] ตั้ง `GUILD_ID`
- [ ] ตั้ง `APPROVED_ROLE_ID`
- [ ] ตั้ง `DISCORD_BOT_TOKEN`
- [ ] สร้าง Firebase Service Account
- [ ] ตั้ง `FIREBASE_SERVICE_ACCOUNT_JSON`
- [ ] ทดสอบ GitHub Actions

### Security

- [ ] ไม่เผยแพร่ Bot Token
- [ ] ไม่ Upload Service Account JSON
- [ ] ตรวจสอบ Firestore Rules
- [ ] จำกัดสิทธิ์ Admin
- [ ] ทดสอบการแก้ข้อมูลจาก DevTools
- [ ] เปิด HTTPS

---

# 🗺️ สรุปการติดตั้งแบบเร็ว

หากต้องการติดตั้งแบบสั้นที่สุด:

```text
1. Clone Repository
        ↓
2. สร้าง Firebase Project
        ↓
3. เปิด Firestore
        ↓
4. สร้าง Firebase Web App
        ↓
5. แก้ firebase-config.js
        ↓
6. ตั้ง Firestore Rules
        ↓
7. Deploy GitHub Pages
        ↓
8. สร้าง Discord Bot
        ↓
9. ตั้ง GUILD_ID / APPROVED_ROLE_ID
        ↓
10. สร้าง Firebase Service Account
        ↓
11. ใส่ GitHub Secrets
        ↓
12. ทดสอบ GitHub Actions
        ↓
13. ทดสอบสมัคร Whitelist
        ↓
14. ทดสอบ Approve
        ↓
15. ตรวจสอบ Discord Role
```

---

# 📚 เอกสารเพิ่มเติม

คู่มือ Firebase ที่อยู่ใน Repository:

`README-Firebase-Setup.md`

สามารถใช้สำหรับตรวจสอบขั้นตอนการเชื่อม Firebase เพิ่มเติมได้

---

# 📌 ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `whitelist-form.html` | หน้าใบสมัคร Whitelist |
| `admin-chop-hee.html` | ระบบจัดการใบสมัคร |
| `streamer-form.html` | แบบฟอร์ม Streamer |
| `firebase-config.js` | Firebase Web Configuration |
| `firebase-storage.js` | ตัวเชื่อม Firestore |
| `firestore.rules` | กฎความปลอดภัย Firestore |
| `scripts/sync-discord-roles.js` | เพิ่มยศ Discord อัตโนมัติ |
| `.github/workflows/sync-discord-roles.yml` | GitHub Actions สำหรับแอดยศและแจ้งผล Discord |
| `scripts/notify-applicants.js` | ส่ง DM แจ้งผลตรวจและลิงก์ฟอร์มเดิม |
| `README-Discord-Notification.md` | คู่มือติดตั้งระบบแจ้งผล Discord |
| `scripts/fetch-data.js` | ดึงเฉพาะใบสมัครที่มีสถานะต้องดำเนินการให้ workflow ใช้ร่วมกัน |
| `package.json` | Node.js / Dependencies |

---

# 🤝 Support

หากพบปัญหา ควรตรวจสอบ:

```text
Browser Console
Firebase Console
Firestore Rules
GitHub Actions Logs
Discord Bot Permissions
Discord Role Hierarchy
GitHub Secrets
```

ก่อนแจ้งปัญหา

เมื่อแจ้งปัญหา ควรแนบ:

- ชื่อไฟล์
- Error Message
- Screenshot
- GitHub Actions Log
- Firebase Error
- ขั้นตอนที่ทำให้เกิดปัญหา

> **ห้ามส่ง Discord Bot Token หรือ Firebase Service Account Private Key ใน Issue / Discord / Chat**

---

## Medieval Online TH

ระบบ Whitelist สำหรับ **Medieval Online TH**

Repository:

[Medievalonline/whitelist-form-Medieval-TH](https://github.com/Medievalonline/whitelist-form-Medieval-TH?utm_source=chatgpt.com)