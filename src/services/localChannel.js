// Local Channel service for development
export class LocalChannel {
  static STORAGE_KEY = 'channels';

  static getAll() {
    const channels = localStorage.getItem(this.STORAGE_KEY);
    return channels ? JSON.parse(channels) : [];
  }

  static save(channels) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(channels));
  }

  static generateId() {
    return 'channel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  static async create(channelData) {
    const channels = this.getAll();
    
    // Check if channel name already exists in the organization
    const existingChannel = channels.find(
      c => c.name === channelData.name && c.organization_id === channelData.organization_id
    );
    
    if (existingChannel) {
      throw new Error('A channel with this name already exists');
    }

    const newChannel = {
      id: this.generateId(),
      ...channelData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      last_activity: new Date().toISOString()
    };

    channels.push(newChannel);
    this.save(channels);
    
    return newChannel;
  }

  static async filter(criteria) {
    const channels = this.getAll();
    
    if (!criteria || Object.keys(criteria).length === 0) {
      return channels;
    }

    return channels.filter(channel => {
      return Object.entries(criteria).every(([key, value]) => {
        if (key === 'organization_id') {
          return channel.organization_id === value;
        }
        if (key === 'members') {
          // Check if user is a member of the channel
          return channel.members && channel.members.includes(value);
        }
        if (key === 'type') {
          return channel.type === value;
        }
        if (key === 'is_public') {
          return channel.is_public === value;
        }
        return channel[key] === value;
      });
    });
  }

  static async get(id) {
    const channels = this.getAll();
    const channel = channels.find(c => c.id === id);
    
    if (!channel) {
      throw new Error('Channel not found');
    }
    
    return channel;
  }

  static async update(id, updateData) {
    const channels = this.getAll();
    const channelIndex = channels.findIndex(c => c.id === id);
    
    if (channelIndex === -1) {
      throw new Error('Channel not found');
    }

    channels[channelIndex] = {
      ...channels[channelIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };

    this.save(channels);
    return channels[channelIndex];
  }

  static async delete(id) {
    const channels = this.getAll();
    const filteredChannels = channels.filter(c => c.id !== id);
    
    if (filteredChannels.length === channels.length) {
      throw new Error('Channel not found');
    }

    this.save(filteredChannels);
    return { success: true };
  }

  // Additional helper methods
  static async getByOrganization(organizationId) {
    return this.filter({ organization_id: organizationId });
  }

  static async getUserChannels(userEmail, organizationId) {
    const channels = await this.filter({ organization_id: organizationId });
    
    return channels.filter(channel => {
      // Public channels are visible to all org members
      if (channel.is_public) {
        return true;
      }
      // Private channels only visible to members
      return channel.members && channel.members.includes(userEmail);
    });
  }

  static async addMember(channelId, memberEmail) {
    const channel = await this.get(channelId);
    
    if (!channel.members) {
      channel.members = [];
    }
    
    if (!channel.members.includes(memberEmail)) {
      channel.members.push(memberEmail);
      return this.update(channelId, { members: channel.members });
    }
    
    return channel;
  }

  static async removeMember(channelId, memberEmail) {
    const channel = await this.get(channelId);
    
    if (channel.members) {
      channel.members = channel.members.filter(email => email !== memberEmail);
      return this.update(channelId, { members: channel.members });
    }
    
    return channel;
  }
}
