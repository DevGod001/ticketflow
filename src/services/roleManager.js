// Role Management Service for Enterprise-Standard RBAC
class RoleManagerService {
  constructor() {
    this.ROLE_HIERARCHY = {
      owner: 4,    // Super Admin
      admin: 3,    // High-level Admin
      manager: 2,  // Mid-level Manager
      member: 1    // Basic Member
    };
  }

  /**
   * Get user's role in an organization
   * @param {Object} organization - Organization object
   * @param {string} userEmail - User's email
   * @returns {string} Role name (owner, admin, manager, member)
   */
  getUserRole(organization, userEmail) {
    if (!organization || !userEmail) return 'member';
    
    if (organization.owner_email === userEmail) return 'owner';
    if (organization.admins?.includes(userEmail)) return 'admin';
    if (organization.managers?.includes(userEmail)) return 'manager';
    return 'member';
  }

  /**
   * Get user's role level (numeric)
   * @param {Object} organization - Organization object
   * @param {string} userEmail - User's email
   * @returns {number} Role level (1-4)
   */
  getUserRoleLevel(organization, userEmail) {
    const role = this.getUserRole(organization, userEmail);
    return this.ROLE_HIERARCHY[role] || 1;
  }

  /**
   * Check if user has specific permission
   * @param {Object} organization - Organization object
   * @param {string} userEmail - User's email
   * @param {string} permission - Permission to check
   * @returns {boolean} Whether user has permission
   */
  hasPermission(organization, userEmail, permission) {
    if (!organization || !userEmail || !permission) return false;
    
    const role = this.getUserRole(organization, userEmail);
    const permissions = organization.permissions?.[role];
    
    if (!permissions) return false;
    
    return permissions[permission] === true;
  }

  /**
   * Check if user can manage another user (based on role hierarchy)
   * @param {Object} organization - Organization object
   * @param {string} managerEmail - Manager's email
   * @param {string} targetEmail - Target user's email
   * @returns {boolean} Whether manager can manage target user
   */
  canManageUser(organization, managerEmail, targetEmail) {
    if (!organization || !managerEmail || !targetEmail) return false;
    
    // Can't manage yourself
    if (managerEmail === targetEmail) return false;
    
    // Can't manage the owner
    if (organization.owner_email === targetEmail) return false;
    
    const managerLevel = this.getUserRoleLevel(organization, managerEmail);
    const targetLevel = this.getUserRoleLevel(organization, targetEmail);
    
    // Must have higher role level to manage
    return managerLevel > targetLevel;
  }

  /**
   * Check if user can assign a specific role
   * @param {Object} organization - Organization object
   * @param {string} userEmail - User's email
   * @param {string} roleToAssign - Role to assign
   * @returns {boolean} Whether user can assign this role
   */
  canAssignRole(organization, userEmail, roleToAssign) {
    if (!organization || !userEmail || !roleToAssign) return false;
    
    const userRole = this.getUserRole(organization, userEmail);
    const userLevel = this.ROLE_HIERARCHY[userRole];
    
    // Only owner can assign owner role (transfer ownership)
    if (roleToAssign === 'owner') {
      return userRole === 'owner';
    }
    
    // Only owner and admin can assign admin role
    if (roleToAssign === 'admin') {
      return userRole === 'owner' || userRole === 'admin';
    }
    
    // Owner, admin, and manager can assign manager role
    if (roleToAssign === 'manager') {
      return userLevel >= this.ROLE_HIERARCHY.manager;
    }
    
    // Owner, admin, and manager can assign member role (for demotion)
    if (roleToAssign === 'member') {
      return userLevel >= this.ROLE_HIERARCHY.manager;
    }
    
    return false;
  }

