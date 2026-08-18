# คู่มือตั้งค่าบันทึกใบสมัครลง Google Sheets ด้วย Apps Script

เวอร์ชันนี้ใช้ **Google Apps Script Web App** เป็นตัวรับข้อมูลจาก GitHub Actions แล้วเขียนลง Google Sheets แทนการใช้ Google Sheets API โดยตรง จึงไม่ต้องใช้ Service Account เพื่อแชร์ไฟล์ Google Sheet และไม่ต้องลงทะเบียน Google Cloud Payment ในแนวทางเดิม

> ระบบยังใช้ Firebase Service Account เดิมเพื่ออ่าน Firestore และยังใช้ `DISCORD_BOT_TOKEN` เดิมสำหรับแอดยศ/ส่ง DM เหมือนเดิม

การซิงก์ทำงานตาม GitHub Actions รอบเดิมทุก 5 นาที หากต้องการทดสอบทันทีให้ไปที่ **Actions → Sync approved Discord roles → Run workflow** แล้วกด Run workflow

## โครงสร้างการทำงาน

```text
Firebase Firestore
        ↓
GitHub Actions ทุก 5 นาที
        ↓
POST ไปยัง Apps Script Web App
        ↓
ตรวจสอบ WEBHOOK_TOKEN
        ↓
เพิ่มหรืออัปเดตแถวใน Google Sheets ตาม Discord ID
```

Google Apps Script Web App รองรับฟังก์ชัน `doPost(e)` สำหรับรับ HTTP POST และสามารถ Deploy ให้ทำงานภายใต้สิทธิ์ของเจ้าของสคริปต์ได้ [1]

## ไฟล์ที่เพิ่มหรือแก้ไข

| ไฟล์ | หน้าที่ |
|---|---|
| `apps-script/Code.gs` | โค้ดที่นำไปวางใน Google Apps Script และเป็นตัวเขียนข้อมูลลง Google Sheets |
| `scripts/sync-google-sheets-apps-script.js` | อ่านข้อมูลจาก Firestore แล้วส่งไปยัง Apps Script |
| `package.json` | เพิ่มคำสั่ง `npm run sheets-sync` |
| `.github/workflows/sync-discord-roles.yml` | เรียกการซิงก์ Apps Script หลังระบบเดิม |
| `README-Google-Sheets-Setup.md` | คู่มือนี้ |

## 1. สร้าง Google Sheet

สร้าง Google Spreadsheet ในบัญชี Google ของทีมงาน ตั้งชื่อได้ตามต้องการ เช่น `Medieval Whitelist Applications`

สร้างแท็บชื่อ

```text
Applications
```

หากใช้ชื่อแท็บอื่น ให้จำชื่อไว้เพื่อใส่ใน Script Property ภายหลัง

## 2. สร้าง Apps Script

1. เปิด Google Sheet ที่สร้างไว้
2. ไปที่ **Extensions → Apps Script**
3. ลบโค้ดตัวอย่างเดิมในหน้า Editor
4. เปิดไฟล์ `apps-script/Code.gs` จาก ZIP ชุดนี้
5. คัดลอกโค้ดทั้งหมดไปวางใน Apps Script Editor
6. กด Save และตั้งชื่อโปรเจกต์ เช่น `Medieval Whitelist Sheets Sync`

## 3. ตั้งค่า Script Properties

ในหน้า Apps Script ให้ไปที่ **Project Settings** แล้วหาเมนู **Script Properties** จากนั้นเพิ่มค่า 3 รายการต่อไปนี้

| Property | ค่า |
|---|---|
| `SPREADSHEET_ID` | ID ของ Google Sheet จาก URL |
| `SHEET_NAME` | `Applications` หรือชื่อแท็บที่คุณเลือก |
| `WEBHOOK_TOKEN` | Token ลับที่คุณสร้างขึ้นเองแบบยาวและเดายาก |

ตัวอย่าง URL ของ Google Sheet

```text
https://docs.google.com/spreadsheets/d/1AbCDeFG123456789/edit
```

ค่า `SPREADSHEET_ID` คือ

```text
1AbCDeFG123456789
```

สำหรับ `WEBHOOK_TOKEN` สามารถสร้างเป็นข้อความสุ่มยาว ๆ เช่น

```text
medieval-sync-เปลี่ยนเป็นข้อความสุ่มของคุณ-9f72a1c4
```

