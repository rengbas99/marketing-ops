# Fixes and Features Implementation Guide

## Critical Fixes Priority

1. ✅ Break functionality for Photographer & Content Creator
2. ✅ Allow editors to clock in without tasks
3. ✅ Fix break button on Lead Dashboard
4. ✅ Fix showRevisionNotes variable
5. ✅ Fix white page on mobile for Content Creator
6. ✅ Fix task updating multiple times
7. ✅ Only show active profiles when clocked in
8. ✅ Add "Add Shoot" and "Assign Task" buttons for Lead/Manager

## New Features

1. ✅ Create "My Work" page for all users (except managers)
2. ✅ Add popup on Work Hours page for managers
3. ✅ Add calendar filter by employees

## Task Management Guide

**Where tasks can be edited/deleted/postponed:**
- **Assign Tasks Page** (`/assign-tasks`): Create new tasks and shoots
- **Calendar Page** (`/calendar`): Edit/delete calendar entries (tasks can be postponed by changing publish_date)
- **Tasks Page** (`/tasks`): For editors - view and work on assigned tasks
- **Shoots Page** (`/shoots`): For photographers - view and work on assigned shoots

**Note:** Currently, there's no direct "edit task" or "delete task" button. Tasks are managed through:
- Calendar page for postponing (change publish date)
- Assign Tasks page for creating new ones
- Tasks/Shoots pages for working on them

