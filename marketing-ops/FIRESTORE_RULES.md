# Firestore Security Rules Setup

## Issue

The migration script is getting "permission-denied" errors when checking if collections have data. This is because Firestore security rules need to be configured.

## Quick Fix (Development/Testing)

For migration and initial setup, you can temporarily use these permissive rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `reformapp-marketing-ops`
3. Navigate to **Firestore Database** → **Rules**
4. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents (for migration)
    // TODO: Restrict these rules for production
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

5. Click **Publish**

## Production Rules (After Migration)

Once migration is complete, update rules to be more secure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - read only for authenticated users
    match /Users/{userId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can write (set up admin auth later)
    }
    
    // Other collections - authenticated users can read/write
    match /{collection}/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## After Setting Rules

1. Wait a few seconds for rules to propagate
2. Re-run migration: `npm run migrate`

## Note

The migration script will work even with permission errors - it will just skip the "check if data exists" step and proceed with migration.