ไม่ควรใช้ตัวอย่างนี้จริง และห้ามนำ Token ไปใส่ไว้ในโค้ดหรือโพสต์สาธารณะ

## 4. อนุญาตการทำงานครั้งแรก

ใน Apps Script Editor ให้เลือกฟังก์ชัน `doGet` จากรายการฟังก์ชันด้านบน แล้วกด **Run** ครั้งแรก Google จะขอสิทธิ์เข้าถึง Google Sheet ให้เลือกบัญชีเจ้าของไฟล์และกดยอมรับสิทธิ์ตามที่ระบบแสดง

ถ้าเห็นหน้าต่างเตือนว่าแอปยังไม่ได้รับการยืนยัน ให้กด **Advanced → Go to Medieval Whitelist Sheets Sync → Allow** เฉพาะกรณีที่เป็นโปรเจกต์ของคุณเองและคุณตรวจสอบโค้ดแล้ว

ขั้นตอนนี้เป็นการอนุญาต Apps Script ให้เขียนไฟล์ของคุณ ไม่ใช่การลงทะเบียน Payment ของ Google Cloud

## 5. Deploy เป็น Web App

ใน Apps Script Editor ให้เลือก

```text
Deploy → New deployment
```

ตั้งค่าดังนี้

| รายการ | ค่า |
|---|---|
| Select type | Web app |
| Execute as | Me หรือบัญชีเจ้าของสคริปต์ |
| Who has access | Anyone |

จากนั้นกด **Deploy** และคัดลอก URL ที่ลงท้ายด้วย `/exec` ตัวอย่างเช่น

```text
https://script.google.com/macros/s/รหัสการเผยแพร่/exec
```

ต้องใช้ URL ที่ลงท้ายด้วย `/exec` ไม่ใช่ URL ทดสอบ `/dev` เพราะ URL `/dev` ใช้ได้เฉพาะผู้ที่มีสิทธิ์แก้ไข Apps Script [1]

> การตั้งค่า `Who has access: Anyone` จำเป็นเพราะ GitHub Actions ต้องส่ง HTTP POST เข้ามาโดยไม่ได้ Login บัญชี Google แต่ข้อมูลจะยังถูกป้องกันด้วย `WEBHOOK_TOKEN` และ Apps Script จะเขียนลง Sheet ภายใต้สิทธิ์ของเจ้าของสคริปต์

## 6. ตั้งค่า GitHub Secret และ Variable

ไปที่ GitHub Repository → **Settings → Secrets and variables → Actions**

### Repository Secret

สร้าง Secret ใหม่ 1 รายการ

| ชื่อ Secret | ค่า |
|---|---|
| `APPS_SCRIPT_WEBHOOK_TOKEN` | ต้องตรงกับ Script Property `WEBHOOK_TOKEN` |

### Repository Variable

สร้าง Variable ใหม่ 1 รายการ

| ชื่อ Variable | ค่า |
|---|---|
| `APPS_SCRIPT_WEB_APP_URL` | URL Apps Script ที่ลงท้ายด้วย `/exec` |

ไม่ต้องสร้างรายการต่อไปนี้ใหม่

```text
DISCORD_BOT_TOKEN                  ใช้ของเดิม
FIREBASE_SERVICE_ACCOUNT_JSON      ใช้ของเดิม
```

และไม่ต้องตั้งค่า `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_TAB` หรือ `GOOGLE_SERVICE_ACCOUNT_JSON` สำหรับเวอร์ชัน Apps Script นี้

## 7. ทดสอบการทำงาน

### ทดสอบ Apps Script ก่อน

เปิด URL `/exec` ใน Browser หากตั้งค่า `doGet` สำเร็จ ควรเห็นข้อความ JSON ลักษณะนี้

```json
{
  "ok": true,
  "service": "Medieval Whitelist Sheets Sync"
}
```

### ทดสอบผ่าน GitHub Actions

1. ตรวจว่า `APPS_SCRIPT_WEB_APP_URL` และ `APPS_SCRIPT_WEBHOOK_TOKEN` ตั้งค่าครบ
2. ไปที่ GitHub → **Actions**
3. เลือก Workflow ชื่อ **Sync approved Discord roles**
4. กด **Run workflow**
5. เปิด Log ของขั้นตอน **Sync applications to Google Sheets via Apps Script**
6. ตรวจ Google Sheet ว่ามีหัวตารางและข้อมูลใบสมัคร

