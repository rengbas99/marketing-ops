# Marketing Ops Dashboard

Digital marketing team management application built with React + Vite + Google Sheets API.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Sheets API
4. Create API credentials (API Key)
5. Get your Google Sheet ID from the sheet URL

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_GOOGLE_SHEET_ID=your_spreadsheet_id_here
VITE_GOOGLE_API_KEY=your_api_key_here
```

### 4. Google Sheets Setup

Your Google Sheet should have these tabs:
- Users
- Clients
- Shoots
- Assets
- Photographer_Attendance
- Editor_Time_Logs
- Content_Calendar
- Asset_Comments
- Leave_Requests

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
  components/       # Reusable components
  contexts/        # React contexts (Auth, Data)
  pages/           # Page components
    dashboard/     # Role-specific dashboards
  services/        # API services (Sheets API)
```

## Features

- ✅ Authentication system
- ✅ Role-based routing
- ✅ Google Sheets integration
- ✅ Smart polling for real-time updates
- ✅ 5 role-based dashboards
- ✅ Client management
- ✅ Task management
- ✅ Content calendar
- ✅ Team collaboration

## Next Steps

1. Implement Google OAuth authentication
2. Build out dashboard features
3. Add client management UI
4. Implement task Kanban board
5. Add content calendar with react-big-calendar
6. Build team feed
7. Add leave management
