# Marketing Ops - Project Architecture & Firebase Integration

## 📋 Project Overview

**Marketing Ops** is a React-based operations management system for managing shoots, assets, attendance, tasks, and team workflows. It uses a **hybrid data architecture** with Firebase Firestore as the primary database and Google Sheets as a backup/fallback system.

---

## 🏗️ Architecture Overview

### **Dual Database System**

The application uses a **smart dual-database architecture**:

1. **Firebase Firestore** (Primary) - Real-time database with instant updates
2. **Google Sheets** (Backup/Fallback) - Legacy system, async backup writes

### **Data Flow Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action (Add/Update/Delete)            │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   DataContext (Validation)    │
        │   - Zod Schema Validation     │
        │   - Optimistic UI Updates     │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│   Firebase    │              │ Google Sheets │
│  (PRIMARY)    │              │   (BACKUP)    │
│               │              │               │
│ - Immediate   │              │ - Queued      │
│ - Real-time   │              │ - 5s delay    │
│ - Instant UI  │              │ - Async       │
│   updates     │              │ - Retry logic │
└───────────────┘              └───────────────┘
```

---

## 🔥 Firebase Integration

### **1. Firebase Configuration**

Firebase is configured via environment variables:

```javascript
// firebaseService.js
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
```

**Location**: `src/services/firebaseService.js`

### **2. Firebase Collections**

The app uses these Firestore collections (matching Google Sheets names):

```javascript
// constants.js
COLLECTIONS = {
  USERS: 'Users',
  SHOOTS: 'Shoots',
  ASSETS: 'Assets',
  CLIENTS: 'Clients',
  ATTENDANCE: 'Attendance',
  PHOTOGRAPHER_ATTENDANCE: 'Photographer_Attendance',
  EDITOR_TIME_LOGS: 'Editor_Time_Logs',
  TIME_BREAKS: 'Time_Breaks',
  LEAVE_REQUESTS: 'Leave_Requests',
  CONTENT_CALENDAR: 'Content_Calendar',
  ASSET_COMMENTS: 'Asset_Comments',
  MONTHLY_HOURS: 'Monthly_Hours',
}
```

### **3. Real-Time Listeners**

Firebase uses **real-time listeners** (`onSnapshot`) for instant updates:

```javascript
// DataContext.jsx - Firebase Mode
subscribeToCollection(collectionName, (collectionData) => {
  setData(prev => ({
    ...prev,
    [collectionName]: Array.isArray(collectionData) ? collectionData : []
  }));
});
```

**Key Features**:
- ✅ Automatic UI updates when data changes
- ✅ No polling needed
- ✅ Instant synchronization across all users
- ✅ Handles timestamp conversion automatically

### **4. Firebase Operations**

#### **Read Operations**
- `subscribeToCollection()` - Real-time listener (primary)
- `getCollection()` - One-time fetch
- `getDocument()` - Single document fetch
- `queryCollection()` - Filtered queries

#### **Write Operations**
- `addDocument()` - Create new document (with `created_at`, `updated_at` timestamps)
- `updateDocument()` - Update existing document (with `updated_at` timestamp)
- `deleteDocument()` - Delete document
- `batchWrite()` - Multiple operations in one transaction

### **5. Data Conversion**

Firebase service handles automatic conversion:

```javascript
// Converts Firestore Timestamps → JavaScript Dates → ISO strings
convertTimestamp(timestamp) {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  // ... handles various timestamp formats
}
```

---

## 📊 Data Synchronization Strategy

### **Write Flow (When Firebase is Available)**

1. **User Action** → Validation (Zod schemas)
2. **Optimistic Update** → UI updates immediately
3. **Firebase Write** → Primary write (immediate)
4. **Queue Sheets Write** → Backup write (5s delay, async)
5. **Firebase Listener** → Confirms update, removes temp ID

### **Write Flow (Fallback to Google Sheets)**

1. **User Action** → Validation
2. **Optimistic Update** → UI updates immediately
3. **Backend API Call** → Direct write to Google Sheets
4. **Force Refresh** → Poll Google Sheets for updated data

### **Read Flow**

#### **Firebase Mode:**
- Real-time listeners active for all collections
- Updates automatically when data changes
- No polling needed

#### **Google Sheets Mode:**
- Smart polling system (15s interval)
- Debounced fetches (300ms)
- Minimum 10s between fetches per sheet
- Page-based polling (only fetches sheets needed by active pages)

---

## 🔄 Google Sheets Integration

### **Purpose**
- **Backup System**: Async writes to Google Sheets (5s delay)
- **Fallback**: Used when Firebase is unavailable
- **Legacy Support**: Maintains compatibility with existing workflows

### **Sheets Queue System**

Located in `src/services/sheetsQueue.js`:

```javascript
// Queues writes with 5s delay
sheetsQueue.enqueue({
  type: 'append' | 'update' | 'delete',
  sheetName: 'CollectionName',
  rowData: {...},
  rowIndex: 2 // for updates
});
```

**Features**:
- Batch processing (5 operations at a time)
- Retry logic (3 attempts with exponential backoff)
- Error logging
- Queue status monitoring

### **Backend API Endpoints**

Serverless functions (Vercel) for Google Sheets writes:

- **`/api/write.js`** - Append rows using Service Account
- **`/api/update.js`** - Update rows using Service Account

**Authentication**: Google Service Account (no OAuth needed)

---

## 🔐 Authentication System

### **AuthContext** (`src/contexts/AuthContext.jsx`)

**Login Flow**:
1. Try Firebase first (if available)
2. Fallback to Google Sheets if Firebase fails
3. Validate credentials
4. Store user in localStorage
5. Cross-tab synchronization

**User Storage**:
- localStorage for persistence
- Cross-tab sync via `storage` events
- Same-tab sync via custom `userUpdated` events

**Roles**:
- `manager` - Full access
- `lead` - Team management
- `photographer` - Shoot management
- `editor` - Asset editing
- `content_creator` - Content creation

---

## 📁 Project Structure

```
marketing-ops/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React contexts (Auth, Data)
│   ├── pages/               # Page components
│   │   └── dashboard/       # Role-specific dashboards
│   ├── services/            # API services
│   │   ├── firebaseService.js    # Firebase operations
│   │   ├── sheetsApi.js          # Google Sheets API
│   │   ├── backendApi.js         # Serverless API client
│   │   └── sheetsQueue.js         # Async Sheets queue
│   ├── types/               # Zod schemas & validation
│   ├── utils/               # Utility functions
│   └── constants.js         # App constants
├── api/                     # Serverless functions
│   ├── write.js             # Google Sheets write endpoint
│   └── update.js            # Google Sheets update endpoint
├── scripts/
│   └── migrate-to-firebase.js  # Data migration script
├── firebase.json            # Firebase hosting config
└── vercel.json              # Vercel deployment config
```

---

## 🚀 Key Workflows

### **1. Data Reading**

**Firebase Mode:**
```javascript
// Real-time listener (automatic updates)
subscribeToCollection('Shoots', (data) => {
  // data updates automatically when Firestore changes
});
```

**Google Sheets Mode:**
```javascript
// Polling (15s interval)
dataSync.startPolling('ShootsPage', ['Shoots']);
// Fetches every 15s, debounced
```

### **2. Data Writing**

**Firebase Mode:**
```javascript
// 1. Write to Firebase (immediate)
await addDocument('Shoots', shootData);

