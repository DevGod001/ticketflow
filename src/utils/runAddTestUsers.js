// Temporary script to add test users to the organization
import { addTestUsersToOrganization } from './addTestUsers.js';

// Function to run the test user addition
const runAddTestUsers = async () => {
  try {
    // The organization ID should be "TESTCO-880625" based on what I saw in the browser
    const organizationId = 'TESTCO-880625';
    
    console.log('Adding test users to organization:', organizationId);
    const result = await addTestUsersToOrganization(organizationId);
    console.log('Test users added successfully:', result);
  } catch (error) {
    console.error('Failed to add test users:', error);
  }
};

// Run the function
runAddTestUsers();
