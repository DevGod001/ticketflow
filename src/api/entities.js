import { base44 } from './base44Client.js';
import { localAuth } from '../services/localAuth.js';
import { LocalOrganization } from '../services/localOrganization.js';
import { LocalJoinRequest } from '../services/localJoinRequest.js';
import { LocalNotification } from '../services/localNotification.js';
import { LocalDepartment } from '../services/localDepartment.js';
import { LocalTeam } from '../services/localTeam.js';
import { LocalTicket } from '../services/localTicket.js';
import { LocalDirectMessage } from '../services/localDirectMessage.js';
import { LocalComment } from '../services/localComment.js';
import { LocalCollaborationRoom } from '../services/localCollaborationRoom.js';
import { LocalGroupMessage } from '../services/localGroupMessage.js';
import { LocalChannel } from '../services/localChannel.js';
import { LocalChannelMessage } from '../services/localChannelMessage.js';


export const Organization = LocalOrganization;

export const Department = LocalDepartment;

export const Ticket = LocalTicket;

export const Comment = LocalComment;

export const Notification = LocalNotification;

export const JoinRequest = LocalJoinRequest;

export const DirectMessage = LocalDirectMessage;

export const Channel = LocalChannel;

export const ChannelMessage = LocalChannelMessage;

export const Team = LocalTeam;

export const CollaborationRoom = LocalCollaborationRoom;

export const GroupMessage = LocalGroupMessage;

// Override Base44 auth with local authentication for development
export const User = {
  // Use local auth methods
  me: () => localAuth.me(),
  logout: () => localAuth.logout(),
  updateMyUserData: (data) => localAuth.updateMyUserData(data),
  
  // Add local auth specific methods
  signup: (userData) => localAuth.signup(userData),
  login: (email, password) => localAuth.login(email, password),
  isAuthenticated: () => localAuth.isAuthenticated(),
  getUserByEmail: (email) => localAuth.getUserByEmail(email),
  updateUserByEmail: (email, data) => localAuth.updateUserByEmail(email, data),
  filter: (criteria) => localAuth.filter(criteria), // Use local filter instead of Base44
  
  // Keep Base44 methods for other user operations if needed (but not commonly used)
  get: base44.auth.get,
  create: base44.auth.create,
  update: base44.auth.update,
  delete: base44.auth.delete,
};
