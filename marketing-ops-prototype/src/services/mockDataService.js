// Mock Data Service with LocalStorage persistence

const STORAGE_KEYS = {
  USERS: 'mock_users',
  CLIENTS: 'mock_clients',
  SHOOTS: 'mock_shoots',
  ASSETS: 'mock_assets',
  ATTENDANCE: 'mock_attendance',
  PHOTOGRAPHER_ATTENDANCE: 'mock_photographer_attendance',
  EDITOR_TIME_LOGS: 'mock_editor_time_logs',
  TIME_BREAKS: 'mock_time_breaks',
  CONTENT_CALENDAR: 'mock_content_calendar',
  LEAVE_REQUESTS: 'mock_leave_requests',
  ASSET_COMMENTS: 'mock_asset_comments',
};

// Initialize mock data
const initializeMockData = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Users
  const users = [
    { email: 'manager@demo.com', name: 'Sarah Johnson', role: 'manager', password: 'demo123', avatar: '', active: true },
    { email: 'lead@demo.com', name: 'Michael Chen', role: 'lead', password: 'demo123', avatar: '', active: true },
    { email: 'photographer@demo.com', name: 'Emma Davis', role: 'photographer', password: 'demo123', avatar: '', active: true },
    { email: 'editor@demo.com', name: 'James Wilson', role: 'editor', password: 'demo123', avatar: '', active: true },
    { email: 'creator@demo.com', name: 'Olivia Brown', role: 'content_creator', password: 'demo123', avatar: '', active: true },
  ];

  // Clients
  const clients = [
    { client_id: 'CLI-001', company_name: 'TechStart Inc', contact_name: 'John Smith', contact_email: 'john@techstart.com', contact_phone: '+1-555-0101', agreement_status: 'Signed', created_at: new Date(2024, 0, 15).toISOString() },
    { client_id: 'CLI-002', company_name: 'Fashion Forward', contact_name: 'Maria Garcia', contact_email: 'maria@fashion.com', contact_phone: '+1-555-0102', agreement_status: 'Signed', created_at: new Date(2024, 1, 10).toISOString() },
    { client_id: 'CLI-003', company_name: 'Green Energy Co', contact_name: 'David Lee', contact_email: 'david@green.com', contact_phone: '+1-555-0103', agreement_status: 'Pending', created_at: new Date(2024, 2, 5).toISOString() },
  ];

  // Shoots
  const shoots = [
    { shoot_id: 'SH-001', title: 'Product Launch Video', shoot_name: 'Product Launch Video', date: today, time: '10:00', location: 'Studio A', client_id: 'CLI-001', photographer_id: 'photographer@demo.com', lead_photographer_email: 'photographer@demo.com', status: 'scheduled', created_at: new Date(2024, 0, 20).toISOString() },
    { shoot_id: 'SH-002', title: 'Fashion Campaign', shoot_name: 'Fashion Campaign', date: today, time: '14:00', location: 'Outdoor Location', client_id: 'CLI-002', photographer_id: 'photographer@demo.com', lead_photographer_email: 'photographer@demo.com', status: 'scheduled', created_at: new Date(2024, 1, 15).toISOString() },
    { shoot_id: 'SH-003', title: 'Corporate Headshots', shoot_name: 'Corporate Headshots', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '09:00', location: 'Office', client_id: 'CLI-003', photographer_id: 'photographer@demo.com', lead_photographer_email: 'photographer@demo.com', status: 'scheduled', created_at: new Date(2024, 2, 1).toISOString() },
  ];

  // Assets
  const assets = [
    { asset_id: 'AST-001', title: 'Product Video Edit', description: 'Main product launch video', shoot_id: 'SH-001', client_id: 'CLI-001', assigned_editor_email: 'editor@demo.com', status: 'In Progress', current_editor_status: 'Working', progress: 65, deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], created_at: new Date(2024, 0, 22).toISOString() },
    { asset_id: 'AST-002', title: 'Fashion Campaign Photos', description: 'Spring collection photos', shoot_id: 'SH-002', client_id: 'CLI-002', assigned_editor_email: 'editor@demo.com', status: 'Review', current_editor_status: 'Completed', progress: 100, deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], created_at: new Date(2024, 1, 16).toISOString() },
    { asset_id: 'AST-003', title: 'Social Media Content', description: 'Instagram posts for campaign', client_id: 'CLI-002', assigned_creator_email: 'creator@demo.com', status: 'To Edit', progress: 0, deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], created_at: new Date(2024, 1, 18).toISOString() },
    { asset_id: 'AST-004', title: 'Website Banner', description: 'Homepage banner design', client_id: 'CLI-001', assigned_creator_email: 'creator@demo.com', status: 'In Progress', progress: 40, deadline: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0], created_at: new Date(2024, 0, 25).toISOString() },
  ];

  // Initialize storage if empty
  Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
    if (!localStorage.getItem(storageKey)) {
      let data = [];
      switch (key) {
        case 'USERS':
          data = users;
          break;
        case 'CLIENTS':
          data = clients;
          break;
        case 'SHOOTS':
          data = shoots;
          break;
        case 'ASSETS':
          data = assets;
          break;
        default:
          data = [];
      }
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  });
};

// Initialize on import
initializeMockData();

// Generic CRUD operations
export const mockDataService = {
  // Get all records
  getAll: (collection) => {
    const key = STORAGE_KEYS[collection.toUpperCase()];
    if (!key) return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  // Get single record by ID
  getById: (collection, id, idField = 'id') => {
    const records = mockDataService.getAll(collection);
    return records.find(r => r[idField] === id || r[`${collection.slice(0, -1)}_id`] === id);
  },

  // Create new record
  create: (collection, data) => {
    const key = STORAGE_KEYS[collection.toUpperCase()];
    if (!key) throw new Error(`Unknown collection: ${collection}`);
    
    const records = mockDataService.getAll(collection);
    const newRecord = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    records.push(newRecord);
    localStorage.setItem(key, JSON.stringify(records));
    return newRecord;
  },

  // Update record
  update: (collection, id, updates, idField = 'id') => {
    const key = STORAGE_KEYS[collection.toUpperCase()];
    if (!key) throw new Error(`Unknown collection: ${collection}`);
    
    const records = mockDataService.getAll(collection);
    const index = records.findIndex(r => r[idField] === id || r[`${collection.slice(0, -1)}_id`] === id);
    
    if (index === -1) throw new Error(`Record not found: ${id}`);
    
    records[index] = {
      ...records[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    localStorage.setItem(key, JSON.stringify(records));
    return records[index];
  },

  // Delete record
  delete: (collection, id, idField = 'id') => {
    const key = STORAGE_KEYS[collection.toUpperCase()];
    if (!key) throw new Error(`Unknown collection: ${collection}`);
    
    const records = mockDataService.getAll(collection);
    const filtered = records.filter(r => r[idField] !== id && r[`${collection.slice(0, -1)}_id`] !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  },

  // Query records
  query: (collection, predicate) => {
    const records = mockDataService.getAll(collection);
    return records.filter(predicate);
  },

  // Reset all data
  reset: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    initializeMockData();
  },
};

// Simulate API delay
export const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

