// Local Authentication Service for Development
class LocalAuthService {
  constructor() {
    this.USERS_KEY = 'ticketflow_users';
    this.SESSION_KEY = 'ticketflow_session';
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.USERS_KEY)) {
      localStorage.setItem(this.USERS_KEY, JSON.stringify({}));
    }
  }

  // Get all users from localStorage
  getUsers() {
    return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
  }

  // Save users to localStorage
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  // Get current session
  getCurrentSession() {
    const session = localStorage.getItem(this.SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }

  // Save current session
  saveSession(user) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      email: user.email,
      loginTime: new Date().toISOString()
    }));
  }

  // Clear current session
  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // Sign up a new user
  async signup(userData) {
    const { email, password, full_name, position } = userData;
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const users = this.getUsers();
    
    if (users[email]) {
      throw new Error('User already exists with this email');
    }

    const newUser = {
      email,
      password, // In a real app, this would be hashed
      full_name: full_name || '',
      position: position || 'Team Member',
      bio: '',
      phone: '',
      avatar_url: null,
      created_date: new Date().toISOString(),
      active_organization_id: null,
      verified_organizations: [] // Initialize empty array for organizations
    };

    users[email] = newUser;
    this.saveUsers(users);
    
    // Auto-login after signup
    this.saveSession(newUser);
    
    return { ...newUser };
  }

  // Login user
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const users = this.getUsers();
    const user = users[email];

    if (!user) {
      throw new Error('User not found');
    }

    if (user.password !== password) {
      throw new Error('Invalid password');
    }

    this.saveSession(user);
    return { ...user };
  }

  // Get current user (equivalent to User.me())
  async me() {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const users = this.getUsers();
    const user = users[session.email];

    if (!user) {
      this.clearSession();
      throw new Error('User not found');
    }

    // Ensure user has required fields for organization functionality
    if (!user.verified_organizations) {
      user.verified_organizations = [];
    }
    if (!user.active_organization_id) {
      user.active_organization_id = null;
    }

    return { ...user };
  }

  // Logout user
  async logout() {
    this.clearSession();
    return { success: true };
  }

  // Update user data
  async updateMyUserData(updates) {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const users = this.getUsers();
    const user = users[session.email];

    if (!user) {
      throw new Error('User not found');
    }

    // Update user data
    Object.assign(user, updates);
    users[session.email] = user;
    this.saveUsers(users);

    return { ...user };
  }

  // Check if user is authenticated
  isAuthenticated() {
    const session = this.getCurrentSession();
    return !!session;
  }

  // Get user by email (for profile viewing)
  async getUserByEmail(email) {
    const users = this.getUsers();
    const user = users[email];
    
    if (!user) {
      throw new Error('User not found');
    }

    return { ...user };
  }

  // Update any user's data by email (for admin operations like approving join requests)
  async updateUserByEmail(email, updates) {
    const users = this.getUsers();
    const user = users[email];

    if (!user) {
      throw new Error('User not found');
    }

    // Update user data
    Object.assign(user, updates);
    users[email] = user;
    this.saveUsers(users);

    return { ...user };
  }

  // Filter users by criteria (for invitation system)
  async filter(criteria = {}) {
    const users = this.getUsers();
    let results = Object.values(users);

    // Apply filters
    if (criteria.email) {
      results = results.filter(user => user.email === criteria.email);
    }
    
    if (criteria.full_name) {
      results = results.filter(user => 
        user.full_name?.toLowerCase().includes(criteria.full_name.toLowerCase())
      );
    }

    if (criteria.position) {
      results = results.filter(user => 
        user.position?.toLowerCase().includes(criteria.position.toLowerCase())
      );
    }

    return results;
  }
}

export const localAuth = new LocalAuthService();
