require('dotenv').config({ path: __dirname + '/.env' });

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const required = ['MONDAY_API_TOKEN', 'FIREBASE_SERVICE_ACCOUNT'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing required scripts/.env values: ${missing.join(', ')}`);
}

const serviceAccountPath = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT);
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Firebase service-account file not found: ${serviceAccountPath}`);
}

admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });

const db = admin.firestore();
const boardId = process.env.MONDAY_BOARD_ID || '18429979717';
const columnIds = {
  talentId: process.env.TALENT_ID_COLUMN_ID,
  serviceLine: process.env.SERVICE_LINE_COLUMN_ID,
  date: process.env.DATE_COLUMN_ID,
  day: process.env.DAY_COLUMN_ID,
  workType: process.env.WORK_TYPE_COLUMN_ID,
  chargeCode: process.env.CHARGE_CODE_COLUMN_ID,
  plannedHours: process.env.PLANNED_HOURS_COLUMN_ID,
  actualHours: process.env.ACTUAL_HOURS_COLUMN_ID,
  varianceType: process.env.VARIANCE_TYPE_COLUMN_ID,
  reason: process.env.REASON_COLUMN_ID
};

async function getMondayItems() {
  const query = `{ boards(ids: [${boardId}]) { items_page(limit: 500) { items { id column_values { id text } } } } }`;
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MONDAY_API_TOKEN}`,
      'API-Version': '2024-01'
    },
    body: JSON.stringify({ query })
  });
  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(payload.errors?.map(error => error.message).join('; ') || `Monday request failed (${response.status})`);
  }
  return payload.data?.boards?.[0]?.items_page?.items || [];
}

async function getProfilesByTalentId() {
  const profiles = new Map();
  const snapshot = await db.collection('users').get();
  snapshot.forEach(document => {
    const profile = document.data();
    if (profile.talentId) profiles.set(String(profile.talentId).trim().toUpperCase(), document.id);
  });
  return profiles;
}

function normalizeItem(item) {
  const columns = Object.fromEntries(item.column_values.map(column => [column.id, column.text || '']));
  return {
    talentId: columns[columnIds.talentId].trim().toUpperCase(),
    data: {
      serviceLine: columns[columnIds.serviceLine],
      date: columns[columnIds.date],
      day: columns[columnIds.day],
      workType: columns[columnIds.workType],
      chargeCode: columns[columnIds.chargeCode],
      plannedHours: columns[columnIds.plannedHours],
      actualHours: columns[columnIds.actualHours],
      varianceType: columns[columnIds.varianceType],
      reason: columnIds.reason ? columns[columnIds.reason] : '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  };
}

async function run() {
  const [items, profilesByTalentId] = await Promise.all([getMondayItems(), getProfilesByTalentId()]);
  let imported = 0;
  const unmatchedTalentIds = new Set();
  let batch = db.batch();
  let writes = 0;

  for (const item of items) {
    const { talentId, data } = normalizeItem(item);
    const userId = profilesByTalentId.get(talentId);
    if (!talentId || !userId) {
      if (talentId) unmatchedTalentIds.add(talentId);
      continue;
    }
    batch.set(db.collection('users').doc(userId).collection('variances').doc(item.id), data, { merge: true });
    imported++;
    writes++;
    if (writes === 400) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }
  }
  if (writes) await batch.commit();

  console.log(`Imported ${imported} private variance record(s).`);
  if (unmatchedTalentIds.size) console.log(`No Firebase user profile for TalentID(s): ${[...unmatchedTalentIds].join(', ')}`);
}

run().catch(error => {
  console.error(`Import failed: ${error.message}`);
  process.exitCode = 1;
});
