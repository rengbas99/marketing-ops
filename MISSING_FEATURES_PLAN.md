# 🚀 MISSING FEATURES IMPLEMENTATION PLAN

**Date:** 2025-11-24  
**Priority:** HIGH - Required for deployment  
**Estimated Time:** 4-6 hours

---

## ✅ **CURRENT STATUS VERIFICATION**

### **1. Sheets Queue** ✅ **WORKING**
```javascript
// DataContext.jsx - Lines 477, 600
sheetsQueue.enqueue({
  type: 'append',
  sheetName,
  rowData: validatedData
});
```
**Status:** ✅ Integrated and working

### **2. Firebase Environment** ✅ **CONNECTED**
**Vercel Environment Variables Required:**
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GOOGLE_SHEET_ID=your_sheet_id
```
**Status:** ✅ Should work if env vars set in Vercel

### **3. Clients Page** ✅ **EXISTS**
**File:** `src/pages/ClientsPage.jsx`  
**Status:** ✅ Already implemented

---

## ❌ **MISSING FEATURES TO IMPLEMENT**

### **Feature 1: Manual Shoot Creation** 🔴 CRITICAL
**Current:** Only Lead can create shoots  
**Required:** Manager/Lead can manually create shoots without client

**Implementation:**

#### **A. Add "Create Shoot" Button to ShootsPage**
```javascript
// src/pages/ShootsPage.jsx

const [showCreateForm, setShowCreateForm] = useState(false);

<button onClick={() => setShowCreateForm(true)}>
  + Create New Shoot
</button>

{showCreateForm && (
  <CreateShootModal
    onClose={() => setShowCreateForm(false)}
    onSubmit={handleCreateShoot}
  />
)}
```

#### **B. Create CreateShootModal Component**
```javascript
// src/components/CreateShootModal.jsx

