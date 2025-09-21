// Utility to fix existing user records that might be missing required fields
export const fixUserRecords = () => {
  try {
    const usersData = localStorage.getItem('ticketflow_users');
    if (!usersData) {
      console.log('No users found to fix');
      return true;
    }

    const users = JSON.parse(usersData);
    let updated = false;

    // Fix each user record
    Object.keys(users).forEach(email => {
      const user = users[email];
      
      // Add missing verified_organizations array
      if (!user.verified_organizations) {
        user.verified_organizations = [];
        updated = true;
        console.log(`Added verified_organizations to user: ${email}`);
      }
      
      // Ensure active_organization_id exists (can be null)
      if (user.active_organization_id === undefined) {
        user.active_organization_id = null;
        updated = true;
        console.log(`Added active_organization_id to user: ${email}`);
      }
    });

    if (updated) {
      localStorage.setItem('ticketflow_users', JSON.stringify(users));
      console.log('User records updated successfully');
    } else {
      console.log('No user records needed updating');
    }

    return true;
  } catch (error) {
    console.error('Error fixing user records:', error);
    return false;
  }
};

// Run this in browser console to fix existing user records:
// import { fixUserRecords } from './src/utils/fixUserRecords.js'; fixUserRecords();
