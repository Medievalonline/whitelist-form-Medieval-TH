# คู่มือติดตั้งระบบแจ้งผลผู้สมัครผ่าน Discord

เอกสารนี้อธิบายการติดตั้งส่วนที่เพิ่มเข้ามาในโครงการ `whitelist-form-Medieval-TH` เพื่อให้ทีมงานตรวจใบสมัครแล้วระบบส่งข้อความส่วนตัว (DM) ไปยังผู้สมัครผ่าน Discord โดยรองรับผลตรวจ 4 แบบ ได้แก่ **ผ่านการพิจารณา**, **ผ่านแล้วรอเซิร์ฟเปิด**, **ไม่ผ่านการพิจารณา** และ **ต้องแก้ไขก่อน**

ระบบจะเลือก **ลิงก์สมัครเดิมตามประเภทใบสมัคร** อัตโนมัติ หากใบสมัครมี `type: "regular"` ระบบจะส่งลิงก์แบบฟอร์มทั่วไป และหากมี `type: "streamer"` ระบบจะส่งลิงก์แบบฟอร์มสตรีมเมอร์ เมื่อผู้สมัครเปิดลิงก์เดิมและเข้าสู่ระบบด้วย Discord บัญชีเดิม ระบบจะโหลดคำตอบเดิมและความเห็นจากทีมงาน เพื่อให้แก้ไขแล้วส่งใหม่ได้

> **การทำงานตามชุดไฟล์นี้:** GitHub Actions จะตรวจข้อมูลทุก 5 นาที ไม่ใช่การแจ้งทันทีในวินาทีที่กดบันทึกผล ดังนั้นผลตรวจอาจถูกส่งช้าสูงสุดประมาณหนึ่งรอบของ Workflow

## ไฟล์ที่เพิ่มหรือแก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `scripts/notify-applicants.js` | สคริปต์เปิด DM และส่งข้อความผลตรวจ โดยแยกลิงก์ทั่วไป/สตรีมเมอร์จาก `record.type` |
| `package.json` | เพิ่มคำสั่ง `npm run notify` |
| `.github/workflows/sync-discord-roles.yml` | เรียกทั้งระบบแอดยศเดิมและระบบแจ้ง DM ใน Workflow เดียวกัน |
| `README-Discord-Notification.md` | คู่มือนี้ |

## 1. นำไฟล์ขึ้น GitHub Repository

แตกไฟล์ ZIP แล้วคัดลอกไฟล์ทั้งหมดไปยัง Repository เดิมของคุณ โดยคงโครงสร้างโฟลเดอร์ไว้ดังนี้

```text
.github/workflows/sync-discord-roles.yml
scripts/notify-applicants.js
scripts/sync-discord-roles.js
package.json
whitelist-form.html
streamer-form.html
admin-chop-hee.html
firebase-config.js
firebase-storage.js
firestore.rules
```

จากนั้น Commit และ Push ไปยัง Branch หลักของ Repository ตัวอย่างคำสั่งคือ

```bash
git add .
git commit -m "Add Discord applicant result notifications"
git push origin main
```

หน้าแอดมินที่มีอยู่จริงในชุดไฟล์นี้ชื่อ `admin-chop-hee.html` ไม่ใช่ `admin.html` ดังนั้นเวลาตั้งค่า Redirect URI และเวลาส่งลิงก์ให้ทีมงานต้องใช้ชื่อไฟล์จริงนี้

## 2. ตรวจสอบ Firebase

ระบบแจ้งเตือนอ่านข้อมูลจาก Firestore Collection ชื่อ `applications` โดยใช้เอกสารใบสมัครที่มีรูปแบบ `application:<Discord ID>` สคริปต์จะตรวจฟิลด์ต่อไปนี้

| ฟิลด์ | หน้าที่ |
|---|---|
| `status` | สถานะล่าสุดของใบสมัคร |
| `adminComment` | ความเห็นหรือจุดที่ผู้สมัครต้องแก้ |
| `reviewedAt` | เวลาที่ทีมงานกดบันทึกผลตรวจล่าสุด |
| `reviewedBy` | ชื่อผู้ตรวจ |
| `type` | ประเภทใบสมัคร: `regular` หรือ `streamer` |
| `notifiedReviewedAt` | เวลาของผลตรวจที่ส่ง DM ไปแล้ว เพื่อป้องกันการแจ้งซ้ำ |
| `notifyError` | สาเหตุล่าสุดที่ส่ง DM ไม่สำเร็จ |

