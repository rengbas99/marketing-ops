/**
 * Schema validation using Zod
 * Provides runtime type checking and validation for data integrity
 */

import { z } from 'zod';
import { ROLES, ASSET_STATUS, SHOOT_STATUS, BREAK_TYPES } from '../constants';

// User Schema
export const UserSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(Object.values(ROLES), {
        errorMap: () => ({ message: 'Invalid role' })
    }),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    status: z.enum(['active', 'inactive']).default('active'),
    created_at: z.string().datetime().optional(),
});

// Shoot Schema
export const ShootSchema = z.object({
    shoot_id: z.string().min(1, 'Shoot ID is required'), // Accept custom IDs like SHOOT-123
    shoot_name: z.string().min(1, 'Shoot name is required'),
    title: z.string().optional(),
    client_id: z.string().optional(), // Accept custom client IDs
    photographer_id: z.string().email('Invalid photographer email').optional(),
    lead_photographer_email: z.union([z.string().email(), z.string()]).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    time: z.string().optional(),
    location: z.string().optional(),
    location_name: z.string().optional(),
    status: z.enum(Object.values(SHOOT_STATUS), {
        errorMap: () => ({ message: 'Invalid shoot status' })
    }),
    notes: z.string().optional(),
    created_at: z.string().optional(), // More lenient - accept any string
    updated_at: z.string().optional(),
}).passthrough(); // Allow extra fields

// Asset Schema - Made very lenient to handle all update scenarios
export const AssetSchema = z.object({
    asset_id: z.string().min(1, 'Asset ID is required'), // Accept custom IDs
    title: z.union([z.string().min(1, 'Asset title is required'), z.string()]).optional(), // Allow empty or any string
    shoot_id: z.string().optional(), // Accept custom shoot IDs
    client_id: z.string().optional(),
    deliverable_type: z.string().optional(), // Type of deliverable
    assigned_editor_email: z.union([z.string().email(), z.string()]).optional(), // More lenient email validation
    assigned_creator_email: z.union([z.string().email(), z.string()]).optional(),
    assigned_photographer_email: z.union([z.string().email(), z.string()]).optional(),
    status: z.union([
        z.enum(Object.values(ASSET_STATUS)),
        z.string() // Allow any status string (Published, Working, Review, Paused, On Break, etc.)
    ]).optional(),
    current_editor_status: z.string().optional(), // Working, Review, Paused, On Break, etc.
    task_type: z.string().optional(),
    work_progress: z.union([z.number(), z.string()]).optional(), // Accept number or string
    deadline: z.string().optional(), // More lenient
    upload_folder_link: z.string().optional(),
    work_links: z.string().optional(),
    channel: z.string().optional(),
    publish_date: z.string().optional(),
    notes: z.string().optional(), // Notes/requirements
    editor_notes: z.string().optional(), // Editor-specific notes
    revision_notes: z.string().optional(), // Revision request notes
    comments_count: z.union([z.number(), z.string()]).optional(), // For team feed
    kudos_count: z.union([z.number(), z.string()]).optional(), // For team feed
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
}).passthrough(); // Allow extra fields

// Client Schema
export const ClientSchema = z.object({
    client_id: z.string().min(1, 'Client ID is required'), // Accept custom IDs
    company_name: z.string().min(1, 'Company name is required'),
    contact_name: z.string().optional().nullable(),
    contact_email: z.union([z.string().email(), z.string()]).optional().nullable(), // Support both email and contact_email
    email: z.union([z.string().email(), z.string()]).optional().nullable(), // Support both email and contact_email
    contact_phone: z.string().optional().nullable(), // Support contact_phone
    phone: z.string().optional().nullable(), // Support phone
    notes: z.string().optional().nullable(),
    agreement_status: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
}).passthrough(); // Allow extra fields

// Attendance Schema - FIXED to match actual usage (very lenient)
export const AttendanceSchema = z.object({
    attendance_id: z.string().min(1, 'Attendance ID is required'), // Accept ATT-123 format
    employee_email: z.union([z.string().email(), z.string()]).optional().nullable(), // Accept email or any string
    employee_id: z.string().optional().nullable(), // Support both field names
    date: z.union([z.string(), z.undefined(), z.null()]).optional().nullable(), // Accept any date string format
    clock_in: z.union([z.string(), z.undefined(), z.null()]).optional().nullable(), // Accept any datetime string
    clock_out: z.union([z.string(), z.undefined(), z.null()]).optional().nullable(),
    status: z.union([
        z.enum(['present', 'absent', 'on_leave', 'clocked_in', 'clocked_out']),
        z.string() // Allow any status string as fallback
    ]).optional().nullable(),
    hours_worked: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional().nullable(),
    break_start_time: z.union([z.string(), z.undefined(), z.null()]).optional().nullable(), // Break start time
    total_break_duration: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional().nullable(), // Total break duration
    daily_report: z.union([z.string(), z.undefined(), z.null()]).optional().nullable(), // Daily work report
    created_at: z.union([z.string(), z.undefined(), z.null()]).optional().nullable(),
}).passthrough(); // Allow extra fields that might be sent

