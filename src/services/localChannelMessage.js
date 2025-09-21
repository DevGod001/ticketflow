// Local ChannelMessage service for development
export class LocalChannelMessage {
  static STORAGE_KEY = 'channel_messages';

  static getAll() {
    const messages = localStorage.getItem(this.STORAGE_KEY);
    return messages ? JSON.parse(messages) : [];
  }

  static save(messages) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messages));
  }

  static generateId() {
    return 'channel_msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  static async create(messageData) {
    const messages = this.getAll();
    
    const newMessage = {
      id: this.generateId(),
      ...messageData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reactions: [],
      thread_replies: 0,
      is_edited: false
    };

    messages.push(newMessage);
    this.save(messages);
    
    return newMessage;
  }

  static async filter(criteria) {
    const messages = this.getAll();
    
    if (!criteria || Object.keys(criteria).length === 0) {
      return messages;
    }

    return messages.filter(message => {
      return Object.entries(criteria).every(([key, value]) => {
        if (key === 'channel_id') {
          return message.channel_id === value;
        }
        if (key === 'sender_email') {
          return message.sender_email === value;
        }
        if (key === 'organization_id') {
          return message.organization_id === value;
        }
        return message[key] === value;
      });
    });
  }

  static async get(id) {
    const messages = this.getAll();
    const message = messages.find(m => m.id === id);
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    return message;
  }

  static async update(id, updateData) {
    const messages = this.getAll();
    const messageIndex = messages.findIndex(m => m.id === id);
    
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    messages[messageIndex] = {
      ...messages[messageIndex],
      ...updateData,
      updated_at: new Date().toISOString(),
      is_edited: true
    };

    this.save(messages);
    return messages[messageIndex];
  }

  static async delete(id) {
    const messages = this.getAll();
    const filteredMessages = messages.filter(m => m.id !== id);
    
    if (filteredMessages.length === messages.length) {
      throw new Error('Message not found');
    }

    this.save(filteredMessages);
    return { success: true };
  }

  // Helper methods for channel messages
  static async getByChannelId(channelId, limit = 50) {
    const messages = await this.filter({ channel_id: channelId });
    
    // Sort by creation date (oldest first)
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    // Return the most recent messages up to the limit
    return sortedMessages.slice(-limit);
  }

  static async addReaction(messageId, emoji, userEmail) {
    const message = await this.get(messageId);
    
    if (!message.reactions) {
      message.reactions = [];
    }
    
    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.emoji === emoji && r.users.includes(userEmail)
    );
    
    if (existingReaction) {
      return message; // User already reacted
    }
    
    // Find existing emoji reaction or create new one
    let emojiReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (emojiReaction) {
      emojiReaction.users.push(userEmail);
      emojiReaction.count = emojiReaction.users.length;
    } else {
      message.reactions.push({
        emoji,
        users: [userEmail],
        count: 1
      });
    }
    
    return this.update(messageId, { reactions: message.reactions });
  }

  static async removeReaction(messageId, emoji, userEmail) {
    const message = await this.get(messageId);
    
    if (!message.reactions) {
      return message;
    }
    
    const emojiReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (emojiReaction) {
      emojiReaction.users = emojiReaction.users.filter(email => email !== userEmail);
      emojiReaction.count = emojiReaction.users.length;
      
      // Remove reaction if no users left
      if (emojiReaction.count === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    }
    
    return this.update(messageId, { reactions: message.reactions });
  }

  static async searchMessages(channelId, query) {
    const messages = await this.getByChannelId(channelId);
    
    if (!query || query.trim() === '') {
      return messages;
    }
    
    const searchTerm = query.toLowerCase();
    
    return messages.filter(message => 
      message.content.toLowerCase().includes(searchTerm) ||
      message.sender_name?.toLowerCase().includes(searchTerm)
    );
  }
}
