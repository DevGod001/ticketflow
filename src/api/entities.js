import { apiClient } from '../services/apiClient.js';

// API-based entities for cross-device persistence
export const Organization = {
  create: (data) => apiClient.createOrganization(data),
  filter: (criteria) => {
    // Handle filtering logic for organizations
    if (criteria.id && criteria.id.$in) {
      // For now, get all organizations and filter client-side
      // In a real implementation, you'd pass this to the API
      return apiClient.getOrganizations().then(orgs => 
        orgs.filter(org => criteria.id.$in.includes(org.id))
      );
    }
    if (criteria.organization_id) {
      return apiClient.getOrganizations().then(orgs => 
        orgs.filter(org => org.organization_id === criteria.organization_id)
      );
    }
    return apiClient.getOrganizations();
  },
  get: (id) => apiClient.getOrganization(id),
  update: (id, data) => apiClient.updateOrganization(id, data),
  delete: (id) => apiClient.deleteOrganization(id),
};

export const Department = {
  create: (data) => apiClient.createDepartment(data),
  filter: (criteria) => {
    const orgId = criteria.organization_id;
    return apiClient.getDepartments(orgId);
  },
  get: (id) => apiClient.getDepartment(id),
  update: (id, data) => apiClient.updateDepartment(id, data),
  delete: (id) => apiClient.deleteDepartment(id),
};

export const Ticket = {
  create: (data) => apiClient.createTicket(data),
  filter: (criteria) => apiClient.getTickets(criteria),
  get: (id) => apiClient.getTicket(id),
  update: (id, data) => apiClient.updateTicket(id, data),
  delete: (id) => apiClient.deleteTicket(id),
};

export const Comment = {
  create: (data) => apiClient.createComment(data),
  filter: (criteria) => {
    if (criteria.ticket_id) {
      return apiClient.getComments(criteria.ticket_id);
    }
    return Promise.resolve([]);
  },
  get: (id) => apiClient.getComment(id),
  update: (id, data) => apiClient.updateComment(id, data),
  delete: (id) => apiClient.deleteComment(id),
};

export const Notification = {
  create: (data) => apiClient.createNotification(data),
  filter: (criteria) => apiClient.getNotifications(),
  get: (id) => apiClient.getNotification(id),
  update: (id, data) => apiClient.updateNotification(id, data),
  delete: (id) => apiClient.deleteNotification(id),
  markAsRead: (id) => apiClient.markNotificationRead(id),
};

export const JoinRequest = {
  create: (data) => apiClient.createJoinRequest(data),
  filter: (criteria, sort) => {
    if (criteria.organization_id) {
      return apiClient.getJoinRequests(criteria.organization_id);
    }
    return Promise.resolve([]);
  },
  get: (id) => apiClient.getJoinRequest(id),
  update: (id, data) => apiClient.updateJoinRequest(id, data),
  delete: (id) => apiClient.deleteJoinRequest(id),
};

export const DirectMessage = {
  create: (data) => apiClient.sendDirectMessage(data),
  filter: (criteria) => {
    if (criteria.recipient_email) {
      return apiClient.getDirectMessages(criteria.recipient_email);
    }
    return Promise.resolve([]);
  },
  get: (id) => apiClient.getDirectMessage(id),
  update: (id, data) => apiClient.updateDirectMessage(id, data),
  delete: (id) => apiClient.deleteDirectMessage(id),
};

export const Channel = {
  create: (data) => apiClient.createChannel(data),
  filter: (criteria) => {
    if (criteria.organization_id) {
      return apiClient.getChannels(criteria.organization_id);
    }
    return Promise.resolve([]);
  },
  get: (id) => apiClient.getChannel(id),
  update: (id, data) => apiClient.updateChannel(id, data),
  delete: (id) => apiClient.deleteChannel(id),
};

export const ChannelMessage = {
  create: (data) => apiClient.sendChannelMessage(data.channel_id, data),
  filter: (criteria) => {
    if (criteria.channel_id) {
      return apiClient.getChannelMessages(criteria.channel_id);
    }
    return Promise.resolve([]);
  },
  get: (id) => apiClient.getChannelMessage(id),
  update: (id, data) => apiClient.updateChannelMessage(id, data),
  delete: (id) => apiClient.deleteChannelMessage(id),
};

export const Team = {
  create: (data) => apiClient.createTeam(data),
  filter: (criteria) => {
    if (criteria.organization_id) {
      return apiClient.getTeams(criteria.organization_id);
    }
    return Promise.resolve([]);
  },
  get: (id) => apiClient.getTeam(id),
  update: (id, data) => apiClient.updateTeam(id, data),
  delete: (id) => apiClient.deleteTeam(id),
};

export const CollaborationRoom = {
  create: (data) => apiClient.createCollaborationRoom(data),
  filter: (criteria) => {
    if (criteria.organization_id) {
      return apiClient.getCollaborationRooms(criteria.organization_id);
    }
    return Promise.resolve([]);
  },
  get: (id) => apiClient.getCollaborationRoom(id),
  update: (id, data) => apiClient.updateCollaborationRoom(id, data),
  delete: (id) => apiClient.deleteCollaborationRoom(id),
};

export const GroupMessage = {
  create: (data) => apiClient.sendRoomMessage(data.room_id, data),
  filter: (criteria) => {
    if (criteria.room_id) {
      return apiClient.getRoomMessages(criteria.room_id);
    }
    return Promise.resolve([]);
  },
  get: (id) => apiClient.getRoomMessage(id),
  update: (id, data) => apiClient.updateRoomMessage(id, data),
  delete: (id) => apiClient.deleteRoomMessage(id),
};

// API-based User entity
export const User = {
  me: () => apiClient.me(),
  logout: () => apiClient.logout(),
  updateMyUserData: (data) => apiClient.updateProfile(data),
  signup: (userData) => apiClient.signup(userData),
  login: (email, password) => apiClient.login(email, password),
  isAuthenticated: () => !!apiClient.token,
  getUserByEmail: (email) => apiClient.getUserByEmail(email),
  updateUserByEmail: (email, data) => apiClient.updateUserByEmail(email, data),
  filter: (criteria) => apiClient.getUsers(criteria),
};
