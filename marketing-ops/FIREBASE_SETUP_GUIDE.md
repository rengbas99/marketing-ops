# Firebase Setup Guide - Step by Step

 ## ✅ Firestore = Real-Time Database

**Firestore IS a real-time database!** It provides instant updates using `onSnapshot()` listeners, which is exactly what we need for:
- Real-time task updates
- Live clock-in/clock-out status
- Instant break timer sync
- Multi-user collaboration
- No polling needed!

We're using **Firestore** (not the older "Realtime Database") because it's modern, scalable, and perfect for this use case.

## Step 1: Create Firebase Project

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click "Add project" or "Create a project" button
   - Enter project name: `reformapp-marketing-ops` (or any name you prefer)
   - Click "Continue"

3. **Google Analytics (Optional)**
   - You can disable Google Analytics for this project
   - Click "Continue" or "Create project"
   - Wait 30-60 seconds for project creation

4. **Project Created**
   - Click "Continue" when project is ready

---

## Step 2: Enable Firestore Database (Real-Time Database)

**Important:** Firestore IS a real-time database! It supports instant updates via `onSnapshot()` listeners, which is exactly what we need for real-time collaboration.

**Firestore vs Realtime Database:**
- ✅ **Firestore** (what we're using) - Modern, recommended, supports real-time listeners, better queries
- ❌ **Realtime Database** - Older product, also real-time but less flexible

**We're using Firestore because:**
- It provides real-time updates (onSnapshot listeners)
- Better for structured data (collections/documents)
- Better querying and scalability
- This is what your project needs for real-time collaboration

1. **Navigate to Firestore**
   - In Firebase Console, click "Build" in left sidebar
   - Click "Firestore Database"

2. **Create Database**
   - Click "Create database" button
   - Select "Start in production mode" (we'll add rules next)
   - Click "Next"

3. **Choose Location**
   - Select a location closest to your users (e.g., `us-central1` or `us-east1`)
   - Click "Enable"
   - Wait for database creation (30-60 seconds)

---

## Step 3: Set Firestore Security Rules

1. **Go to Rules Tab**
   - In Firestore Database page, click "Rules" tab at the top

2. **Update Rules**
   - Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. **Publish Rules**
   - Click "Publish" button
   - Wait for confirmation

**Note:** For MVP, we're allowing all authenticated users. Later you can add role-based rules.

---

## Step 4: Get Firebase Configuration Keys

1. **Open Project Settings**
   - Click the gear icon (⚙️) next to "Project Overview"
   - Click "Project settings"

2. **Scroll to "Your apps" Section**
   - Scroll down to find "Your apps" section
   - Click the web icon `</>` (or "Add app" → "Web")

3. **Register Web App**
   - App nickname: `Marketing Ops Web`
   - **DO NOT** check "Also set up Firebase Hosting" (we don't need it)
   - Click "Register app"

4. **Copy Configuration**
   - You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

5. **Copy Each Value**
   - Copy each value individually (you'll need them for .env file)
   - Keep this page open, we'll use these values next

---

## Step 5: Add Firebase Config to .env File

**I'll help you create/update the .env file with your Firebase keys.**

Once you have the config values from Step 4, tell me and I'll add them to your .env file.

---

## Step 6: Install Firebase SDK

**I'll run this command for you once .env is set up:**

```bash
cd marketing-ops
npm install firebase
```

---

## What You Need to Do Now:

1. ✅ Complete Steps 1-4 above (in Firebase Console)
2. ✅ Copy your Firebase config values
3. ✅ Tell me when you have the config values
4. ✅ I'll add them to .env and install Firebase package
5. ✅ Then we proceed with all fixes!

---

## Quick Reference - Config Values Needed:

From Firebase Console → Project Settings → Your apps → Web app config:

- `apiKey` → `VITE_FIREBASE_API_KEY`
- `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
- `projectId` → `VITE_FIREBASE_PROJECT_ID`
- `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
- `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `appId` → `VITE_FIREBASE_APP_ID`

---

## Troubleshooting:

**Q: Can't find Firestore Database?**
- Make sure you're in the correct Firebase project
- Look for "Build" in the left sidebar

**Q: Rules won't publish?**
- Check for syntax errors
- Make sure you copied the rules exactly

**Q: Can't find Project Settings?**
- Click the gear icon (⚙️) next to "Project Overview" at the top

---

**Ready? Start with Step 1 and let me know when you have your config values!**