// 2. Queue Sheets write (backup, 5s delay)
sheetsQueue.enqueue({
  type: 'append',
  sheetName: 'Shoots',
  rowData: shootData
});
```

**Google Sheets Mode:**
```javascript
// Direct write via backend API
await backendAPI.appendRow('Shoots', shootData);
```

### **3. Data Updates**

**Firebase Mode:**
```javascript
// 1. Update Firebase (immediate)
await updateDocument('Shoots', docId, updateData);

// 2. Queue Sheets update (backup)
sheetsQueue.enqueue({
  type: 'update',
  sheetName: 'Shoots',
  rowIndex: rowIndex,
  rowData: updateData
});
```

### **4. Data Deletion**

**Firebase Mode:**
```javascript
// 1. Delete from Firebase
await deleteDocument('Shoots', docId);

// 2. Queue Sheets delete (backup)
sheetsQueue.enqueue({
  type: 'delete',
  sheetName: 'Shoots',
  rowIndex: rowIndex
});
```

---

## 🔧 Configuration & Environment Variables

### **Required Environment Variables**

#### **Firebase (Primary)**
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### **Google Sheets (Backup/Fallback)**
```env
VITE_GOOGLE_SHEET_ID=your_sheet_id
VITE_GOOGLE_API_KEY=your_api_key
```

#### **Backend API (Vercel)**
```env
SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_SHEET_ID=your_sheet_id
VITE_API_URL=/api  # or your API URL
```

---

## 📦 Data Migration

### **Migration Script**

Located at `scripts/migrate-to-firebase.js`

**Usage:**
```bash
# Dry run (no data written)
npm run migrate:dry-run

