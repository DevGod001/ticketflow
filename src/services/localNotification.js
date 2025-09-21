// Local Notification Management Service for Development
class LocalNotificationService {
  constructor() {
    this.NOTIFICATIONS_KEY = 'ticketflow_notifications';
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.NOTIFICATIONS_KEY)) {
      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify({}));
    }
  }

  // Get all notifications from localStorage
  getNotifications() {
    return JSON.parse(localStorage.getItem(this.NOTIFICATIONS_KEY) || '{}');
  }

  // Save notifications to localStorage
  saveNotifications(notifications) {
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  // Generate unique notification ID
  generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create a new notification
  async create(notificationData) {
    const notifications = this.getNotifications();
    const id = this.generateId();
    
    const newNotification = {
      id,
      user_email: notificationData.user_email,
      type: notificationData.type || 'general',
      title: notificationData.title || 'Notification',
      message: notificationData.message || '',
      link: notificationData.link || null,
      organization_id: notificationData.organization_id || null,
      from_user_email: notificationData.from_user_email || null,
      read: false,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    notifications[id] = newNotification;
    this.saveNotifications(notifications);
    
    return { ...newNotification };
  }

  // Get notification by ID
  async get(id) {
    const notifications = this.getNotifications();
    const notification = notifications[id];
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return { ...notification };
  }

  // Filter notifications
  async filter(criteria, sortBy = null) {
    const notifications = this.getNotifications();
    let notificationList = Object.values(notifications);
    
    if (criteria) {
      notificationList = notificationList.filter(notification => {
        return Object.keys(criteria).every(key => {
          if (key === 'user_email') {
            return notification.user_email === criteria[key];
          }
          if (key === 'type') {
            return notification.type === criteria[key];
          }
          if (key === 'read') {
            return notification.read === criteria[key];
          }
          if (key === 'organization_id') {
            return notification.organization_id === criteria[key];
          }
          return notification[key] === criteria[key];
        });
      });
    }

    // Sort by created_date descending if sortBy is provided
    if (sortBy === '-created_date') {
      notificationList.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
    
    return notificationList;
  }

  // Update notification
  async update(id, updates) {
    const notifications = this.getNotifications();
    const notification = notifications[id];
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    const updatedNotification = {
      ...notification,
      ...updates,
      updated_date: new Date().toISOString()
    };
    
    notifications[id] = updatedNotification;
    this.saveNotifications(notifications);
    
    return { ...updatedNotification };
  }

  // Delete notification
  async delete(id) {
    const notifications = this.getNotifications();
    
    if (!notifications[id]) {
      throw new Error('Notification not found');
    }
    
    delete notifications[id];
    this.saveNotifications(notifications);
    
    return { success: true };
  }

  // Mark notification as read
  async markAsRead(id) {
    return await this.update(id, { read: true });
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userEmail) {
    const notifications = this.getNotifications();
    const updates = {};
    
    Object.keys(notifications).forEach(id => {
      if (notifications[id].user_email === userEmail && !notifications[id].read) {
        updates[id] = {
          ...notifications[id],
          read: true,
          updated_date: new Date().toISOString()
        };
      }
    });
    
    if (Object.keys(updates).length > 0) {
      const allNotifications = { ...notifications, ...updates };
      this.saveNotifications(allNotifications);
    }
    
    return { updated: Object.keys(updates).length };
  }

  // Get unread count for a user
  async getUnreadCount(userEmail) {
    const notifications = await this.filter({ user_email: userEmail, read: false });
    return notifications.length;
  }
}

export const localNotification = new LocalNotificationService();

// Create local notification methods that match Base44 API
export const LocalNotification = {
  create: (data) => localNotification.create(data),
  get: (id) => localNotification.get(id),
  filter: (criteria, sortBy) => localNotification.filter(criteria, sortBy),
  update: (id, data) => localNotification.update(id, data),
  delete: (id) => localNotification.delete(id),
  markAsRead: (id) => localNotification.markAsRead(id),
  markAllAsRead: (userEmail) => localNotification.markAllAsRead(userEmail),
  getUnreadCount: (userEmail) => localNotification.getUnreadCount(userEmail),
};