  /**
   * Assign role to a user
   * @param {Object} organization - Organization object
   * @param {string} assignerEmail - Email of user assigning role
   * @param {string} targetEmail - Email of user receiving role
   * @param {string} newRole - New role to assign
   * @returns {Object} Updated organization object
   */
  assignRole(organization, assignerEmail, targetEmail, newRole) {
    if (!this.canAssignRole(organization, assignerEmail, newRole)) {
      throw new Error('Insufficient permissions to assign this role');
    }

    if (!organization.members.includes(targetEmail)) {
      throw new Error('User is not a member of this organization');
    }

    // Remove user from all role arrays first
    const updatedOrg = {
      ...organization,
      admins: (organization.admins || []).filter(email => email !== targetEmail),
      managers: (organization.managers || []).filter(email => email !== targetEmail)
    };

    // Handle ownership transfer
    if (newRole === 'owner') {
      if (organization.owner_email !== assignerEmail) {
        throw new Error('Only current owner can transfer ownership');
      }
      
      // Move current owner to admin role
      updatedOrg.admins = [...updatedOrg.admins, organization.owner_email];
      updatedOrg.owner_email = targetEmail;
      
      return updatedOrg;
    }

    // Add user to appropriate role array
    switch (newRole) {
      case 'admin':
        updatedOrg.admins = [...updatedOrg.admins, targetEmail];
        break;
      case 'manager':
        updatedOrg.managers = [...updatedOrg.managers, targetEmail];
        break;
      case 'member':
        // Already removed from other arrays, nothing more to do
        break;
      default:
        throw new Error('Invalid role specified');
    }

    return updatedOrg;
  }

  /**
   * Get all available roles that a user can assign
   * @param {Object} organization - Organization object
   * @param {string} userEmail - User's email
   * @returns {Array} Array of assignable roles
   */
  getAssignableRoles(organization, userEmail) {
    const roles = [];
    
    if (this.canAssignRole(organization, userEmail, 'member')) {
      roles.push('member');
    }
    
    if (this.canAssignRole(organization, userEmail, 'manager')) {
      roles.push('manager');
    }
    
    if (this.canAssignRole(organization, userEmail, 'admin')) {
      roles.push('admin');
    }
    
    if (this.canAssignRole(organization, userEmail, 'owner')) {
      roles.push('owner');
    }
    
    return roles;
  }

  /**
   * Get role display information
   * @param {string} role - Role name
   * @returns {Object} Role display info with icon, color, and description
   */
  getRoleDisplayInfo(role) {
    const roleInfo = {
      owner: {
        label: 'Owner',
        description: 'Super Admin - Full control over organization',
        icon: 'Crown',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        level: 4
      },
      admin: {
        label: 'Admin',
        description: 'High-level management and configuration access',
        icon: 'Shield',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        level: 3
      },
      manager: {
        label: 'Manager',
        description: 'Mid-level management of teams and projects',
        icon: 'Users',
        color: 'bg-green-100 text-green-800 border-green-200',
        level: 2
      },
      member: {
        label: 'Member',
        description: 'Basic access to organization resources',
        icon: 'User',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        level: 1
      }
    };

    return roleInfo[role] || roleInfo.member;
  }

  /**
   * Get organization statistics by role
   * @param {Object} organization - Organization object
   * @returns {Object} Role statistics
   */
  getRoleStatistics(organization) {
    if (!organization) return {};

    const stats = {
      owner: 1, // Always exactly 1 owner
      admin: (organization.admins || []).length,
      manager: (organization.managers || []).length,
      member: 0
    };

    // Calculate members (total - owner - admins - managers)
    const totalMembers = (organization.members || []).length;
    stats.member = totalMembers - stats.owner - stats.admin - stats.manager;

    return stats;
  }

  /**
   * Validate organization role structure
   * @param {Object} organization - Organization object
   * @returns {Object} Validation result with errors if any
   */
  validateRoleStructure(organization) {
    const errors = [];
    
    if (!organization.owner_email) {
      errors.push('Organization must have an owner');
    }

    // Check for duplicate roles
    const admins = organization.admins || [];
    const managers = organization.managers || [];
    
    const adminManagerOverlap = admins.filter(email => managers.includes(email));
    if (adminManagerOverlap.length > 0) {
      errors.push(`Users cannot be both admin and manager: ${adminManagerOverlap.join(', ')}`);
    }

    // Check if owner is in other role arrays
    if (admins.includes(organization.owner_email)) {
      errors.push('Owner cannot also be an admin');
    }
    
    if (managers.includes(organization.owner_email)) {
      errors.push('Owner cannot also be a manager');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const roleManager = new RoleManagerService();
