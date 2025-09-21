// Local DirectMessage Service for Development
class LocalDirectMessageService {
  constructor() {
    this.MESSAGES_KEY = 'ticketflow_direct_messages';
    this.MAX_MESSAGES = 2000; // Maximum messages to keep in localStorage
    this.CLEANUP_THRESHOLD = 0.8; // Clean up when 80% of max is reached
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.MESSAGES_KEY)) {
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify([]));
    }
    this.checkStorageQuota();
  }

  checkStorageQuota() {
    try {
      const messages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
      
      // If we're approaching the limit, clean up old messages
      if (messages.length > this.MAX_MESSAGES * this.CLEANUP_THRESHOLD) {
        this.cleanupOldMessages();
      }
    } catch (error) {
      console.warn('Message storage quota check failed:', error);
      // If we can't parse, reset the storage
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify([]));
    }
  }

  cleanupOldMessages() {
    try {
      const messages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
      
      // Sort by created_date (oldest first) and keep only the most recent messages
      const sortedMessages = messages.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      
      // Keep only the most recent 70% of max messages
      const keepCount = Math.floor(this.MAX_MESSAGES * 0.7);
      const cleanedMessages = sortedMessages.slice(0, keepCount);
      
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(cleanedMessages));
      console.log(`Cleaned up ${messages.length - cleanedMessages.length} old messages`);
    } catch (error) {
      console.error('Failed to cleanup old messages:', error);
      // If cleanup fails, reset storage
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify([]));
    }
  }

  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateConversationId(email1, email2) {
    // Create consistent conversation ID regardless of order
    return [email1, email2].sort().join('_');
  }

  async create(messageData) {
    try {
      // Check storage quota before creating
      this.checkStorageQuota();
      
      const messages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
      
      // Generate conversation ID if not provided
      const conversationId = messageData.conversation_id || 
        this.generateConversationId(messageData.from_email, messageData.to_email);
      
      const newMessage = {
        id: this.generateId(),
        ...messageData,
        conversation_id: conversationId,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        read: messageData.read || false,
        edited_at: null
      };

      messages.push(newMessage);
      
      // Try to save, if it fails due to quota, clean up and try again
      try {
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
      } catch (storageError) {
        if (storageError.name === 'QuotaExceededError' || storageError.message.includes('quota')) {
          console.warn('Message storage quota exceeded, cleaning up...');
          this.cleanupOldMessages();
          
          // Try again with cleaned up storage
          const cleanedMessages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
          cleanedMessages.push(newMessage);
          localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(cleanedMessages));
        } else {
          throw storageError;
        }
      }
      
      return newMessage;
    } catch (error) {
      console.error('Failed to create message:', error);
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  async filter(criteria = {}, sortBy = '-created_date', limit = null) {
    try {
      const messages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
      
      let filtered = messages.filter(message => {
        // Apply filters
        for (const [key, value] of Object.entries(criteria)) {
          if (value === null || value === undefined) continue;
          
          if (key === 'organization_id' && message.organization_id !== value) {
            return false;
          }
          if (key === 'id' && message.id !== value) {
            return false;
          }
          if (key === 'conversation_id' && message.conversation_id !== value) {
            return false;
          }
          if (key === 'from_email' && message.from_email !== value) {
            return false;
          }
          if (key === 'to_email' && message.to_email !== value) {
            return false;
          }
          if (key === 'read' && message.read !== value) {
            return false;
          }
        }
        return true;
      });

      // Apply sorting
      if (sortBy) {
        const isDescending = sortBy.startsWith('-');
        const sortField = isDescending ? sortBy.substring(1) : sortBy;
        
        filtered.sort((a, b) => {
          let aVal = a[sortField];
          let bVal = b[sortField];
          
          // Handle date sorting
          if (sortField.includes('date')) {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
          }
          
          if (aVal < bVal) return isDescending ? 1 : -1;
          if (aVal > bVal) return isDescending ? -1 : 1;
          return 0;
        });
      }

      // Apply limit
      if (limit && limit > 0) {
        filtered = filtered.slice(0, limit);
      }

      return filtered;
    } catch (error) {
      throw new Error(`Failed to filter messages: ${error.message}`);
    }
  }

  async update(id, updateData) {
    try {
      const messages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
      const messageIndex = messages.findIndex(message => message.id === id);
      
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      messages[messageIndex] = {
        ...messages[messageIndex],
        ...updateData,
        updated_date: new Date().toISOString()
      };

      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
      return messages[messageIndex];
    } catch (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const messages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
      const filteredMessages = messages.filter(message => message.id !== id);
      
      if (filteredMessages.length === messages.length) {
        throw new Error('Message not found');
      }

      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(filteredMessages));
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  async get(id) {
    try {
      const messages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
      const message = messages.find(message => message.id === id);
      
      if (!message) {
        throw new Error('Message not found');
      }

      return message;
    } catch (error) {
      throw new Error(`Failed to get message: ${error.message}`);
    }
  }

  // Get conversation between two users
  async getConversation(email1, email2, organizationId = null) {
    try {
      const conversationId = this.generateConversationId(email1, email2);
      const criteria = { conversation_id: conversationId };
      
      if (organizationId) {
        criteria.organization_id = organizationId;
      }
      
      return await this.filter(criteria, 'created_date'); // Ascending order for conversation
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  // Mark messages as read
  async markAsRead(messageIds) {
    try {
      const messages = JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
      let updated = false;
      
      messages.forEach(message => {
        if (messageIds.includes(message.id) && !message.read) {
          message.read = true;
          message.updated_date = new Date().toISOString();
          updated = true;
        }
      });
      
      if (updated) {
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
      }
      
      return { success: true, updated };
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }

  // Get unread message count for user
  async getUnreadCount(userEmail, organizationId = null) {
    try {
      const criteria = { to_email: userEmail, read: false };
      if (organizationId) {
        criteria.organization_id = organizationId;
      }
      
      const unreadMessages = await this.filter(criteria);
      return unreadMessages.length;
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }

  // Get all messages (for debugging)
  async getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
    } catch (error) {
      throw new Error(`Failed to get all messages: ${error.message}`);
    }
  }

  // Clear all messages (for debugging)
  async clearAll() {
    try {
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify([]));
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to clear messages: ${error.message}`);
    }
  }

  // Get conversation statistics
  async getConversationStats(userEmail, organizationId = null) {
    try {
      const criteria = {};
      if (organizationId) {
        criteria.organization_id = organizationId;
      }
      
      const allMessages = await this.filter(criteria);
      const userMessages = allMessages.filter(m => 
        m.from_email === userEmail || m.to_email === userEmail
      );
      
      const conversations = {};
      userMessages.forEach(message => {
        const otherUser = message.from_email === userEmail ? message.to_email : message.from_email;
        if (!conversations[otherUser]) {
          conversations[otherUser] = {
            totalMessages: 0,
            unreadCount: 0,
            lastMessage: null
          };
        }
        
        conversations[otherUser].totalMessages++;
        if (message.to_email === userEmail && !message.read) {
          conversations[otherUser].unreadCount++;
        }
        
        if (!conversations[otherUser].lastMessage || 
            new Date(message.created_date) > new Date(conversations[otherUser].lastMessage.created_date)) {
          conversations[otherUser].lastMessage = message;
        }
      });
      
      return conversations;
    } catch (error) {
      throw new Error(`Failed to get conversation stats: ${error.message}`);
    }
  }
}

export const LocalDirectMessage = new LocalDirectMessageService();