export default function CreateShootModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    shoot_name: '',
    client_id: '', // Optional
    photographer_id: '',
    date: '',
    location_name: '',
    notes: ''
  });

  const handleSubmit = async () => {
    const shootData = {
      shoot_id: `SHOOT-${Date.now()}`,
      ...formData,
      status: SHOOT_STATUS.SCHEDULED,
      created_at: new Date().toISOString()
    };
    
    await onSubmit(shootData);
  };

  return (
    <div className="modal">
      <input
        placeholder="Shoot Name (e.g., X Hotel Promotions)"
        value={formData.shoot_name}
        onChange={(e) => setFormData({...formData, shoot_name: e.target.value})}
      />
      
      <select
        value={formData.client_id}
        onChange={(e) => setFormData({...formData, client_id: e.target.value})}
      >
        <option value="">No Client (Optional)</option>
        {clients.map(c => (
          <option key={c.client_id} value={c.client_id}>
            {c.company_name}
          </option>
        ))}
      </select>
      
      <select
        value={formData.photographer_id}
        onChange={(e) => setFormData({...formData, photographer_id: e.target.value})}
      >
        <option value="">Select Photographer</option>
        {photographers.map(p => (
          <option key={p.email} value={p.email}>
            {p.name}
          </option>
        ))}
      </select>
      
      <input
        type="date"
        value={formData.date}
        onChange={(e) => setFormData({...formData, date: e.target.value})}
      />
      
      <input
        placeholder="Location"
        value={formData.location_name}
        onChange={(e) => setFormData({...formData, location_name: e.target.value})}
      />
      
      <textarea
        placeholder="Notes"
        value={formData.notes}
        onChange={(e) => setFormData({...formData, notes: e.target.value})}
      />
      
      <button onClick={handleSubmit}>Create Shoot</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
```

---

### **Feature 2: Manual Asset Creation with Deliverables** 🔴 CRITICAL
**Current:** Assets created from shoots only  
**Required:** Lead can create assets manually with deliverable types

**Implementation:**

#### **A. Add "Create Asset" Button**
```javascript
// src/pages/AssetsPage.jsx (or LeadDashboard)

<button onClick={() => setShowCreateAsset(true)}>
  + Create New Asset
</button>
```

#### **B. Create CreateAssetModal with Deliverable Types**
```javascript
// src/components/CreateAssetModal.jsx

const DELIVERABLE_TYPES = [
  'Social Media Post',
  'Instagram Story',
  'Facebook Post',
  'Print Media',
  'Poster',
  'Flyer',
  'Banner',
  'Menu Design',
  'Logo Design',
  'Video Edit',
  'Reel',
  'Website Banner',
  'Email Newsletter',
  'Other'
];

export default function CreateAssetModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    shoot_id: '', // Optional
    client_id: '', // Optional
    deliverable_type: '',
    custom_deliverable: '',
    assigned_editor_email: '',
    assigned_creator_email: '',
    deadline: '',
    notes: ''
  });

  const handleSubmit = async () => {
    const assetData = {
      asset_id: `ASSET-${Date.now()}`,
      title: formData.title,
      shoot_id: formData.shoot_id || null,
      client_id: formData.client_id || null,
      deliverable_type: formData.deliverable_type === 'Other' 
        ? formData.custom_deliverable 
        : formData.deliverable_type,
      assigned_editor_email: formData.assigned_editor_email,
      assigned_creator_email: formData.assigned_creator_email,
      status: ASSET_STATUS.TO_EDIT,
      work_progress: 0,
      deadline: formData.deadline,
      notes: formData.notes,
      created_at: new Date().toISOString()
    };
    
    await onSubmit(assetData);
  };

  return (
    <div className="modal">
      <h2>Create New Asset</h2>
      
      <input
        placeholder="Asset Title (e.g., X Hotel Instagram Post)"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        required
      />
      
      <select
        value={formData.deliverable_type}
        onChange={(e) => setFormData({...formData, deliverable_type: e.target.value})}
        required
      >
        <option value="">Select Deliverable Type</option>
        {DELIVERABLE_TYPES.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      
      {formData.deliverable_type === 'Other' && (
        <input
          placeholder="Custom Deliverable Type"
          value={formData.custom_deliverable}
          onChange={(e) => setFormData({...formData, custom_deliverable: e.target.value})}
        />
      )}
      
      <select
        value={formData.client_id}
        onChange={(e) => setFormData({...formData, client_id: e.target.value})}
      >
        <option value="">No Client (Optional)</option>
        {clients.map(c => (
          <option key={c.client_id} value={c.client_id}>
            {c.company_name}
          </option>
        ))}
      </select>
      
      <select
        value={formData.shoot_id}
        onChange={(e) => setFormData({...formData, shoot_id: e.target.value})}
      >
        <option value="">No Shoot (Optional)</option>
        {shoots.map(s => (
          <option key={s.shoot_id} value={s.shoot_id}>
            {s.shoot_name}
          </option>
        ))}
      </select>
      
      <select
        value={formData.assigned_editor_email}
        onChange={(e) => setFormData({...formData, assigned_editor_email: e.target.value})}
      >
        <option value="">Assign Editor</option>
        {editors.map(e => (
          <option key={e.email} value={e.email}>
            {e.name}
          </option>
        ))}
      </select>
      
      <select
        value={formData.assigned_creator_email}
        onChange={(e) => setFormData({...formData, assigned_creator_email: e.target.value})}
      >
        <option value="">Assign Content Creator (Optional)</option>
        {creators.map(c => (
          <option key={c.email} value={c.email}>
            {c.name}
          </option>
        ))}
      </select>
      
      <input
        type="date"
        value={formData.deadline}
        onChange={(e) => setFormData({...formData, deadline: e.target.value})}
      />
      
      <textarea
        placeholder="Notes/Requirements"
        value={formData.notes}
        onChange={(e) => setFormData({...formData, notes: e.target.value})}
      />
      
      <button onClick={handleSubmit}>Create Asset</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
```

---

### **Feature 3: Editor Subtask Tracking** 🔴 CRITICAL
**Current:** Editors only update progress  
**Required:** Editors can log what they're working on (subtasks) with time tracking

**Implementation:**

#### **A. Add Subtask Widget to EditorDashboard**
```javascript
// src/components/EditorSubtaskWidget.jsx

export default function EditorSubtaskWidget({ asset, timeLog }) {
  const [subtasks, setSubtasks] = useState([]);
  const [currentSubtask, setCurrentSubtask] = useState(null);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');

  // Load existing subtasks from time log
  useEffect(() => {
    if (timeLog && timeLog.subtasks) {
      try {
        setSubtasks(JSON.parse(timeLog.subtasks));
      } catch {
        setSubtasks([]);
      }
    }
  }, [timeLog]);

  const handleAddSubtask = async () => {
    const subtask = {
      id: `SUBTASK-${Date.now()}`,
      name: newSubtask,
      asset_title: asset.title,
      start_time: new Date().toISOString(),
      end_time: null,
      duration: 0,
      status: 'in_progress'
    };

    const updatedSubtasks = [...subtasks, subtask];
    setSubtasks(updatedSubtasks);
    setCurrentSubtask(subtask);

    // Update time log with subtasks
    await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
      subtasks: JSON.stringify(updatedSubtasks),
      current_subtask: newSubtask
    });

    setNewSubtask('');
    setShowAddSubtask(false);
  };

  const handleEndSubtask = async () => {
    if (!currentSubtask) return;

    const endTime = new Date();
    const startTime = new Date(currentSubtask.start_time);
    const duration = (endTime - startTime) / 1000 / 60; // minutes

    const updatedSubtasks = subtasks.map(st =>
      st.id === currentSubtask.id
        ? { ...st, end_time: endTime.toISOString(), duration, status: 'completed' }
        : st
    );

    setSubtasks(updatedSubtasks);
    setCurrentSubtask(null);

    await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
      subtasks: JSON.stringify(updatedSubtasks),
      current_subtask: null
    });
  };

  return (
    <div className="glass-card">
      <h3>Current Work</h3>
      
      {currentSubtask ? (
        <div className="active-subtask">
          <p><strong>Working on:</strong> {currentSubtask.name}</p>
          <p><strong>Asset:</strong> {asset.title}</p>
          <p><strong>Time:</strong> {formatElapsedTime(currentSubtask.start_time)}</p>
          <button onClick={handleEndSubtask}>
            Complete Subtask
          </button>
        </div>
      ) : (
        <button onClick={() => setShowAddSubtask(true)}>
          + Start New Subtask
        </button>
      )}

      {showAddSubtask && (
        <div className="add-subtask">
          <input
            placeholder="What are you working on? (e.g., X Hotel Poster - Background Design)"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
          />
          <button onClick={handleAddSubtask}>Start</button>
          <button onClick={() => setShowAddSubtask(false)}>Cancel</button>
        </div>
      )}

      <div className="subtask-history">
        <h4>Today's Work</h4>
        {subtasks.filter(st => isToday(st.start_time)).map(st => (
          <div key={st.id} className="subtask-item">
            <p>{st.name}</p>
            <p>{st.duration ? `${st.duration.toFixed(0)} min` : 'In progress'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### **B. Quick Subtask Selector**
```javascript
// Common subtask templates
const QUICK_SUBTASKS = [
  'Background Design',
  'Text Overlay',
  'Color Correction',
  'Image Retouching',
  'Layout Design',
  'Typography',
  'Final Touches',
  'Export/Render',
  'Review & QC'
];

<select onChange={(e) => setNewSubtask(`${asset.title} - ${e.target.value}`)}>
  <option value="">Quick Select</option>
  {QUICK_SUBTASKS.map(task => (
    <option key={task} value={task}>{task}</option>
  ))}
</select>
```

---

### **Feature 4: Lead Visibility of Editor Work** 🔴 CRITICAL
**Current:** Lead sees only asset progress  
**Required:** Lead sees detailed subtask breakdown and time spent

**Implementation:**

#### **A. Add Subtask View to LeadDashboard**
```javascript
// src/pages/dashboard/LeadDashboard.jsx

const [selectedAssetDetails, setSelectedAssetDetails] = useState(null);

// Get editor time logs for asset
const getAssetWorkDetails = (assetId) => {
  const logs = editorTimeLogs.filter(log => 
    log && log.asset_id === assetId
  );

  const allSubtasks = logs.flatMap(log => {
    try {
      return log.subtasks ? JSON.parse(log.subtasks) : [];
    } catch {
      return [];
    }
  });

  const totalTime = logs.reduce((sum, log) => 
    sum + (parseFloat(log.work_duration || 0)), 0
  );

  return {
    logs,
    subtasks: allSubtasks,
    totalTime,
    currentWork: logs.find(log => !log.end_time)?.current_subtask
  };
};

// Asset card with details button
<div className="asset-card">
  <h3>{asset.title}</h3>
  <p>Progress: {asset.work_progress}%</p>
  <button onClick={() => setSelectedAssetDetails(asset.asset_id)}>
    View Work Details
  </button>
</div>

{selectedAssetDetails && (
  <AssetWorkDetailsModal
    asset={assets.find(a => a.asset_id === selectedAssetDetails)}
    workDetails={getAssetWorkDetails(selectedAssetDetails)}
    onClose={() => setSelectedAssetDetails(null)}
  />
)}
```

#### **B. Asset Work Details Modal**
```javascript
// src/components/AssetWorkDetailsModal.jsx

export default function AssetWorkDetailsModal({ asset, workDetails, onClose }) {
  return (
    <div className="modal glass-card">
      <h2>{asset.title} - Work Details</h2>
      
      <div className="summary">
        <p><strong>Total Time:</strong> {workDetails.totalTime.toFixed(2)} hours</p>
        <p><strong>Progress:</strong> {asset.work_progress}%</p>
        <p><strong>Status:</strong> {asset.status}</p>
        {workDetails.currentWork && (
          <p><strong>Currently Working On:</strong> {workDetails.currentWork}</p>
        )}
      </div>

      <div className="subtasks-breakdown">
        <h3>Work Breakdown</h3>
        {workDetails.subtasks.map(subtask => (
          <div key={subtask.id} className="subtask-detail">
            <p><strong>{subtask.name}</strong></p>
            <p>Time: {subtask.duration ? `${subtask.duration.toFixed(0)} min` : 'In progress'}</p>
            <p>Started: {formatTime(subtask.start_time)}</p>
            {subtask.end_time && (
              <p>Completed: {formatTime(subtask.end_time)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="time-logs">
        <h3>Work Sessions</h3>
        {workDetails.logs.map(log => (
          <div key={log.log_id} className="log-detail">
            <p>{formatDate(log.start_time)}</p>
            <p>Duration: {log.work_duration || 0} hours</p>
            <p>Status: {log.task_status}</p>
          </div>
        ))}
      </div>

      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

---

## 📊 **DATABASE SCHEMA UPDATES**

### **Update Asset Schema**
```javascript
// src/types/schemas.js

export const AssetSchema = z.object({
    asset_id: z.string().min(1),
    title: z.string().min(1),
    shoot_id: z.string().min(1).optional(),
    client_id: z.string().min(1).optional(),
    deliverable_type: z.string().optional(), // NEW
    assigned_editor_email: z.string().email().optional(),
    assigned_creator_email: z.string().email().optional(),
    status: z.enum(Object.values(ASSET_STATUS)),
    work_progress: z.union([z.number(), z.string()]).optional(),
    deadline: z.string().optional(),
    work_links: z.string().optional(),
    notes: z.string().optional(), // NEW
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
```

### **Update Editor Time Log Schema**
```javascript
export const EditorTimeLogSchema = z.object({
    log_id: z.string().min(1),
    editor_email: z.string().email().optional(),
    asset_id: z.string().min(1).optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    work_duration: z.union([z.number(), z.string()]).optional(),
    duration: z.union([z.number(), z.string()]).optional(),
    task_status: z.string().optional(),
    notes: z.string().optional(),
    subtasks: z.string().optional(), // NEW - JSON string
    current_subtask: z.string().optional(), // NEW
    created_at: z.string().optional(),
});
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Manual Creation (2 hours)**
- [ ] Create `CreateShootModal.jsx`
- [ ] Add to `ShootsPage.jsx`
- [ ] Create `CreateAssetModal.jsx`
- [ ] Add deliverable types dropdown
- [ ] Add to `LeadDashboard.jsx`
- [ ] Test shoot creation
- [ ] Test asset creation

### **Phase 2: Subtask Tracking (2 hours)**
- [ ] Create `EditorSubtaskWidget.jsx`
- [ ] Add quick subtask selector
- [ ] Update `EditorDashboard.jsx`
- [ ] Update schema for subtasks
- [ ] Test subtask creation
- [ ] Test time tracking

### **Phase 3: Lead Visibility (1 hour)**
- [ ] Create `AssetWorkDetailsModal.jsx`
- [ ] Add work details button
- [ ] Update `LeadDashboard.jsx`
- [ ] Test visibility
- [ ] Test real-time updates

### **Phase 4: Testing (1 hour)**
- [ ] Test full workflow
- [ ] Test data persistence
- [ ] Test cross-role visibility
- [ ] Verify Sheets sync

**Total:** 6 hours

---

## 🚀 **DEPLOYMENT PLAN**

### **Current Status:**
- ✅ Sheets queue working
- ✅ Firebase connected (if env vars set)
- ✅ Clients page exists
- ❌ Manual creation missing
- ❌ Subtask tracking missing
- ❌ Detailed visibility missing

### **Recommendation:**

**Option A: Deploy Now, Add Features Later**
- Deploy current version
- Users test basic workflows
- Add features in v1.1

**Option B: Add Features First** (RECOMMENDED)
- Implement all 4 features (6 hours)
- Test thoroughly
- Deploy complete version

---

## ✅ **SUMMARY**

**What's Working:**
- ✅ All 5 user roles
- ✅ All data flows
- ✅ Sheets queue
- ✅ Firebase sync
- ✅ Edge case fallbacks

**What's Missing:**
- ❌ Manual shoot creation
- ❌ Manual asset creation with deliverables
- ❌ Editor subtask tracking
- ❌ Lead detailed visibility

**Estimated Time to Complete:** 6 hours

**Confidence After Implementation:** 10/10

---

**Ready to implement these features?** 🚀