# Actual migration
npm run migrate
```

**Process:**
1. Fetches data from Google Sheets
2. Converts to Firestore format
3. Writes in batches (500 docs per batch)
4. Adds metadata (`migrated_at`, `created_at`, `updated_at`)
5. Skips collections that already have data

---

## 🎯 Key Features

### **1. Optimistic Updates**
- UI updates immediately before server confirmation
- Rollback on error
- Temporary IDs for tracking

### **2. Data Validation**
- Zod schemas for all collections
- Type-safe validation
- Error messages for invalid data

### **3. Error Handling**
- Comprehensive error logging
- User-friendly error messages
- Graceful fallbacks

### **4. Real-Time Collaboration**
- Firebase listeners enable real-time updates
- Multiple users see changes instantly
- No page refresh needed

### **5. Offline Support**
- Firebase handles offline writes
- Syncs when connection restored
- Google Sheets fallback for offline scenarios

---

## 🔍 How Firebase is Connected

### **Initialization**

1. **Check Config** → Validates Firebase env vars
2. **Initialize App** → `initializeApp(firebaseConfig)`
3. **Get Firestore** → `getFirestore(app)`
4. **Set Listeners** → Real-time listeners for all collections

### **Connection Points**

1. **DataContext** (`src/contexts/DataContext.jsx`)
   - Determines Firebase vs Sheets mode
   - Sets up listeners/polling
   - Manages data state

2. **Firebase Service** (`src/services/firebaseService.js`)
   - All Firestore operations
   - Timestamp conversion
   - Query building

3. **Auth Context** (`src/contexts/AuthContext.jsx`)
   - User authentication from Firebase/Sheets
   - Session management

4. **Components & Pages**
   - Use `useData()` hook for data access
   - Automatic updates via context

---

## 🛠️ Development Workflow

### **Local Development**

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# With Vercel API (for Sheets writes)
npm run dev:full  # Uses vercel dev
```

### **Deployment**

- **Frontend**: Firebase Hosting (configured in `firebase.json`)
- **API**: Vercel serverless functions (`/api` folder)

### **Build**

```bash
npm run build  # Outputs to /dist
```

---

## 📝 Important Notes

1. **Firebase is Primary**: All writes go to Firebase first
2. **Sheets is Backup**: Async writes with 5s delay
3. **Automatic Fallback**: Falls back to Sheets if Firebase unavailable
4. **Real-Time Updates**: Firebase listeners provide instant updates
5. **Data Validation**: All writes validated with Zod schemas
6. **Optimistic UI**: Updates happen immediately, rollback on error

---

## 🔗 Related Files

- **Firebase Service**: `src/services/firebaseService.js`
- **Data Context**: `src/contexts/DataContext.jsx`
- **Sheets Queue**: `src/services/sheetsQueue.js`
- **Migration Script**: `scripts/migrate-to-firebase.js`
- **Constants**: `src/constants.js`
- **Schemas**: `src/types/schemas.js`

---

## 🎓 Summary

This project uses a **hybrid architecture** where:
- **Firebase Firestore** = Primary database (real-time, instant)
- **Google Sheets** = Backup system (async, delayed writes)
- **Smart Fallback** = Automatically switches based on availability
- **Real-Time Updates** = Firebase listeners for instant synchronization
- **Data Validation** = Zod schemas ensure data integrity
- **Optimistic UI** = Immediate feedback with error rollback

The system is designed for **reliability** (dual storage) and **performance** (real-time updates via Firebase).

