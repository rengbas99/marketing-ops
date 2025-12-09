/**
 * Centralized PropTypes definitions for type safety
 * Use these to validate component props across the application
 */

import PropTypes from 'prop-types';
import { ROLES, ASSET_STATUS, SHOOT_STATUS, BREAK_TYPES } from '../constants';

// User PropType
export const UserPropType = PropTypes.shape({
    email: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    role: PropTypes.oneOf(Object.values(ROLES)).isRequired,
    status: PropTypes.oneOf(['active', 'inactive']),
    created_at: PropTypes.string,
});

// Shoot PropType
export const ShootPropType = PropTypes.shape({
    shoot_id: PropTypes.string.isRequired,
    shoot_name: PropTypes.string.isRequired,
    client_id: PropTypes.string,
    photographer_id: PropTypes.string,
    date: PropTypes.string.isRequired,
    location_name: PropTypes.string,
    status: PropTypes.oneOf(Object.values(SHOOT_STATUS)).isRequired,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
});

// Asset PropType
export const AssetPropType = PropTypes.shape({
    asset_id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    shoot_id: PropTypes.string,
    assigned_editor_email: PropTypes.string,
    assigned_creator_email: PropTypes.string,
    status: PropTypes.oneOf(Object.values(ASSET_STATUS)).isRequired,
    work_progress: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    deadline: PropTypes.string,
    work_links: PropTypes.string,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
});

// Client PropType
export const ClientPropType = PropTypes.shape({
    client_id: PropTypes.string.isRequired,
    company_name: PropTypes.string.isRequired,
    contact_name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    created_at: PropTypes.string,
});

// Attendance PropType
export const AttendancePropType = PropTypes.shape({
    attendance_id: PropTypes.string.isRequired,
    employee_email: PropTypes.string, // Optional - some records use employee_id
    employee_id: PropTypes.string, // Optional - some records use employee_email
    date: PropTypes.string.isRequired,
    clock_in: PropTypes.string,
    clock_out: PropTypes.string,
    status: PropTypes.oneOf(['present', 'absent', 'on_leave', 'clocked_in', 'clocked_out']),
});

// Break PropType
export const BreakPropType = PropTypes.shape({
    break_id: PropTypes.string.isRequired,
    attendance_id: PropTypes.string,
    time_log_id: PropTypes.string,
    break_type: PropTypes.oneOf(Object.values(BREAK_TYPES)).isRequired,
    break_start: PropTypes.string.isRequired,
    break_end: PropTypes.string,
    duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
});

// Leave Request PropType
export const LeaveRequestPropType = PropTypes.shape({
    request_id: PropTypes.string.isRequired,
    employee_email: PropTypes.string.isRequired,
    start_date: PropTypes.string.isRequired,
    end_date: PropTypes.string.isRequired,
    reason: PropTypes.string,
    status: PropTypes.oneOf(['pending', 'approved', 'rejected']).isRequired,
    created_at: PropTypes.string,
});

// Common callback PropTypes
export const CallbackPropTypes = {
    onSave: PropTypes.func,
    onUpdate: PropTypes.func,
    onDelete: PropTypes.func,
    onClose: PropTypes.func,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
};

// Modal PropTypes
export const ModalPropTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
};
