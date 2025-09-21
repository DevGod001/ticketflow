// Local Organization Management Service for Development
class LocalOrganizationService {
  constructor() {
    this.ORGS_KEY = 'ticketflow_organizations';
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.ORGS_KEY)) {
      localStorage.setItem(this.ORGS_KEY, JSON.stringify({}));
    }
  }

  // Get all organizations from localStorage
  getOrganizations() {
    return JSON.parse(localStorage.getItem(this.ORGS_KEY) || '{}');
  }

  // Save organizations to localStorage
  saveOrganizations(orgs) {
    localStorage.setItem(this.ORGS_KEY, JSON.stringify(orgs));
  }

  // Generate unique organization ID
  generateId() {
    return `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create a new organization
  async create(orgData) {
    const orgs = this.getOrganizations();
    const id = this.generateId();
    
    const newOrg = {
      id,
      name: orgData.name,
      description: orgData.description || '',
      organization_id: orgData.organization_id,
      owner_email: orgData.owner_email,
      admins: orgData.admins || [],
      managers: orgData.managers || [],
      members: orgData.members || [orgData.owner_email],
      member_profiles: orgData.member_profiles || [],
      settings: orgData.settings || {
        allow_public_join: false,
        require_approval: true
      },
      permissions: orgData.permissions || {
        // Owner (Super Admin) - Full access to everything
        owner: {
          manage_organization: true,
          manage_roles: true,
          manage_members: true,
          manage_departments: true,
          manage_teams: true,
          manage_tickets: true,
          manage_channels: true,
          view_analytics: true,
          manage_settings: true,
          delete_organization: true
        },
        // Admin - High-level management, cannot delete org or change owner
        admin: {
          manage_organization: false,
          manage_roles: true,
          manage_members: true,
          manage_departments: true,
          manage_teams: true,
          manage_tickets: true,
          manage_channels: true,
          view_analytics: true,
          manage_settings: true,
          delete_organization: false
        },
        // Manager - Mid-level management, limited role management
        manager: {
          manage_organization: false,
          manage_roles: false, // Can only manage members, not roles
          manage_members: true,
          manage_departments: true,
          manage_teams: true,
          manage_tickets: true,
          manage_channels: true,
          view_analytics: false,
          manage_settings: false,
          delete_organization: false
        },
        // Member - Basic access
        member: {
          manage_organization: false,
          manage_roles: false,
          manage_members: false,
          manage_departments: false,
          manage_teams: false,
          manage_tickets: true, // Can manage their own tickets
          manage_channels: false,
          view_analytics: false,
          manage_settings: false,
          delete_organization: false
        }
      },
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    orgs[id] = newOrg;
    this.saveOrganizations(orgs);
    
    return { ...newOrg };
  }

  // Get organization by ID
  async get(id) {
    const orgs = this.getOrganizations();
    const org = orgs[id];
    
    if (!org) {
      throw new Error('Organization not found');
    }
    
    return { ...org };
  }

  // Filter organizations
  async filter(criteria) {
    const orgs = this.getOrganizations();
    const orgList = Object.values(orgs);
    
    if (!criteria) {
      return orgList;
    }

    return orgList.filter(org => {
      // Handle organization_id filter
      if (criteria.organization_id) {
        return org.organization_id === criteria.organization_id;
      }
      
      // Handle id filter with $in operator
      if (criteria.id && criteria.id.$in) {
        return criteria.id.$in.includes(org.id);
      }
      
      // Handle direct id filter
      if (criteria.id) {
        return org.id === criteria.id;
      }
      
      // Handle other simple filters
      return Object.keys(criteria).every(key => {
        if (key === 'id') return true; // Already handled above
        return org[key] === criteria[key];
      });
    });
  }

  // Update organization
  async update(id, updates) {
    const orgs = this.getOrganizations();
    const org = orgs[id];
    
    if (!org) {
      throw new Error('Organization not found');
    }
    
    const updatedOrg = {
      ...org,
      ...updates,
      updated_date: new Date().toISOString()
    };
    
    orgs[id] = updatedOrg;
    this.saveOrganizations(orgs);
    
    return { ...updatedOrg };
  }

  // Delete organization
  async delete(id) {
    const orgs = this.getOrganizations();
    
    if (!orgs[id]) {
      throw new Error('Organization not found');
    }
    
    delete orgs[id];
    this.saveOrganizations(orgs);
    
    return { success: true };
  }

  // Get organizations for a user
  async getUserOrganizations(userEmail) {
    const orgs = this.getOrganizations();
    return Object.values(orgs).filter(org => 
      org.members.includes(userEmail) || 
      org.owner_email === userEmail
    );
  }
}

export const localOrganization = new LocalOrganizationService();

// Create local organization methods that match Base44 API
export const LocalOrganization = {
  create: (data) => localOrganization.create(data),
  get: (id) => localOrganization.get(id),
  filter: (criteria) => localOrganization.filter(criteria),
  update: (id, data) => localOrganization.update(id, data),
  delete: (id) => localOrganization.delete(id),
};
