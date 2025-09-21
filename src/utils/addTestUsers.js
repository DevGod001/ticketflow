// Utility to add test users for demonstrating role assignment functionality
import { User } from '../api/entities.js';
import { Organization } from '../api/entities.js';

export const addTestUsersToOrganization = async (organizationId) => {
  try {
    // Get the current organization
    const org = await Organization.get(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Test users to add
    const testUsers = [
      {
        email: 'alice.manager@example.com',
        full_name: 'Alice Johnson',
        position: 'Project Manager',
        bio: 'Experienced project manager with 5+ years in tech',
        phone: '+1-555-0101'
      },
      {
        email: 'bob.developer@example.com',
        full_name: 'Bob Smith',
        position: 'Senior Developer',
        bio: 'Full-stack developer specializing in React and Node.js',
        phone: '+1-555-0102'
      },
      {
        email: 'carol.designer@example.com',
        full_name: 'Carol Williams',
        position: 'UX Designer',
        bio: 'Creative designer focused on user experience and accessibility',
        phone: '+1-555-0103'
      }
    ];

    // Create test users in the system
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUsers = await User.filter({ email: userData.email });
        if (existingUsers.length === 0) {
          // Create the user account
          await User.create({
            ...userData,
            password: 'testpassword123',
            verified_organizations: [organizationId],
            active_organization_id: organizationId
          });
          console.log(`Created test user: ${userData.email}`);
        }
      } catch (error) {
        console.error(`Error creating user ${userData.email}:`, error);
      }
    }

    // Add test users to organization members
    const updatedMembers = [
      ...new Set([
        ...org.members,
        ...testUsers.map(user => user.email)
      ])
    ];

    // Create member profiles for the test users
    const newMemberProfiles = testUsers.map(user => ({
      email: user.email,
      full_name: user.full_name,
      position: user.position,
      avatar_url: null,
      bio: user.bio,
      phone: user.phone
    }));

    // Update organization with new members
    const updatedOrg = await Organization.update(organizationId, {
      members: updatedMembers,
      member_profiles: [
        ...org.member_profiles.filter(profile => 
          !testUsers.some(user => user.email === profile.email)
        ),
        ...newMemberProfiles
      ]
    });

    console.log('Successfully added test users to organization');
    return updatedOrg;

  } catch (error) {
    console.error('Error adding test users:', error);
    throw error;
  }
};

// Function to remove test users (cleanup)
export const removeTestUsersFromOrganization = async (organizationId) => {
  try {
    const org = await Organization.get(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const testEmails = [
      'alice.manager@example.com',
      'bob.developer@example.com',
      'carol.designer@example.com'
    ];

    // Remove from organization
    const updatedMembers = org.members.filter(email => !testEmails.includes(email));
    const updatedMemberProfiles = org.member_profiles.filter(profile => 
      !testEmails.includes(profile.email)
    );
    const updatedAdmins = (org.admins || []).filter(email => !testEmails.includes(email));
    const updatedManagers = (org.managers || []).filter(email => !testEmails.includes(email));

    await Organization.update(organizationId, {
      members: updatedMembers,
      member_profiles: updatedMemberProfiles,
      admins: updatedAdmins,
      managers: updatedManagers
    });

    console.log('Successfully removed test users from organization');
    return true;

  } catch (error) {
    console.error('Error removing test users:', error);
    throw error;
  }
};
