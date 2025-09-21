// Local storage service for group messages in collaboration rooms
export class LocalGroupMessage {
  static STORAGE_KEY = 'group_messages';

  static getAll() {
    try {
      const messages = localStorage.getItem(this.STORAGE_KEY);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error('Error getting group messages:', error);
      return [];
    }
  }

  static async filter(criteria = {}) {
    const messages = this.getAll();
    
    if (Object.keys(criteria).length === 0) {
      return messages;
    }

    return messages.filter(message => {
      return Object.entries(criteria).every(([key, value]) => {
        if (key === 'room_id') {
          return message.room_id === value;
        }
        if (key === 'organization_id') {
          return message.organization_id === value;
        }
        return message[key] === value;
      });
    });
  }

  static async create(messageData) {
    try {
      const messages = this.getAll();
      const newMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...messageData
      };
      
      messages.push(newMessage);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messages));
      return newMessage;
    } catch (error) {
      console.error('Error creating group message:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const messages = this.getAll();
      const messageIndex = messages.findIndex(message => message.id === id);
      
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      messages[messageIndex] = {
        ...messages[messageIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messages));
      return messages[messageIndex];
    } catch (error) {
      console.error('Error updating group message:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const messages = this.getAll();
      const filteredMessages = messages.filter(message => message.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredMessages));
      return true;
    } catch (error) {
      console.error('Error deleting group message:', error);
      throw error;
    }
  }

  static async get(id) {
    const messages = this.getAll();
    return messages.find(message => message.id === id) || null;
  }

  static async getByRoomId(roomId) {
    const messages = this.getAll();
    return messages
      .filter(message => message.room_id === roomId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
}
