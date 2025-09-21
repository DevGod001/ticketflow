// Debug utility to check user data and organization membership
export const debugUserData = async () => {
  try {
    console.log('🔍 Debugging user data and organization membership...');
    
    // Check session
    const session = localStorage.getItem('ticketflow_session');
    if (!session) {
      console.log('❌ No session found');
      return;
    }
    
    const sessionData = JSON.parse(session);
    console.log('📋 Current session:', sessionData);
    
    // Check user data
    const users = JSON.parse(localStorage.getItem('ticketflow_users') || '{}');
    const currentUser = users[sessionData.email];
    
    if (!currentUser) {
      console.log('❌ User not found in localStorage');
      return;
    }
    
    console.log('👤 Current user data:');
    console.log('  - Email:', currentUser.email);
    console.log('  - Full Name:', currentUser.full_name);
    console.log('  - Verified Organizations:', currentUser.verified_organizations);
    console.log('  - Active Organization ID:', currentUser.active_organization_id);
    
    // Check organizations
    const orgs = JSON.parse(localStorage.getItem('ticketflow_organizations') || '{}');
    console.log('🏢 Available organizations:', Object.keys(orgs).length);
    
    Object.keys(orgs).forEach(orgId => {
      const org = orgs[orgId];
      console.log(`  - ${org.name} (${org.organization_id})`);
      console.log(`    Owner: ${org.owner_email}`);
      console.log(`    Members: ${org.members?.length || 0}`);
      console.log(`    Is user member: ${org.members?.includes(currentUser.email)}`);
      console.log(`    Is user owner: ${org.owner_email === currentUser.email}`);
    });
    
    // Check what should happen
    if (currentUser.active_organization_id) {
      const activeOrg = orgs[currentUser.active_organization_id];
      if (activeOrg) {
        console.log('✅ User has active organization:', activeOrg.name);
        console.log('✅ Team page should show team members');
      } else {
        console.log('❌ Active organization ID exists but organization not found');
      }
    } else {
      console.log('❌ User has no active organization ID');
      console.log('❌ Team page will show "No Active Organization"');
    }
    
  } catch (error) {
    console.error('❌ Error debugging user data:', error);
  }
};

// Run this in browser console: debugUserData()
