// firebase-config.js
// ====================================================================
// กรอกค่า config จาก Firebase Console ของโปรเจกต์คุณ "ที่ไฟล์นี้ที่เดียว"
// ไฟล์นี้ถูกโหลดใช้ร่วมกันทั้ง 3 หน้า: whitelist-form.html, status.html, admin.html
// ทำให้ทั้ง 3 หน้าอ่าน/เขียนฐานข้อมูล Firestore เดียวกัน
//
// วิธีหาไฟล์นี้:
// 1. ไปที่ https://console.firebase.google.com/ แล้วสร้างโปรเจกต์ใหม่ (ฟรี)
// 2. ในโปรเจกต์ กด "Build" > "Firestore Database" > "Create database"
//    เลือก mode "Start in production mode" แล้วตั้ง Location ที่ใกล้ผู้ใช้ (เช่น asia-southeast1)
// 3. กด "Project settings" (รูปเฟือง) > เลื่อนลงมาที่ "Your apps" > กดไอคอน "</>" (Web app)
//    ตั้งชื่อแอป แล้วกด "Register app" — Firebase จะให้ config object แบบด้านล่างนี้มา
// 4. คัดลอกค่ามาแทนที่ค่า "YOUR_..." ด้านล่างทั้งหมด
// ====================================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAWNz--uyRszWwhAMzbZDz5OwlraScKmfk",
  authDomain: "medievalonline-th.firebaseapp.com",
  projectId: "medievalonline-th",
  storageBucket: "medievalonline-th.firebasestorage.app",
  messagingSenderId: "91118707815",
  appId: "1:91118707815:web:95cad4e53bd0fc070d60c2"
};