ตรวจสอบว่า `firebase-config.js` ใช้ Firebase Project ของคุณเอง และ GitHub Secret `FIREBASE_SERVICE_ACCOUNT_JSON` เป็น Service Account JSON ของ Project เดียวกัน หากใช้คนละ Project ระบบหน้าเว็บกับสคริปต์หลังบ้านจะอ่านข้อมูลคนละฐานข้อมูล

## 3. ตั้งค่า Discord Bot

ใช้บอทตัวเดิมที่ระบบแอดยศใช้อยู่ได้เลย ไม่จำเป็นต้องสร้างบอทใหม่ บอทต้องถูกเพิ่มอยู่ในเซิร์ฟเวอร์เดียวกับผู้สมัคร และต้องใช้ Bot Token เดิมที่มีอยู่ในระบบเดิม การสร้างและจัดการ Bot ทำผ่าน Discord Developer Portal ตามเอกสารทางการของ Discord [1]

สำหรับระบบแอดยศเดิม บอทยังต้องมีสิทธิ์ **Manage Roles** และ Role ของบอทต้องอยู่สูงกว่า Role ที่ต้องการแจก เพราะ Discord จำกัดให้บอทจัดการได้เฉพาะ Role ที่อยู่ต่ำกว่า Role สูงสุดของบอท [2]

การส่ง DM ไม่ต้องใช้สิทธิ์ `Manage Roles` เพิ่ม แต่ผู้สมัครต้องยังอยู่ในเซิร์ฟเวอร์เดียวกับบอทและไม่ปิดรับข้อความส่วนตัวจากสมาชิกเซิร์ฟเวอร์ หากเปิด DM ไม่ได้ ระบบจะเขียนสาเหตุไว้ใน Firestore ฟิลด์ `notifyError` และ Workflow จะขึ้นสถานะล้มเหลวเพื่อให้ทีมงานตรวจสอบ

## 4. ตั้งค่า GitHub Secrets

**ไม่ต้องสร้าง GitHub Secret ใหม่** หาก Repository เดิมมี Secret ชื่อและค่าถูกต้องอยู่แล้ว ให้ใช้ต่อได้ทันที เพียงตรวจสอบที่ **Settings → Secrets and variables → Actions** ว่ามีรายการเดิม 2 รายการนี้อยู่

| ชื่อ Secret | ค่า |
|---|---|
| `DISCORD_BOT_TOKEN` | Bot Token จาก Discord Developer Portal |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | เนื้อหา JSON ของ Firebase Service Account ทั้งก้อน |

ห้ามใส่ Bot Token หรือ Service Account JSON ลงใน HTML, JavaScript, Git หรือแชตสาธารณะ Discord เอกสารทางการของ Discord ระบุว่า Bot Token ใช้ยืนยันตัวตนของบอทและควรถือเป็นข้อมูลอ่อนไหว [1]

หากยังไม่มีรายการใดรายการหนึ่ง ให้สร้างเฉพาะรายการที่ขาดด้วยชื่อเดิมตามตารางด้านบน หาก Token เคยถูกเผยแพร่ ให้กด Reset Token ใน Discord Developer Portal แล้วอัปเดตค่า `DISCORD_BOT_TOKEN` ใน GitHub Secret ทันที

## 5. ตั้งค่าลิงก์สมัครเดิมสองประเภท

เปิดไฟล์ `.github/workflows/sync-discord-roles.yml` แล้วแก้สองบรรทัดนี้ให้เป็น URL จริงของคุณ

```yaml
          REGULAR_FORM_URL: "https://โดเมนของคุณ/whitelist-form.html"
          STREAMER_FORM_URL: "https://โดเมนของคุณ/streamer-form.html"
```

ค่าเริ่มต้นในชุดไฟล์ที่ส่งมาคือ

```yaml
          REGULAR_FORM_URL: "https://bikiniz-fivem.github.io/whitelist-form-Medieval-TH/whitelist-form.html"
          STREAMER_FORM_URL: "https://bikiniz-fivem.github.io/whitelist-form-Medieval-TH/streamer-form.html"
```