// Break Schema - Made more lenient
export const BreakSchema = z.object({
    break_id: z.string().min(1, 'Break ID is required'), // Accept custom IDs
    user_email: z.union([z.string().email(), z.string()]).optional().nullable(), // Accept email or any string
    attendance_id: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(), // Accept custom attendance IDs or null
    time_log_id: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    photographer_attendance_id: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(), // For photographer breaks
    break_type: z.union([
        z.enum(Object.values(BREAK_TYPES)),
        z.string() // Allow any string as fallback
    ]).optional(),
    break_start: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(), // More lenient
    break_end: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    duration: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional().nullable(), // Accept number or string
    created_at: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
}).passthrough(); // Allow extra fields that might be sent

// Leave Request Schema
const LeaveRequestSchemaBase = z.object({
    request_id: z.string().min(1, 'Request ID is required'), // Accept custom IDs
    employee_email: z.string().email('Invalid employee email'),
    leave_type: z.string().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
    days_count: z.union([z.number(), z.string()]).optional(),
    reason: z.string().optional(),
    status: z.union([
        z.enum(['Pending', 'Approved', 'Rejected']),
        z.enum(['pending', 'approved', 'rejected'])
    ]),
    manager_email: z.string().email().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
}).passthrough();

export const LeaveRequestSchema = LeaveRequestSchemaBase.refine(
    (data) => new Date(data.end_date) >= new Date(data.start_date),
    { message: 'End date must be after or equal to start date', path: ['end_date'] }
);

// Photographer Attendance Schema
export const PhotographerAttendanceSchema = z.object({
    attendance_id: z.string().min(1, 'Attendance ID is required'),
    shoot_id: z.string().min(1).optional(),
    photographer_email: z.string().email().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    clock_in: z.string().optional(),
    clock_out: z.string().optional(),
    status: z.string().optional(), // Very lenient - accept any status
    location: z.string().optional(),
    gps_coordinates: z.string().optional(),
    notes: z.string().optional(),
    upload_links: z.string().optional(),
    total_break_duration: z.union([z.number(), z.string()]).optional(),
    work_duration: z.union([z.number(), z.string()]).optional(),
    created_at: z.string().optional(),
});

// Editor Time Logs Schema - Made more lenient
export const EditorTimeLogSchema = z.object({
    log_id: z.string().min(1, 'Log ID is required'),
    editor_email: z.union([z.string().email(), z.string()]).optional().nullable(),
    asset_id: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    shoot_id: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    start_time: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    end_time: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    work_duration: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional().nullable(),
    duration: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional().nullable(),
    task_status: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    notes: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    break_start_time: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    break_end_time: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    total_break_duration: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional().nullable(),
    work_links: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    current_subtask: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(), // Current subtask name
    subtask_start_time: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(), // When subtask started
    last_subtask: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(), // Last completed subtask
    last_subtask_duration: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional().nullable(), // Duration of last subtask
    created_at: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
}).passthrough(); // Allow extra fields

// Content Calendar Schema (lenient to match UI fields)
export const ContentCalendarSchema = z.object({
    calendar_id: z.string().min(1, 'Calendar ID is required'),
    asset_id: z.string().min(1, 'Asset ID is required'),
    publish_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Publish date must be YYYY-MM-DD'),
    publish_time: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    channel: z.string().min(1, 'Channel is required'),
    status: z.string().optional(),
    notes: z.string().optional(),
    client_id: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    title: z.string().optional(),
    assigned_creator_email: z.union([z.string().email(), z.string(), z.null(), z.undefined()]).optional().nullable(),
    assigned_editor_email: z.union([z.string().email(), z.string(), z.null(), z.undefined()]).optional().nullable(),
    due_date: z.string().optional(),
    progress: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional().nullable(),
}).passthrough();

// Monthly Hours Schema
export const MonthlyHoursSchema = z.object({
    record_id: z.string().min(1).optional(),
    employee_email: z.string().email(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    hours: z.union([z.number(), z.string()]),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

// Asset Comments Schema
export const AssetCommentsSchema = z.object({
    comment_id: z.string().min(1).optional(),
    asset_id: z.string().min(1, 'Asset ID is required'),
    user_email: z.string().email(),
    user_name: z.string().optional(),
    comment_text: z.string().min(1, 'Comment text is required'),
    timestamp: z.string().optional(),
    created_at: z.string().optional(),
});

// Schema map for easy lookup
export const SCHEMAS = {
    Users: UserSchema,
    Shoots: ShootSchema,
    Assets: AssetSchema,
    Clients: ClientSchema,
    Attendance: AttendanceSchema,
    Time_Breaks: BreakSchema,
    Leave_Requests: LeaveRequestSchema,
    Photographer_Attendance: PhotographerAttendanceSchema,
    Editor_Time_Logs: EditorTimeLogSchema,
    Content_Calendar: ContentCalendarSchema,
    Monthly_Hours: MonthlyHoursSchema,
    Asset_Comments: AssetCommentsSchema,
};

/**
 * Validate data against a schema
 * @param {string} schemaName - Name of the schema to use
 * @param {object} data - Data to validate
 * @returns {{ success: boolean, data?: object, errors?: array }}
 */
export function validateData(schemaName, data) {
    const schema = SCHEMAS[schemaName];
    if (!schema) {
        return {
            success: false,
            errors: [{ message: `No schema found for ${schemaName}` }]
        };
    }

    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    } else {
        // Safely extract errors - handle case where errors might be undefined
        const errorList = result.error?.errors || [];
        return {
            success: false,
            errors: Array.isArray(errorList) ? errorList.map(err => ({
                field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || 'unknown'),
                message: err.message || 'Validation error'
            })) : [{ field: 'unknown', message: 'Validation failed' }]
        };
    }
}
