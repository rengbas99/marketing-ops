# Data Migration Guide: Google Sheets → Firebase

## Overview

This guide explains how to migrate all your existing Google Sheets data to Firebase Firestore before deploying the updated app.

## Why Migration is Needed

The app now uses Firebase for real-time updates. When Firebase is connected:
- **Reads**: Come from Firebase (if empty, app shows no data)
- **Writes**: Go to Firebase (new data is saved there)

If you deploy without migrating, users will see empty data because Firebase collections are empty.

## Prerequisites

✅ Firebase project created and Firestore enabled  
✅ Firebase environment variables set in Vercel  
✅ Google Sheets API key and Sheet ID available  
✅ All fixes and updates are in the codebase  

## Step-by-Step Migration

### 1. Verify Firebase Configuration

Check that your Firebase environment variables are set in Vercel:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 2. Set Up Local Environment (for running migration script)

Create a `.env` file in `marketing-ops/` directory with:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Google Sheets Configuration
VITE_GOOGLE_SHEET_ID=your_google_sheet_id
VITE_GOOGLE_API_KEY=your_google_api_key
```

### 3. Test Migration (Dry Run)

Run a dry run to see what will be migrated without actually writing data:

```bash
cd marketing-ops
npm run migrate:dry-run
```

This will:
- Show which collections will be migrated
- Display how many documents will be created
- Verify connectivity to both Google Sheets and Firebase
- **Not write any data** (safe to run)

### 4. Run Actual Migration

Once you're satisfied with the dry run:

```bash
npm run migrate
```

This will:
- Read all data from Google Sheets
- Write to Firebase Firestore
- Preserve all data structure
- Show progress for each collection
- Skip collections that already have data (prevents duplicates)

### 5. Verify Migration

After migration completes:

1. **Check Firebase Console**:
   - Go to Firebase Console → Firestore Database
   - Verify all collections exist
   - Check that documents have data

2. **Test the App**:
   - Deploy to Vercel (or run locally)
   - Login and verify you see all your data
   - Check that new writes work correctly

## What Gets Migrated

All 12 collections:
- ✅ Users (login credentials preserved)
- ✅ Clients
- ✅ Shoots
- ✅ Assets
- ✅ Photographer_Attendance
- ✅ Editor_Time_Logs
- ✅ Time_Breaks
- ✅ Content_Calendar
- ✅ Asset_Comments
- ✅ Leave_Requests
- ✅ Attendance
- ✅ Monthly_Hours

## Data Preservation

- **All fields preserved**: Every column from Google Sheets becomes a field in Firestore
- **Data types maintained**: Strings, numbers, dates all preserved
- **Relationships intact**: IDs and references between collections maintained
- **Timestamps added**: `migrated_at` timestamp added to track migration

## Troubleshooting

### "Collection already has data"
- The script skips collections that already have data to prevent duplicates
- To re-migrate: Delete the collection in Firebase Console first

### "Sheet not found"
- Some sheets might not exist in your Google Spreadsheet
- This is OK - the script will skip them and continue

### "Firebase not initialized"
- Check your Firebase environment variables
- Verify Firestore is enabled in Firebase Console

### "Google Sheets API error"
- Verify your API key and Sheet ID
- Check that the Google Sheet is accessible
- Ensure API key has Sheets API enabled

## After Migration

1. **Deploy to Vercel**: Push your code changes
2. **Verify in Production**: Test that data appears correctly
3. **Monitor**: Watch for any issues with real-time updates

## Rollback Plan

If something goes wrong:
1. Firebase data can be deleted from Firebase Console
2. Google Sheets data remains untouched (read-only during migration)
3. Re-run migration after fixing issues

## Support

If you encounter issues:
1. Check the migration script output for specific errors
2. Verify all environment variables are correct
3. Ensure Firebase Firestore is enabled and accessible

