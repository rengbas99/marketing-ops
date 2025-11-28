# Migration Scripts

## migrate-to-firebase.js

Migrates all data from Google Sheets to Firebase Firestore.

### Prerequisites

1. Firebase project set up with Firestore enabled
2. Firebase environment variables in `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

3. Google Sheets credentials in `.env`:
   - `VITE_GOOGLE_SHEET_ID`
   - `VITE_GOOGLE_API_KEY`

### Usage

**Dry run (test without writing data):**
```bash
npm run migrate:dry-run
```

**Actual migration:**
```bash
npm run migrate
```

### What it does

1. Reads all data from each Google Sheet
2. Converts rows to Firestore documents
3. Preserves all field names and values
4. Adds migration metadata (migrated_at timestamp)
5. Skips collections that already have data (to avoid duplicates)

### Collections Migrated

- Users
- Clients
- Shoots
- Assets
- Photographer_Attendance
- Editor_Time_Logs
- Time_Breaks
- Content_Calendar
- Asset_Comments
- Leave_Requests
- Attendance
- Monthly_Hours

### Safety Features

- **Dry run mode**: Test migration without writing data
- **Duplicate prevention**: Skips collections that already have data
- **Batch processing**: Handles large datasets efficiently
- **Error handling**: Continues even if some collections fail
- **Progress tracking**: Shows real-time migration progress

### Notes

- The script uses the same credentials as your app
- It preserves all data structure exactly as in Google Sheets
- Firestore will auto-generate document IDs (original row IDs are preserved in data)
- If a collection already has data, it will be skipped to prevent duplicates

