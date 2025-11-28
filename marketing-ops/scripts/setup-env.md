# Setting Up .env File for Migration

## Quick Setup

Your `.env` file is currently empty. You need to add your Firebase and Google Sheets credentials.

## Option 1: Copy from Vercel (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Copy all the `VITE_FIREBASE_*` and `VITE_GOOGLE_*` variables
4. Paste them into `marketing-ops/.env`

## Option 2: Get from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `reformapp-marketing-ops`
3. Click the gear icon → **Project Settings**
4. Scroll to **Your apps** section
5. Click on your web app (or create one if needed)
6. Copy the config values

## Required Variables

Add these to `marketing-ops/.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSyAVWFHpk4wGotAd6gZzbv_oMQ6Xdbdd9a4
VITE_FIREBASE_AUTH_DOMAIN=reformapp-marketing-ops.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=reformapp-marketing-ops
VITE_FIREBASE_STORAGE_BUCKET=reformapp-marketing-ops.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=121532186150
VITE_FIREBASE_APP_ID=1:121532186150:web:07a0b118cff147c86bf0e7

VITE_GOOGLE_SHEET_ID=your_google_sheet_id
VITE_GOOGLE_API_KEY=your_google_api_key
```

## After Adding Variables

Run the migration:
```bash
npm run migrate:dry-run  # Test first
npm run migrate          # Actual migration
```

