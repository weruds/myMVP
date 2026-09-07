require('dotenv').config({ path: __dirname + '/.env' });

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const uid = 'TDg3rvs7ZfQTggdBUx4xEGNL1P42';
const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountFile) {
  throw new Error('Missing required scripts/.env value: FIREBASE_SERVICE_ACCOUNT');
}

const serviceAccountPath = path.resolve(__dirname, serviceAccountFile);
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Firebase service-account file not found: ${serviceAccountPath}`);
}

admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });

admin.firestore().collection('users').doc(uid).set({
  talentId: '',
  role: 'admin',
  mustChangePassword: true
}, { merge: true })
  .then(() => console.log('Jas.San.Andres will be required to change their password at next sign-in.'))
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
