// Complete fix for user records and session - no signup needed!
console.log('🔧 Fixing user records and session...');

try {
  // Fix user records
  const users = JSON.parse(localStorage.getItem('ticketflow_users') || '{}');
  let userCount = 0;
  
  Object.keys(users).forEach(email => {
    const user = users[email];
    let updated = false;
    
    // Add missing verified_organizations array
    if (!user.verified_organizations) {
      user.verified_organizations = [];
      updated = true;
    }
    
    // Ensure active_organization_id exists
    if (user.active_organization_id === undefined) {
      user.active_organization_id = null;
      updated = true;
    }
    
    if (updated) {
      console.log(`✅ Fixed user: ${email}`);
      userCount++;
    }
  });
  
  // Fix organization ownership
  const orgs = JSON.parse(localStorage.getItem('ticketflow_organizations') || '{}');
  let orgCount = 0;
  
  Object.keys(orgs).forEach(orgId => {
    const org = orgs[orgId];
    const ownerEmail = org.owner_email;
    
    if (ownerEmail && users[ownerEmail]) {
      const owner = users[ownerEmail];
      let ownerUpdated = false;
      
      // Add organization to owner's verified_organizations if not already there
      if (!owner.verified_organizations.includes(orgId)) {
        owner.verified_organizations.push(orgId);
        ownerUpdated = true;
      }
      
      // Set as active organization if owner doesn't have one
      if (!owner.active_organization_id) {
        owner.active_organization_id = orgId;
        ownerUpdated = true;
      }
      
      if (ownerUpdated) {
        console.log(`✅ Fixed organization owner: ${ownerEmail} for org: ${org.name}`);
        orgCount++;
      }
    }
  });
  
  // Save all updates
  localStorage.setItem('ticketflow_users', JSON.stringify(users));
  
  if (userCount > 0) {
    console.log(`🎉 Fixed ${userCount} user records!`);
  }
  if (orgCount > 0) {
    console.log(`🎉 Fixed ${orgCount} organization ownerships!`);
  }
  
  // Check if user is currently logged in and update session if needed
  const session = localStorage.getItem('ticketflow_session');
  if (session) {
    const sessionData = JSON.parse(session);
    const currentUserEmail = sessionData.email;
    
    if (users[currentUserEmail]) {
      console.log(`🔄 Current user session: ${currentUserEmail}`);
      console.log(`📋 User organizations: ${users[currentUserEmail].verified_organizations}`);
      console.log(`🎯 Active organization: ${users[currentUserEmail].active_organization_id}`);
      
      if (users[currentUserEmail].active_organization_id) {
        console.log('✅ User has active organization - Team page should work!');
      } else {
        console.log('⚠️ User has no active organization - will see "No Active Organization"');
      }
    }
  } else {
    console.log('ℹ️ No user currently logged in');
  }
  
  console.log('🚀 All done! Now:');
  console.log('1. If you see "No user currently logged in" above, please login');
  console.log('2. If you see "User has active organization", refresh the page');
  console.log('3. Go to Team page - you should see team members!');
  
} catch (error) {
  console.error('❌ Error fixing records:', error);
}
