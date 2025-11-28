# Quick Fix: Firestore Permission Denied

## Problem
Migration is failing with `PERMISSION_DENIED` errors because Firestore security rules are blocking writes.

## Solution: Set Permissive Rules (Temporary)

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select project: **reformapp-marketing-ops**

### Step 2: Navigate to Firestore Rules
1. Click **Firestore Database** in left sidebar
2. Click **Rules** tab at the top

### Step 3: Replace Rules
Copy and paste this into the rules editor:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Temporary permissive rules for migration
    // Allow all reads and writes
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Step 4: Publish
1. Click **Publish** button
2. Wait 10-20 seconds for rules to propagate

### Step 5: Re-run Migration
```bash
npm run migrate
```

## After Migration

Once migration is complete, you should update the rules to be more secure. But for now, these permissive rules will allow the migration to complete.

## Alternative: Use Firebase Admin SDK

If you prefer not to use permissive rules, you can use Firebase Admin SDK for migration (requires service account setup). But the permissive rules approach is simpler for now.

