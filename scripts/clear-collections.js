/**
 * clear-collections.js
 * Deletes all documents from the specified Firestore collections
 * using the Firebase CLI's stored refresh token — no service account needed.
 *
 * Usage: node scripts/clear-collections.js
 */

const https  = require('https');
const path   = require('path');
const os     = require('os');
const fs     = require('fs');

const PROJECT_ID = 'seet-variances';
const COLLECTIONS_TO_CLEAR = [
  'masterlist',
  'wfhSchedule',
  'monthlyAttendance',
  'mondayAttendance',
  'wfhVariances',
  'ilcMondayVariances',
];

// ── helpers ──────────────────────────────────────────────────────────────────

function post(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req = https.request({ hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    }, res => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch(e) { resolve(s); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(hostname, reqPath, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path: reqPath, method: 'GET', headers }, res => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch(e) { resolve(s); } });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── get access token from stored refresh token ────────────────────────────────

async function getAccessToken() {
  const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const refreshToken = cfg.tokens.refresh_token;
  const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
  const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
  const body = `grant_type=refresh_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${encodeURIComponent(refreshToken)}`;
  const res = await new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let s = ''; res.on('data', c => s += c); res.on('end', () => resolve(JSON.parse(s))); });
    req.on('error', reject); req.write(body); req.end();
  });
  if (!res.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(res));
  return res.access_token;
}

// ── delete all docs in a collection via REST API ──────────────────────────────

async function deleteCollection(token, collectionName) {
  const base = `firestore.googleapis.com`;
  const colPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}`;
  let totalDeleted = 0;
  let pageToken = '';

  while (true) {
    const qPath = colPath + '?pageSize=300' + (pageToken ? '&pageToken=' + pageToken : '');
    const res = await get(base, qPath, { Authorization: 'Bearer ' + token });
    const docs = res.documents || [];
    if (!docs.length) break;

    // Batch delete via commit
    const writes = docs.map(d => ({ delete: d.name }));
    await post(base,
      `/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
      { writes },
      { Authorization: 'Bearer ' + token }
    );
    totalDeleted += docs.length;
    process.stdout.write(`  ${collectionName}: deleted ${totalDeleted} docs...\r`);
    pageToken = res.nextPageToken || '';
    if (!pageToken) break;
  }
  console.log(`  ✅ ${collectionName}: ${totalDeleted} document(s) deleted.        `);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nGetting access token...`);
  const token = await getAccessToken();
  console.log(`✅ Authenticated.\n`);
  console.log(`Clearing ${COLLECTIONS_TO_CLEAR.length} collections in project "${PROJECT_ID}"...\n`);

  for (const col of COLLECTIONS_TO_CLEAR) {
    try {
      await deleteCollection(token, col);
    } catch (err) {
      console.error(`  ❌ ${col}: FAILED — ${err.message}`);
    }
  }
  console.log('\nAll done.\n');
}

main().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
