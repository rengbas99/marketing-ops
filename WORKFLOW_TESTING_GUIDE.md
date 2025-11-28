# 🧪 Workflow Testing Guide - Quick Reference

## How to Test Each Workflow

### **Setup:**
```bash
cd /Users/renganatharaam/reformapp/marketing-ops
npm run dev
```

Open browser: `http://localhost:5173`

---

## 1️⃣ Manager Workflow Test

### **Login:**
- Email: `manager@example.com`
- Password: (your manager password)

### **Test Steps:**
1. ✅ Dashboard loads
2. ✅ See "Pending Approvals" section
3. ✅ Click on pending asset
4. ✅ Click "Approve" → Check status changes to "Completed"
5. ✅ Click on another asset → Click "Request Revision" → Check status changes to "Revision"
6. ✅ Navigate to "Leave Requests" page
7. ✅ Approve a leave request → Check status changes
8. ✅ Navigate to "Attendance" page → See all employee attendance

### **Expected Results:**
- All approvals visible
- Status updates save to database
- No console errors

---

## 2️⃣ Photographer Workflow Test

### **Login:**
- Email: `photographer@example.com`
- Password: (your photographer password)

### **Test Steps:**
1. ✅ Dashboard loads
2. ✅ Click "Clock In" → Check attendance record created
3. ✅ See "Today's Shoots" section
4. ✅ Click "Start Shoot" → Select shoot → Add location/notes → Start
5. ✅ See active shoot widget
6. ✅ Add work notes → Save
7. ✅ Click "Take Break" → Select break type → Start break
8. ✅ See break timer
9. ✅ Click "End Break"
10. ✅ Click "End Shoot"
11. ✅ Click "Clock Out" → Check attendance record updated

### **Expected Results:**
- Clock in/out works
- Shoot start/end works
- Work notes save
- Breaks tracked correctly
- Total hours calculated

---

## 3️⃣ Editor Workflow Test

### **Login:**
- Email: `editor@example.com`
- Password: (your editor password)

### **Test Steps:**
1. ✅ Dashboard loads
2. ✅ Click "Clock In"
3. ✅ See "Assigned Assets" section
4. ✅ Find an asset with status "To Edit"
5. ✅ Drag progress slider to 50% → Wait 1 second → Check database updated
6. ✅ Drag to 100%
7. ✅ Click "Mark as Review" → Check status changes to "Review"
8. ✅ If asset has "Revision" status → Update and mark as review again
9. ✅ Click "Clock Out"

### **Expected Results:**
- Clock in/out works
- Assigned assets visible
- Progress updates save (debounced)
- Status changes work
- No duplicate API calls

---

## 4️⃣ Lead Workflow Test

### **Login:**
- Email: `lead@example.com`
- Password: (your lead password)

### **Test Steps:**
1. ✅ Dashboard loads
2. ✅ See "All Shoots" section
3. ✅ Click "Assign Tasks" page
4. ✅ Find unassigned shoot
5. ✅ Select photographer from dropdown → Save
6. ✅ Check photographer sees shoot in their dashboard
7. ✅ Find asset without editor
8. ✅ Assign editor → Save
9. ✅ Check editor sees asset in their dashboard
10. ✅ View team feed → See recent activity

### **Expected Results:**
- All shoots visible
- Assignments save
- Assigned users see tasks
- Team feed updates

---

## 5️⃣ Content Creator Workflow Test

### **Login:**
- Email: `creator@example.com`
- Password: (your creator password)

### **Test Steps:**
1. ✅ Dashboard loads
2. ✅ See assigned content calendar items
3. ✅ Update progress
4. ✅ Mark as complete

### **Expected Results:**
- Assigned items visible
- Progress updates save

---

## 🐛 Common Issues to Watch For

### **Issue 1: Validation Errors**
**Symptom:** "Validation failed" error when creating/updating
**Check:** Browser console for detailed error
**Fix:** Adjust Zod schema or data format

### **Issue 2: ID Field Not Found**
**Symptom:** "Cannot update: no document ID found"
**Check:** Console logs for ID field attempts
**Fix:** Ensure document has `id` or `_id` field

### **Issue 3: Data Not Saving**
**Symptom:** Changes don't persist after refresh
**Check:** 
- Network tab for API calls
- Console for errors
- Firebase/Sheets for data

### **Issue 4: Sheets Queue Not Working**
**Symptom:** Firebase updates but Sheets doesn't
**Check:** Console for queue logs:
- `📝 Queued Sheets write...`
- `⚙️ Processing Sheets queue...`
- `✅ Synced to Sheets...`

---

## 📊 Testing Checklist

### **For Each Role:**
- [ ] Login successful
- [ ] Dashboard loads without errors
- [ ] Core actions work
- [ ] Data saves to database
- [ ] No console errors
- [ ] UI responsive

### **Cross-Role Testing:**
- [ ] Manager approves asset → Editor sees status change
- [ ] Lead assigns task → Photographer sees assignment
- [ ] Photographer completes shoot → Manager sees in approvals
- [ ] Editor marks review → Manager sees in approvals

---

## 🚨 Critical Bugs to Report

If you encounter these, **STOP and report immediately:**

1. **Login fails** - Cannot access app
2. **Dashboard crashes** - White screen or error boundary
3. **Data loss** - Changes disappear after save
4. **Infinite loops** - Page freezes or keeps refreshing
5. **Security issues** - Can see other users' data

---

## ✅ Success Criteria

**Workflow is working when:**
1. All steps complete without errors
2. Data persists after page refresh
3. Changes visible to other users (cross-role)
4. Console shows no errors
5. UI updates correctly

---

## 📝 Bug Report Template

```markdown
**Role:** [Manager/Lead/Photographer/Editor/Creator]
**Workflow:** [e.g., "Approve Asset"]
**Steps to Reproduce:**
1. Login as manager
2. Click on pending asset
3. Click "Approve"

**Expected:** Status changes to "Completed"
**Actual:** Error message "Validation failed"

**Console Error:**
[Paste error from console]

**Screenshot:**
[Attach if helpful]
```

---

## 🎯 Quick Test (5 minutes)

**Fastest way to verify app works:**

1. Login as **Manager** → Approve one asset ✅
2. Login as **Photographer** → Clock in, start shoot ✅
3. Login as **Editor** → Update progress on asset ✅
4. Check database → All changes saved ✅

If all 4 work → **App is deployment-ready** 🚀

---

**Ready to start testing?** Open the app and follow this guide step-by-step!
