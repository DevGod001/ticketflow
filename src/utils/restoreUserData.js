// Utility to restore essential user data after storage cleanup
export const restoreEssentialData = () => {
  console.log('🔄 Restoring essential user data...');
  
  // Create a default user account
  const defaultUser = {
    id: 'user-1',
    email: 'paul.omogie@example.com',
    password: 'password123',
    full_name: 'Paul A Omogie',
    position: 'Owner',
    bio: 'System Administrator',
    phone: '+1-555-0100',
    avatar_url: null,
    verified_organizations: ['org-1'],
    active_organization_id: 'org-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Create default organization
  const defaultOrg = {
    id: 'org-1',
    name: 'TicketFlow Organization',
    description: 'Default organization for TicketFlow',
    owner_email: 'paul.omogie@example.com',
    members: [
      'paul.omogie@example.com',
      'alice.manager@example.com',
      'bob.developer@example.com',
      'carol.designer@example.com'
    ],
    member_profiles: [
      {
        email: 'paul.omogie@example.com',
        full_name: 'Paul A Omogie',
        position: 'Owner',
        avatar_url: null,
        bio: 'System Administrator',
        phone: '+1-555-0100'
      },
      {
        email: 'alice.manager@example.com',
        full_name: 'Alice Johnson',
        position: 'Team Member',
        avatar_url: null,
        bio: 'Project Manager',
        phone: '+1-555-0101'
      },
      {
        email: 'bob.developer@example.com',
        full_name: 'Bob Smith',
        position: 'Team Member',
        avatar_url: null,
        bio: 'Senior Developer',
        phone: '+1-555-0102'
      },
      {
        email: 'carol.designer@example.com',
        full_name: 'Carol Williams',
        position: 'Team Member',
        avatar_url: null,
        bio: 'UX Designer',
        phone: '+1-555-0103'
      }
    ],
    admins: ['paul.omogie@example.com'],
    managers: ['paul.omogie@example.com', 'alice.manager@example.com'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Create additional team members
  const teamMembers = [
    {
      id: 'user-2',
      email: 'alice.manager@example.com',
      password: 'password123',
      full_name: 'Alice Johnson',
      position: 'Team Member',
      bio: 'Project Manager',
      phone: '+1-555-0101',
      avatar_url: null,
      verified_organizations: ['org-1'],
      active_organization_id: 'org-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'user-3',
      email: 'bob.developer@example.com',
      password: 'password123',
      full_name: 'Bob Smith',
      position: 'Team Member',
      bio: 'Senior Developer',
      phone: '+1-555-0102',
      avatar_url: null,
      verified_organizations: ['org-1'],
      active_organization_id: 'org-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'user-4',
      email: 'carol.designer@example.com',
      password: 'password123',
      full_name: 'Carol Williams',
      position: 'Team Member',
      bio: 'UX Designer',
      phone: '+1-555-0103',
      avatar_url: null,
      verified_organizations: ['org-1'],
      active_organization_id: 'org-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Restore users
  const allUsers = [defaultUser, ...teamMembers];
  localStorage.setItem('ticketflow_users', JSON.stringify(allUsers));
  console.log('✅ Users restored:', allUsers.length);

  // Restore organization
  localStorage.setItem('ticketflow_organizations', JSON.stringify([defaultOrg]));
  console.log('✅ Organization restored');

  // Initialize empty arrays for other data structures
  const emptyArrays = [
    'ticketflow_tickets',
    'ticketflow_departments',
    'ticketflow_notifications',
    'ticketflow_direct_messages',
    'ticketflow_comments',
    'collaboration_rooms',
    'ticketflow_group_messages',
    'ticketflow_join_requests'
  ];

  emptyArrays.forEach(key => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify([]));
    }
  });

  console.log('✅ Data structures initialized');
  console.log('🎉 User data restoration complete!');
  console.log('📧 Login with: paul.omogie@example.com / password123');
  
  return {
    users: allUsers,
    organization: defaultOrg,
    message: 'User data restored successfully!'
  };
};

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  window.restoreUserData = restoreEssentialData;
}

export default restoreEssentialData;
