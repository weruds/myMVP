require('dotenv').config({ path: __dirname + '/.env' });

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT || 'service-account.json';
const serviceAccountPath = path.resolve(__dirname, serviceAccountFile);

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Firebase service-account file not found at: ${serviceAccountPath}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath))
});

const auth = admin.auth();
const db   = admin.firestore();

// Default password rule: can be customized via DEFAULT_TEMP_PASSWORD env var or defaults to "Welcome@IBM2026!"
const DEFAULT_PASSWORD = process.env.DEFAULT_TEMP_PASSWORD || 'Welcome@IBM2026!';

async function provisionAccounts() {
  console.log('Fetching employees from Firestore masterlist...\n');
  const snap = await db.collection('masterlist').get();

  if (snap.empty) {
    console.log('No records found in masterlist.');
    return;
  }

  let created = 0;
  let existing = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const emp = doc.data();
    const email = (emp.email || '').trim().toLowerCase();
    const name = emp.name || '';
    const serial = emp.ibmSerialNo || '';

    if (!email || !email.includes('@')) {
      console.log(`[SKIP] Serial ${serial || 'N/A'} has no valid email.`);
      skipped++;
      continue;
    }

    let userRecord;
    try {
      // Check if auth account already exists
      userRecord = await auth.getUserByEmail(email);
      existing++;
      console.log(`[EXISTS] ${email} (UID: ${userRecord.uid})`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Create new Auth account with temporary password
        userRecord = await auth.createUser({
          email: email,
          password: DEFAULT_PASSWORD,
          displayName: name,
          emailVerified: true
        });
        created++;
        console.log(`[CREATED] ${email} (Temp Password: "${DEFAULT_PASSWORD}")`);
      } else {
        console.error(`[ERROR] Failed checking auth for ${email}:`, err.message);
        continue;
      }
    }

    // Ensure Firestore users/{uid} document exists with talentId and mustChangePassword
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      name: name,
      talentId: serial,
      ibmSerialNo: serial,
      role: emp.role || 'user',
      mustChangePassword: created > 0, // Force password change on first login if newly created
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(`Summary: ${created} created, ${existing} already existed, ${skipped} skipped.`);
  console.log(`Default temporary password for new accounts: "${DEFAULT_PASSWORD}"`);
  console.log('──────────────────────────────────────────────\n');
}

provisionAccounts().catch(err => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