ถ้าต้องการเปลี่ยนลิงก์ในอนาคต ให้แก้เฉพาะสองบรรทัดนี้แล้ว Push ใหม่ ไม่จำเป็นต้องแก้ `scripts/notify-applicants.js` เนื่องจากสคริปต์อ่านค่าจาก Environment Variable ก่อน และจะใช้ค่าเริ่มต้นเฉพาะเมื่อไม่ได้กำหนดค่าไว้

## 6. ตั้งค่า Discord OAuth Redirect URI

ระบบฟอร์มและหน้าแอดมินใช้ Discord OAuth Client ID เดียวกัน ตรวจให้ทุกไฟล์มี Client ID ของแอปเดียวกัน และเพิ่ม Redirect URI ใน Discord Developer Portal ให้ตรงกับ URL จริงของคุณ 3 รายการต่อไปนี้

```text
https://โดเมนของคุณ/whitelist-form.html
https://โดเมนของคุณ/streamer-form.html
https://โดเมนของคุณ/admin-chop-hee.html
```

หากใช้ GitHub Pages URL จะต้องใส่ Path ของ Repository ให้ครบ เช่น

```text
https://ชื่อผู้ใช้.github.io/ชื่อรีโป/whitelist-form.html
```

Redirect URI ต้องตรงกับ URL ที่เปิดจริง รวมถึง `https`, ชื่อโดเมน, ตัวพิมพ์เล็ก-ใหญ่ และ Path มิฉะนั้นการ Login ด้วย Discord จะไม่กลับเข้าหน้าเว็บตามที่คาดไว้

## 7. เปิดใช้งานและทดสอบ Workflow

หลัง Push ไฟล์และตั้ง Secret แล้ว ไปที่ **Actions → Sync approved Discord roles** จากนั้นกด **Run workflow** เพื่อทดสอบทันทีได้ หรือรอรอบอัตโนมัติทุก 5 นาที Workflow เดิมใช้ Cron `*/5 * * * *` และยังทำงานตามเวลา UTC ตามข้อกำหนดของ GitHub Actions [3]

ลำดับการทำงานของ Workflow คือ

```text
อ่านใบสมัครที่ approved แล้วแอดยศ Discord ตามระบบเดิม
                    ↓
อ่านข้อความที่ทีมงานตรวจแล้วและยังไม่เคยแจ้ง
                    ↓
เปิด DM ให้ผู้สมัคร
                    ↓
ส่งสถานะ + ความเห็นทีมงาน + ลิงก์ฟอร์มเดิม
                    ↓
บันทึก notifiedReviewedAt เพื่อไม่ส่งซ้ำ
```

ทดสอบจริงตามลำดับนี้

1. ใช้ Discord บัญชีทดสอบส่งใบสมัครแบบทั่วไปหนึ่งใบ และทดสอบอีกบัญชีด้วยแบบฟอร์มสตรีมเมอร์หนึ่งใบ
2. เปิด `admin-chop-hee.html` แล้วบันทึกผลเป็น `ผ่านการพิจารณา`, `ไม่ผ่านการพิจารณา` หรือ `ต้องแก้ไขก่อน` พร้อมใส่ความเห็น
3. ไปที่ GitHub Actions แล้วกด Run workflow
4. ตรวจสอบ Log ว่ามีข้อความ `แจ้งเตือนสำเร็จ` และตรวจ DM ของผู้สมัคร
5. เปิดลิงก์ใน DM ด้วยบัญชี Discord เดิม ตรวจว่าฟอร์มประเภทถูกต้อง คำตอบเดิมถูกโหลด และเห็นความเห็นจากทีมงาน
6. หากเลือก `ต้องแก้ไขก่อน` ให้แก้คำตอบแล้วกดส่งใหม่ จากนั้นทีมงานบันทึกผลอีกรอบ ระบบจะส่ง DM รอบใหม่ เพราะ `reviewedAt` เปลี่ยน

ระบบจะไม่ส่ง DM ซ้ำหากผลตรวจยังเป็นรอบเดิม เพราะจะเปรียบเทียบ `reviewedAt` กับ `notifiedReviewedAt` แต่ถ้าทีมงานแก้ความเห็นแล้วกดบันทึกใหม่ แม้สถานะเดิมยังไม่เปลี่ยน ระบบจะถือเป็นผลตรวจรอบใหม่และส่ง DM อีกครั้ง

## 8. คำสั่งทดสอบบนเครื่องของผู้ดูแล

