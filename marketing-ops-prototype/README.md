# Marketing Ops - Prototype

A modern, fully-functional prototype of the Marketing Operations Dashboard with mock data and LocalStorage persistence. Perfect for pitching, demos, and showcasing features.

## Features

- ✅ **5 Role-Based Dashboards** (Manager, Lead, Photographer, Editor, Content Creator)
- ✅ **Task Management** - Kanban board with task assignment and tracking
- ✅ **Shoot Management** - Schedule and track photography shoots
- ✅ **Attendance Tracking** - Clock in/out with time tracking
- ✅ **Content Calendar** - Monthly view of publishing schedule
- ✅ **Client Management** - View and manage client relationships
- ✅ **Leave Management** - Request and approve leave
- ✅ **Team Feed** - Activity feed and comments
- ✅ **Active Work Tracking** - Real-time view of active shoots and tasks
- ✅ **User Management** - Create and manage users (Manager only)
- ✅ **Mock Data Service** - LocalStorage-based persistence
- ✅ **Modern UI** - Fresh, clean design with Tailwind CSS

## Quick Start

### Installation

```bash
cd marketing-ops-prototype
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5174`

### Build for Production

```bash
npm run build
```

## Demo Accounts

All accounts use password: `demo123`

- **Manager**: manager@demo.com
- **Lead**: lead@demo.com
- **Photographer**: photographer@demo.com
- **Editor**: editor@demo.com
- **Content Creator**: creator@demo.com

## Project Structure

```
src/
  components/       # Reusable components (Toast, DashboardLayout)
  contexts/        # React contexts (Auth, Data)
  pages/          # Page components
    dashboard/     # Role-specific dashboards
  services/        # Mock data service with LocalStorage
  constants.js     # App constants and enums
```

## Data Persistence

All data is stored in browser LocalStorage. Data persists across sessions but is isolated per browser/domain.

### Collections

- Users
- Clients
- Shoots
- Assets
- Attendance
- Photographer_Attendance
- Editor_Time_Logs
- Time_Breaks
- Content_Calendar
- Leave_Requests
- Asset_Comments

## Features by Role

### Manager
- Full system access
- User management
- View all clients, shoots, tasks
- Approve leave requests
- View active work

### Lead
- Team oversight
- Assign tasks and shoots
- Approve leave requests
- Clock in/out
- View active work

### Photographer
- View assigned shoots
- Start/end shoots
- Clock in/out
- Track attendance

### Editor
- View assigned tasks
- Start/finish editing
- Update progress
- Clock in/out

### Content Creator
- View assigned tasks
- Content calendar
- Clock in/out

## Technology Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Lucide React** - Icons
- **date-fns** - Date utilities
- **LocalStorage** - Data persistence

## Development

### Port Configuration

The app runs on port **5174** by default (configured in `vite.config.js`). This ensures it doesn't conflict with the main marketing-ops app running on port 5173.

### Mock Data

Initial mock data is automatically created on first load. You can reset all data by calling `mockDataService.reset()` in the browser console.

## Notes

- This is a **prototype/demo** version with mock data
- No backend or database required
- All data persists in browser LocalStorage
- Perfect for pitching and demonstrations
- Does not interfere with the main marketing-ops application

## License

MIT

