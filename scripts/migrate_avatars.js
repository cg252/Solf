/*
Migration script: migrate_avatars.js

Purpose:
- Scans Firestore for profile meta docs (`artifacts/{appId}/users/{uid}/profile/meta`) that have an `avatarUrl`.
- For each avatar value that is not a direct download URL, attempts to resolve it to a download/signed URL and (optionally) writes the updated URL back to Firestore.

Usage:
1) Install prerequisites (use a machine with service account credentials):
   npm install --save firebase-admin @google-cloud/storage

2) Ensure you have a service account JSON and set:
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json

3) Dry-run (recommended):
   node scripts/migrate_avatars.js --bucket=solf-81883.firebasestorage.app

4) Apply changes (updates Firestore):
   node scripts/migrate_avatars.js --bucket=solf-81883.firebasestorage.app --apply

Notes:
- The script prefers generating a signed URL for existing objects in the Storage bucket. This avoids CORS and public URL issues.
- Signed URLs expire; adjust `expiresMs` if you need longer/shorter validity.
*/

const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const { URL } = require('url');

const argv = require('minimist')(process.argv.slice(2));
const BUCKET = argv.bucket || process.env.MIGRATE_BUCKET || process.env.BUCKET_NAME;
const APPLY = !!argv.apply;
const EXPIRES_MS = argv.expiresMs ? parseInt(argv.expiresMs, 10) : 10 * 365 * 24 * 60 * 60 * 1000; // 10 years

if (!BUCKET) {
  console.error('Bucket name is required. Set --bucket=<bucket> or MIGRATE_BUCKET env var. Example: solf-81883.firebasestorage.app');
  process.exit(1);
}

// Initialize admin SDK (expects GOOGLE_APPLICATION_CREDENTIALS env var to point to service account)
admin.initializeApp();
const db = admin.firestore();
const storage = new Storage();

async function resolveToSignedUrl(avatar) {
  if (!avatar) return null;

  // If it looks like a download URL already (contains alt=media or is a googleapis link with token), return as-is
  if (/firebasestorage\.googleapis\.com\/v0\//.test(avatar) && /alt=media/.test(avatar)) {
    return avatar; // likely already a direct download URL
  }

  // If it's a metadata endpoint with name=..., extract
  try {
    const u = new URL(avatar);
    const nameParam = u.searchParams.get('name');
    if (nameParam) {
      const path = decodeURIComponent(nameParam);
      const file = storage.bucket(BUCKET).file(path);
      const [exists] = await file.exists();
      if (!exists) throw new Error('file-not-found');
      const [signed] = await file.getSignedUrl({ action: 'read', expires: Date.now() + EXPIRES_MS });
      return signed;
    }
  } catch (e) {
    // Not a URL or failed parsing -> continue
  }

  // If it looks like a storage path (no protocol, contains '/'), attempt to locate in bucket
  if (!/^https?:\/\//i.test(avatar)) {
    const file = storage.bucket(BUCKET).file(avatar);
    const [exists] = await file.exists();
    if (!exists) throw new Error('file-not-found');
    const [signed] = await file.getSignedUrl({ action: 'read', expires: Date.now() + EXPIRES_MS });
    return signed;
  }

  // Otherwise, return original avatar (external URL) - we could optionally fetch-and-upload but skip for now
  return avatar;
}

async function migrate() {
  console.log('Starting avatar migration (dry-run=%s) for bucket=%s', !APPLY ? 'true' : 'false', BUCKET);

  // Query for profile meta docs that have avatarUrl (using collectionGroup is easiest)
  // Note: collectionGroup queries require appropriate indexing if you add complex filters.
  const snapshot = await db.collectionGroup('meta').where('avatarUrl', '!=', null).get();
  console.log('Found %d profile meta docs with avatarUrl', snapshot.size);

  let updated = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const avatar = data.avatarUrl;
    try {
      const resolved = await resolveToSignedUrl(avatar);
      if (!resolved) {
        console.warn('Could not resolve avatar for', docSnap.ref.path, 'original=', avatar);
        continue;
      }
      if (resolved === avatar) {
        console.log('No change for', docSnap.ref.path);
      } else {
        console.log('Would update', docSnap.ref.path, '=>', resolved);
        if (APPLY) {
          await docSnap.ref.set({ avatarUrl: resolved }, { merge: true });
          console.log('Updated', docSnap.ref.path);
          updated++;
        }
      }
    } catch (err) {
      console.error('Error processing', docSnap.ref.path, err.message || err);
    }
  }

  console.log('Done. Updated %d docs (apply=%s)', updated, APPLY);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
