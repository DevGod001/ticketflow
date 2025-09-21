// Local Join Request Management Service for Development
class LocalJoinRequestService {
  constructor() {
    this.JOIN_REQUESTS_KEY = 'ticketflow_join_requests';
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.JOIN_REQUESTS_KEY)) {
      localStorage.setItem(this.JOIN_REQUESTS_KEY, JSON.stringify({}));
    }
  }

  // Get all join requests from localStorage
  getJoinRequests() {
    return JSON.parse(localStorage.getItem(this.JOIN_REQUESTS_KEY) || '{}');
  }

  // Save join requests to localStorage
  saveJoinRequests(requests) {
    localStorage.setItem(this.JOIN_REQUESTS_KEY, JSON.stringify(requests));
  }

  // Generate unique request ID
  generateId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create a new join request
  async create(requestData) {
    const requests = this.getJoinRequests();
    const id = this.generateId();
    
    const newRequest = {
      id,
      user_email: requestData.user_email,
      organization_id: requestData.organization_id,
      message: requestData.message || '',
      status: requestData.status || 'pending',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    requests[id] = newRequest;
    this.saveJoinRequests(requests);
    
    return { ...newRequest };
  }

  // Get join request by ID
  async get(id) {
    const requests = this.getJoinRequests();
    const request = requests[id];
    
    if (!request) {
      throw new Error('Join request not found');
    }
    
    return { ...request };
  }

  // Filter join requests
  async filter(criteria, sortBy = null) {
    const requests = this.getJoinRequests();
    let requestList = Object.values(requests);
    
    if (criteria) {
      requestList = requestList.filter(request => {
        return Object.keys(criteria).every(key => {
          if (key === 'user_email') {
            return request.user_email === criteria[key];
          }
          if (key === 'organization_id') {
            return request.organization_id === criteria[key];
          }
          if (key === 'status') {
            return request.status === criteria[key];
          }
          return request[key] === criteria[key];
        });
      });
    }

    // Sort by created_date descending if sortBy is provided
    if (sortBy === '-created_date') {
      requestList.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
    
    return requestList;
  }

  // Update join request
  async update(id, updates) {
    const requests = this.getJoinRequests();
    const request = requests[id];
    
    if (!request) {
      throw new Error('Join request not found');
    }
    
    const updatedRequest = {
      ...request,
      ...updates,
      updated_date: new Date().toISOString()
    };
    
    requests[id] = updatedRequest;
    this.saveJoinRequests(requests);
    
    return { ...updatedRequest };
  }

  // Delete join request
  async delete(id) {
    const requests = this.getJoinRequests();
    
    if (!requests[id]) {
      throw new Error('Join request not found');
    }
    
    delete requests[id];
    this.saveJoinRequests(requests);
    
    return { success: true };
  }
}

export const localJoinRequest = new LocalJoinRequestService();

// Create local join request methods that match Base44 API
export const LocalJoinRequest = {
  create: (data) => localJoinRequest.create(data),
  get: (id) => localJoinRequest.get(id),
  filter: (criteria, sortBy) => localJoinRequest.filter(criteria, sortBy),
  update: (id, data) => localJoinRequest.update(id, data),
  delete: (id) => localJoinRequest.delete(id),
};
