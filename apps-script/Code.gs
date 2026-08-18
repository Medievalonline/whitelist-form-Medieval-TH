// Google Apps Script Web App
// ไฟล์: apps-script/Code.gs
//
// ตั้งค่า Script Properties ก่อน Deploy:
// - SPREADSHEET_ID: ID ของ Google Sheet
// - SHEET_NAME: ชื่อแท็บ เช่น Applications
// - WEBHOOK_TOKEN: Token ลับที่ตรงกับ GitHub Secret

const BASE_COLUMNS = [
  "Discord ID",
  "Discord Username",
  "ประเภทใบสมัคร",
  "สถานะ",
  "ความเห็นทีมงาน",
  "ผู้ตรวจ",
  "ส่งใบสมัครล่าสุด",
  "ตรวจล่าสุด",
  "ส่งแก้ไขล่าสุด",
  "Steam HEX ID",
  "Social Media",
  "ลิงก์สตรีม",
  "คำตอบทั้งหมด (JSON)",
  "ซิงก์ล่าสุด",
];

function doGet() {
  return jsonResponse({ ok: true, service: "Medieval Whitelist Sheets Sync" });
}

function doPost(e) {
  try {
    const body = parseRequestBody(e);
    const expectedToken = getProperty("WEBHOOK_TOKEN");

    if (!body.token || body.token !== expectedToken) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    if (!Array.isArray(body.records)) {
      return jsonResponse({ ok: false, error: "records ต้องเป็น Array" }, 400);
    }

    const spreadsheetId = getProperty("SPREADSHEET_ID");
    const sheetName = PropertiesService.getScriptProperties().getProperty("SHEET_NAME") || "Applications";
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = getOrCreateSheet(spreadsheet, sheetName);
    const result = syncRecords(sheet, body.records, body.sentAt || new Date().toISOString());

    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) }, 500);
  }
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("ไม่พบ POST body");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("POST body ต้องเป็น JSON ที่ถูกต้อง");
  }
}

function getProperty(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value || String(value).trim() === "") {
    throw new Error(`ยังไม่ได้ตั้ง Script Property: ${name}`);
  }
  return String(value).trim();
}

function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
  return sheet;
}

function syncRecords(sheet, records, syncedAt) {
  const range = sheet.getDataRange();
  const existingValues = range.getNumRows() > 0 && range.getNumColumns() > 0
    ? range.getValues()
    : [];
  const existingHeader = existingValues.length > 0 ? existingValues[0].map(String) : [];
  const headers = mergeHeaders(existingHeader, records);
  const existingRows = existingValues.length > 1 ? existingValues.slice(1) : [];
  const oldDiscordIdColumn = existingHeader.indexOf("Discord ID");
  const rowByDiscordId = {};

  if (oldDiscordIdColumn >= 0) {
    existingRows.forEach(function (row, index) {
      const discordId = row[oldDiscordIdColumn];
      if (discordId !== "" && discordId !== null && discordId !== undefined) {
        const key = String(discordId);
        if (!rowByDiscordId[key]) rowByDiscordId[key] = index + 2;
      }
    });
  }

  const outputRows = existingRows.map(function (oldRow) {
    const row = new Array(headers.length).fill("");
    for (let i = 0; i < oldRow.length && i < row.length; i += 1) row[i] = oldRow[i];
    return row;
  });

  const newRowByDiscordId = {};
  let updated = 0;
  let appended = 0;

  records.forEach(function (record) {
    const discordId = String(record.discordId || "").trim();
    if (!discordId) return;

    const values = headers.map(function (header) {
      return valueForHeader(record, header, syncedAt);
    });
    const existingRowNumber = rowByDiscordId[discordId];

    if (existingRowNumber) {
      const outputIndex = existingRowNumber - 2;
      const currentRow = outputRows[outputIndex] || new Array(headers.length).fill("");
      for (let i = 0; i < values.length; i += 1) {
        if (isManagedHeader(headers[i])) currentRow[i] = values[i];
      }
      outputRows[outputIndex] = currentRow;
      updated += 1;
      return;
    }

    // กันข้อมูลชุดเดียวกันซ้ำใน payload เดียวกัน
    if (newRowByDiscordId[discordId]) return;
    newRowByDiscordId[discordId] = true;
    outputRows.push(values);
    appended += 1;
  });

  ensureSheetSize(sheet, outputRows.length + 1, headers.length);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (outputRows.length > 0) {
    sheet.getRange(2, 1, outputRows.length, headers.length).setValues(outputRows);
  }
  SpreadsheetApp.flush();

  return {
    updated: updated,
    appended: appended,
    total: records.length,
    sheet: sheet.getName(),
  };
}

function ensureSheetSize(sheet, rows, columns) {
  if (sheet.getMaxRows() < rows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < columns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
  }
}

function isManagedHeader(header) {
  return BASE_COLUMNS.indexOf(header) >= 0 || String(header).indexOf("คำตอบ: ") === 0;
}

function mergeHeaders(existingHeader, records) {
  const headers = [];
  const seen = {};
  const answerKeys = {};

  records.forEach(function (record) {
    const answers = record.answers && typeof record.answers === "object" ? record.answers : {};
    Object.keys(answers).forEach(function (key) {
      answerKeys[key] = true;
    });
  });

  existingHeader.concat(BASE_COLUMNS).forEach(function (header) {
    if (!header || seen[header]) return;
    seen[header] = true;
    headers.push(header);
  });

  Object.keys(answerKeys).sort().forEach(function (key) {
    const header = "คำตอบ: " + key;
    if (seen[header]) return;
    seen[header] = true;
    headers.push(header);
  });

  return headers.length > 0 ? headers : BASE_COLUMNS.slice();
}

function valueForHeader(record, header, syncedAt) {
  const answers = record.answers && typeof record.answers === "object" ? record.answers : {};
  const baseValues = {
    "Discord ID": record.discordId || "",
    "Discord Username": record.discordUsername || "",
    "ประเภทใบสมัคร": record.type === "streamer" ? "streamer" : "regular",
    "สถานะ": record.status || "pending",
    "ความเห็นทีมงาน": record.adminComment || "",
    "ผู้ตรวจ": record.reviewedBy || "",
    "ส่งใบสมัครล่าสุด": record.submittedAt || "",
    "ตรวจล่าสุด": record.reviewedAt || "",
    "ส่งแก้ไขล่าสุด": record.resubmittedAt || "",
    "Steam HEX ID": record.steamId || "",
    "Social Media": record.socialMedia || "",
    "ลิงก์สตรีม": record.streamLink || "",
    "คำตอบทั้งหมด (JSON)": JSON.stringify(answers),
    "ซิงก์ล่าสุด": syncedAt,
  };

  if (Object.prototype.hasOwnProperty.call(baseValues, header)) {
    return cleanCell(baseValues[header]);
  }

  const prefix = "คำตอบ: ";
  if (String(header).indexOf(prefix) === 0) {
    return cleanCell(answers[String(header).slice(prefix.length)]);
  }

  return "";
}

function cleanCell(value) {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  return text.replace(/\u0000/g, "").slice(0, 49000);
}

function jsonResponse(payload, statusCode) {
  // Apps Script Web App จะส่ง HTTP 200 เป็นหลัก จึงใส่ statusCode ไว้ใน JSON ด้วย
  // ฝั่ง GitHub Actions จะตรวจสอบค่า ok อีกชั้นหนึ่ง
  return ContentService
    .createTextOutput(JSON.stringify({ ...payload, statusCode: statusCode || 200 }))
    .setMimeType(ContentService.MimeType.JSON);
}
