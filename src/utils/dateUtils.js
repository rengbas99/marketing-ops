import { formatDistanceToNow } from 'date-fns';

export const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleString();
    } catch (error) {
        return '';
    }
};