Log ที่สำเร็จจะมีลักษณะประมาณนี้

```text
ส่งข้อมูลไป Google Sheets สำเร็จ: 3 ใบสมัคร, อัปเดต 2 แถว, เพิ่มใหม่ 1 แถว
```

## 8. วิธีอัปเดตข้อมูล

ระบบใช้ `Discord ID` เป็นคีย์หลัก หากพบ Discord ID ในแถวเดิม ระบบจะอัปเดตข้อมูลของแถวนั้น เช่น สถานะ ความเห็นทีมงาน เวลาตรวจ และคำตอบล่าสุด หากไม่พบ Discord ID จึงจะเพิ่มแถวใหม่

คำตอบแต่ละข้อจะถูกสร้างเป็นคอลัมน์รูปแบบ `คำตอบ: ชื่อฟิลด์` และมีคอลัมน์ `คำตอบทั้งหมด (JSON)` เป็นข้อมูลสำรองรวม หากมีฟิลด์คำตอบใหม่ในอนาคต ระบบจะเพิ่มคอลัมน์ใหม่โดยอัตโนมัติ

## 9. แก้ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| เปิด URL แล้วเห็น `Unauthorized` | การเปิด URL ด้วย Browser เป็น GET จึงไม่ส่ง Token แต่ระบบยังทำงานได้ ให้ตรวจจริงผ่าน GitHub Actions หรือใช้ `doGet` ที่อยู่ในโค้ดล่าสุด |
| GitHub Actions แจ้ง `ไม่พบ env APPS_SCRIPT_WEB_APP_URL` | สร้าง Repository Variable ชื่อนี้และใส่ URL `/exec` |
| GitHub Actions แจ้ง `Unauthorized` | ค่า `APPS_SCRIPT_WEBHOOK_TOKEN` ไม่ตรงกับ Script Property `WEBHOOK_TOKEN` |
| Apps Script แจ้ง `ยังไม่ได้ตั้ง Script Property` | ตรวจชื่อ Property ให้ตรงตัว รวมตัวพิมพ์ใหญ่ทั้งหมด |
| Apps Script แจ้งเปิดไฟล์ไม่ได้ | ตรวจ `SPREADSHEET_ID` ว่าเป็น ID จาก URL ของ Sheet เดียวกับที่เปิด Apps Script |
| ชีตไม่อัปเดตทันที | Workflow ทำงานทุก 5 นาที หรือกด Run workflow เองเพื่อทดสอบทันที |
| แก้โค้ด Apps Script แล้ว GitHub ยังใช้ของเก่า | ไปที่ **Deploy → Manage deployments → Edit → New version → Deploy** |
| ข้อมูลใน Sheet ซ้ำ | ห้ามแก้หรือลบค่าในคอลัมน์ `Discord ID` เพราะเป็นคีย์สำหรับจับคู่แถวเดิม |

## 10. ความเป็นส่วนตัวและความปลอดภัย

Google Sheet จะมีข้อมูลส่วนตัวและคำตอบของผู้สมัคร ควรแชร์ไฟล์เฉพาะทีมงานที่เกี่ยวข้อง และไม่เปิดสิทธิ์เป็น **Anyone with the link → Editor**

Apps Script Web App เปิดให้รับคำขอจากภายนอกเพื่อให้ GitHub Actions เรียกได้ ดังนั้น `WEBHOOK_TOKEN` ต้องเป็นข้อความลับและไม่ควรอยู่ในโค้ดที่เผยแพร่สาธารณะ หากสงสัยว่า Token รั่ว ให้เปลี่ยนทั้ง Script Property และ GitHub Secret ให้เป็นค่าใหม่ที่ตรงกัน

Apps Script มีโควตาและข้อจำกัดการใช้งานต่อวัน หากเกินโควตา การทำงานจะหยุดจนกว่าโควตาจะรีเซ็ต โดย Google ระบุว่าโควตาอาจแตกต่างตามประเภทบัญชีและสามารถเปลี่ยนแปลงได้ [2]

## References

[1]: https://developers.google.com/apps-script/guides/web "Google Apps Script Web Apps"

[2]: https://developers.google.com/apps-script/guides/services/quotas "Google Apps Script Quotas"