โครงการกำหนดให้ใช้ Node.js 20 ขึ้นไป ติดตั้งแพ็กเกจก่อนด้วยคำสั่งต่อไปนี้

```bash
npm install
```

ตรวจสอบไวยากรณ์และเรียกระบบแจ้งเตือนด้วย Environment Variable ดังนี้ โดยไม่ต้องเขียน Token ลงไฟล์

```bash
export DISCORD_BOT_TOKEN="ใส่โทเคนบอทชั่วคราวในเครื่องของคุณ"
export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat firebase-service-account.json)"
export REGULAR_FORM_URL="https://โดเมนของคุณ/whitelist-form.html"
export STREAMER_FORM_URL="https://โดเมนของคุณ/streamer-form.html"
npm run notify
```

หลังทดสอบเสร็จให้ลบไฟล์ Service Account ออกจากเครื่องหรือเก็บไว้ในที่ปลอดภัย และห้าม Commit ไฟล์ดังกล่าวเข้า Repository

## 9. การแก้ปัญหา

| อาการ | จุดตรวจสอบ |
|---|---|
| `ไม่พบ env DISCORD_BOT_TOKEN` | ชื่อ GitHub Secret ต้องเป็น `DISCORD_BOT_TOKEN` ตรงตัว และต้องใส่ในขั้นตอน `Notify applicants by Discord DM` |
| `ไม่พบ env FIREBASE_SERVICE_ACCOUNT_JSON` | ตรวจว่ามี Secret JSON ครบทั้งก้อน รวมถึง `private_key` และอยู่ใน Project เดียวกับเว็บ |
| HTTP 401 | Bot Token ผิด ถูก Reset หรือ Secret มีช่องว่าง/ค่าเก่า |
| HTTP 403 ตอนแอดยศ | บอทไม่มี `Manage Roles` หรือ Role บอทอยู่ต่ำกว่า Role เป้าหมาย |
| HTTP 403 ตอนส่ง DM | ผู้สมัครปิด DM หรือไม่ได้อยู่เซิร์ฟเวอร์เดียวกับบอท |
| HTTP 404 | Discord ID ในใบสมัครผิด หรือผู้สมัครไม่ได้อยู่ในเซิร์ฟเวอร์ |
| DM ส่งได้แต่ลิงก์ผิด | แก้ `REGULAR_FORM_URL` และ `STREAMER_FORM_URL` ใน Workflow แล้ว Push ใหม่ |
| Workflow ไม่ทำงานตามเวลา | ตรวจว่า Actions เปิดใช้งานอยู่และ Workflow อยู่ใน Default Branch ของ Repository |

## 10. ข้อควรระวังด้านความปลอดภัย

โครงการชุดนี้เป็นเว็บ Static ที่หน้าเว็บเข้าถึง Firestore โดยตรง ดังนั้นควรตรวจสอบ Firestore Rules ให้เหมาะกับการใช้งานจริง เพราะกฎแบบ `allow read: if true` และ `allow write: if true` เปิดให้ผู้ใช้ที่รู้วิธีเรียก Firestore จาก Browser พยายามแก้ข้อมูลได้ ระบบสิทธิ์หน้าแอดมินที่อยู่ใน JavaScript ฝั่งผู้ใช้ก็ไม่ควรถือเป็นการป้องกันระดับ Server

นอกจากนี้ จากการตรวจไฟล์ที่แนบมา พบว่า URL ของ Discord Webhook สำหรับแจ้งใบสมัครใหม่ถูกฝังไว้ใน HTML ฝั่งผู้ใช้ หาก Repository นี้เคยเผยแพร่สู่สาธารณะ ควร **ลบ Webhook เดิมและสร้าง Webhook ใหม่** ก่อนใช้งานจริง เพราะ URL ดังกล่าวถือเป็น Credential ที่ผู้เปิดหน้าเว็บสามารถมองเห็นได้ การแจ้งผลผู้สมัครในคู่มือนี้ใช้ Bot Token ผ่าน GitHub Secret แยกจาก Webhook ดังกล่าว

## References

[1]: https://docs.discord.com/developers/bots/overview "Discord Bots & Companion Apps — Developer Documentation"

[2]: https://docs.discord.com/developers/topics/permissions "Discord Permissions — Developer Documentation"

[3]: https://docs.github.com/actions/using-workflows/events-that-trigger-workflows "GitHub Actions: Events that trigger workflows"
