// API Client for cross-device persistent data
class ApiClient {
  constructor() {
    this.baseURL = '/api';
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth methods
  async signup(userData) {
    const response = await this.request('/auth/signup', {
      method: 'POST',
      body: userData,
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async me() {
    return this.request('/auth/me');
  }

  async updateProfile(updates) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: updates,
    });
  }

  logout() {
    this.setToken(null);
    return Promise.resolve({ success: true });
  }

  // Organization methods
  async createOrganization(orgData) {
    return this.request('/organizations', {
      method: 'POST',
      body: orgData,
    });
  }

  async getOrganizations() {
    return this.request('/organizations');
  }

  async getOrganization(id) {
    return this.request(`/organizations/${id}`);
  }

  async updateOrganization(id, updates) {
    return this.request(`/organizations/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteOrganization(id) {
    return this.request(`/organizations/${id}`, {
      method: 'DELETE',
    });
  }

  // Join request methods
  async createJoinRequest(requestData) {
    return this.request('/join-requests', {
      method: 'POST',
      body: requestData,
    });
  }

  async getJoinRequests(organizationId) {
    return this.request(`/join-requests?organization_id=${organizationId}`);
  }

  async updateJoinRequest(id, updates) {
    return this.request(`/join-requests/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  // Ticket methods
  async createTicket(ticketData) {
    return this.request('/tickets', {
      method: 'POST',
      body: ticketData,
    });
  }

  async getTickets(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/tickets?${params}`);
  }

  async getTicket(id) {
    return this.request(`/tickets/${id}`);
  }

  async updateTicket(id, updates) {
    return this.request(`/tickets/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteTicket(id) {
    return this.request(`/tickets/${id}`, {
      method: 'DELETE',
    });
  }

  // Comment methods
  async createComment(commentData) {
    return this.request('/comments', {
      method: 'POST',
      body: commentData,
    });
  }

  async getComments(ticketId) {
    return this.request(`/comments?ticket_id=${ticketId}`);
  }

  // Notification methods
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  // Department methods
  async createDepartment(deptData) {
    return this.request('/departments', {
      method: 'POST',
      body: deptData,
    });
  }

  async getDepartments(organizationId) {
    return this.request(`/departments?organization_id=${organizationId}`);
  }

  // Team methods
  async createTeam(teamData) {
    return this.request('/teams', {
      method: 'POST',
      body: teamData,
    });
  }

  async getTeams(organizationId) {
    return this.request(`/teams?organization_id=${organizationId}`);
  }

  // Channel methods
  async createChannel(channelData) {
    return this.request('/channels', {
      method: 'POST',
      body: channelData,
    });
  }

  async getChannels(organizationId) {
    return this.request(`/channels?organization_id=${organizationId}`);
  }

  async getChannelMessages(channelId) {
    return this.request(`/channels/${channelId}/messages`);
  }

  async sendChannelMessage(channelId, messageData) {
    return this.request(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: messageData,
    });
  }

  // Direct message methods
  async getDirectMessages(recipientEmail) {
    return this.request(`/direct-messages?recipient=${recipientEmail}`);
  }

  async sendDirectMessage(messageData) {
    return this.request('/direct-messages', {
      method: 'POST',
      body: messageData,
    });
  }

  // Collaboration room methods
  async createCollaborationRoom(roomData) {
    return this.request('/collaboration-rooms', {
      method: 'POST',
      body: roomData,
    });
  }

  async getCollaborationRooms(organizationId) {
    return this.request(`/collaboration-rooms?organization_id=${organizationId}`);
  }

  async getRoomMessages(roomId) {
    return this.request(`/collaboration-rooms/${roomId}/messages`);
  }

  async sendRoomMessage(roomId, messageData) {
    return this.request(`/collaboration-rooms/${roomId}/messages`, {
      method: 'POST',
      body: messageData,
    });
  }
}

export const apiClient = new ApiClient();
