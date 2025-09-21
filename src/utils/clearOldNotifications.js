// Utility to clear old notifications with incorrect link formats
// This can be run once to clean up any cached notifications with old link formats

export const clearOldNotifications = () => {
  try {
    // Clear all notifications from localStorage
    localStorage.removeItem('ticketflow_notifications');
    console.log('Old notifications cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing old notifications:', error);
    return false;
  }
};

export const updateNotificationLinks = () => {
  try {
    const notificationsData = localStorage.getItem('ticketflow_notifications');
    if (!notificationsData) {
      console.log('No notifications found to update');
      return true;
    }

    const notifications = JSON.parse(notificationsData);
    let updated = false;

    // Update any notifications with old link formats
    Object.keys(notifications).forEach(id => {
      const notification = notifications[id];
      
      // Check if this is a join request notification with old link format
      if (notification.type === 'organization_join_request' && 
          notification.link && 
          notification.link.includes('/organization/') && 
          notification.link.includes('/requests')) {
        
        // Update to new format
        notification.link = '/organization?tab=requests';
        updated = true;
        console.log(`Updated notification ${id} link format`);
      }
    });

    if (updated) {
      localStorage.setItem('ticketflow_notifications', JSON.stringify(notifications));
      console.log('Notification links updated successfully');
    } else {
      console.log('No notifications needed updating');
    }

    return true;
  } catch (error) {
    console.error('Error updating notification links:', error);
    return false;
  }
};

// Run this in browser console to clear old notifications:
// import { clearOldNotifications } from './src/utils/clearOldNotifications.js'; clearOldNotifications();
