import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Department } from "@/api/entities";
import { Team as TeamEntity } from "@/api/entities"; // Renamed to avoid conflict with `Team` component name
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, UserPlus, Building2, Users2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { roleManager } from "../services/roleManager";
import {
  addTestUsersToOrganization,
  removeTestUsersFromOrganization,
} from "../utils/addTestUsers";

import TeamMemberCard from "../components/team/TeamMemberCard";
import DepartmentOverview from "../components/team/DepartmentOverview";
import TeamOverview from "../components/team/TeamOverview";
import InviteTeamModal from "../components/team/InviteTeamModal";

export default function TeamPage() {
  // Renamed component from Team to TeamPage
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]); // This state will hold member profiles from organization.member_profiles
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // Renamed from searchQuery
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // Changed initial activeTab to "all"
  const [isLoading, setIsLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  // This `populateMemberProfiles` function is now responsible for ensuring member profiles
  // are complete and up-to-date in the organization object, including avatar URLs, bio, and phone.
  const populateMemberProfiles = async (org) => {
    if (!org) return [];

    // Ensure owner is always included in the members array and remove duplicates
    const allMemberEmails = [
      ...new Set([org.owner_email, ...(org.members || [])]),
    ];

    // Always refresh member profiles to ensure they have the latest user data
    // This ensures profile images, bio, and other user data are always up-to-date
    // The previous caching logic was preventing updates from showing in the team view

    // If profiles are missing, incomplete, or need a refresh, regenerate them
    const memberProfiles = [];
    const profilesToUpdate = []; // To track profiles that need updating in the DB

    for (const email of allMemberEmails) {
      try {
        let userProfile = {
          email,
          full_name: email.split("@")[0],
          position: "Team Member",
          avatar_url: null,
          bio: null, // Added bio field
          phone: null, // Added phone field
        };
        const userList = await User.filter({ email });

        if (userList.length > 0) {
          const u = userList[0];
          userProfile.full_name = u.full_name || email.split("@")[0];
          userProfile.position = u.position || "Team Member";
          userProfile.avatar_url = u.avatar_url;
          userProfile.bio = u.bio; // Populate bio
          userProfile.phone = u.phone; // Populate phone
        }

        if (email === org.owner_email) {
          userProfile.position = "Owner";
        }

        memberProfiles.push(userProfile);

        // Check if this profile needs to be updated in the organization's member_profiles
        const existingProfile = org.member_profiles?.find(
          (p) => p.email === email
        );
        if (
          !existingProfile ||
          existingProfile.full_name !== userProfile.full_name ||
          existingProfile.position !== userProfile.position ||
          existingProfile.avatar_url !== userProfile.avatar_url ||
          existingProfile.bio !== userProfile.bio || // Check for bio changes
          existingProfile.phone !== userProfile.phone
        ) {
          // Check for phone changes
          profilesToUpdate.push(userProfile);
        }
      } catch (e) {
        console.error(`Failed to fetch profile for ${email}`, e);
        // Add a minimal profile even if fetch fails
        memberProfiles.push({
          email: email,
          full_name: email.split("@")[0],
          position: email === org.owner_email ? "Owner" : "Team Member",
          avatar_url: null,
          bio: null,
          phone: null,
        });
      }
    }

    // Update the organization with the fresh profiles if changes were detected or if it was initially empty
    if (
      memberProfiles.length > 0 &&
      (profilesToUpdate.length > 0 ||
        !org.member_profiles ||
        org.member_profiles.length !== memberProfiles.length)
    ) {
      try {
        await Organization.update(org.id, {
          member_profiles: memberProfiles,
          members: allMemberEmails, // Ensure the 'members' array in the DB is also updated with all unique members including owner
        });
        console.log(
          "Updated organization with fresh member profiles and cleaned members array."
        );
      } catch (error) {
        console.error(
          "Error updating organization with member profiles:",
          error
        );
      }
    }

    return memberProfiles;
  };

  const loadTeamData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.active_organization_id) {
        // Fetch organization first
        const orgs = await Organization.filter({
          id: currentUser.active_organization_id,
        });
        if (orgs.length > 0) {
          const org = orgs[0];
          setOrganization(org);

          // Determine management permissions
          const userIsOwner = org.owner_email === currentUser.email;
          const userIsAdmin = org.admins?.includes(currentUser.email);
          setCanManage(userIsOwner || userIsAdmin);

          // Get or populate member profiles
          const profiles = await populateMemberProfiles(org); // Call without currentUser parameter
          setTeamMembers(profiles); // This will be organization.member_profiles

          // Fetch departments and teams in parallel
          const [orgDepartments, orgTeams] = await Promise.all([
            Department.filter({ organization_id: org.id }, "-created_date"),
            TeamEntity.filter({ organization_id: org.id }, "-created_date"), // Corrected to TeamEntity
          ]);
          setDepartments(orgDepartments);
          setTeams(orgTeams);
        } else {
          // Organization not found, clear state
          setOrganization(null);
          setTeamMembers([]);
          setDepartments([]);
          setTeams([]);
          setCanManage(false);
        }
      } else {
        // No active organization, clear state
        setOrganization(null);
        setTeamMembers([]);
        setDepartments([]);
        setTeams([]);
        setCanManage(false);
      }
    } catch (error) {
      console.error("Error loading team data:", error);
      // Reset all relevant states on error
      setUser(null);
      setOrganization(null);
      setTeamMembers([]);
      setDepartments([]);
      setTeams([]);
      setCanManage(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  // Handle removing member from team/department only
  const handleRemoveFromTeam = async (memberEmail) => {
    // Only owner can remove members
    if (!organization || !user || organization.owner_email !== user.email) {
      console.warn(
        "Permission denied: Only organization owner can remove members."
      );
      return;
    }

    try {
      // Remove member from any departments they are in
      const departmentUpdates = departments
        .filter((dept) => dept.members?.includes(memberEmail))
        .map((dept) =>
          Department.update(dept.id, {
            members: dept.members.filter((m) => m !== memberEmail),
          })
        );

      // Remove member from any teams they are in
      const teamUpdates = teams
        .filter((team) => team.members?.includes(memberEmail))
        .map((team) =>
          TeamEntity.update(team.id, {
            members: team.members.filter((m) => m !== memberEmail),
          })
        );

      // Perform team/department updates
      await Promise.all([...departmentUpdates, ...teamUpdates]);

      // Refresh data to reflect changes
      await loadTeamData();
    } catch (error) {
      console.error("Error removing member from team:", error);
    }
  };

  // Handle removing member from entire organization
  const handleRemoveFromOrganization = async (memberEmail) => {
    // Only owner can remove members from organization
    if (!organization || !user || organization.owner_email !== user.email) {
      console.warn(
        "Permission denied: Only organization owner can remove members."
      );
      return;
    }

    // Prevent owner from removing themselves
    if (memberEmail === organization.owner_email) {
      alert("Organization owner cannot be removed. Transfer ownership first.");
      return;
    }

    try {
      // Remove from organization's member list and profiles
      const updatedMembers = organization.members.filter(
        (email) => email !== memberEmail
      );
      const updatedMemberProfiles = organization.member_profiles.filter(
        (profile) => profile.email !== memberEmail
      );

      // Remove member from any departments they are in
      const departmentUpdates = departments
        .filter((dept) => dept.members?.includes(memberEmail))
        .map((dept) =>
          Department.update(dept.id, {
            members: dept.members.filter((m) => m !== memberEmail),
          })
        );

      // Remove member from any teams they are in
      const teamUpdates = teams
        .filter((team) => team.members?.includes(memberEmail))
        .map((team) =>
          TeamEntity.update(team.id, {
            members: team.members.filter((m) => m !== memberEmail),
          })
        );

      // Update the user's record to remove organization membership
      try {
        const memberUser = await User.getUserByEmail(memberEmail);
        const updatedVerifiedOrgs = (
          memberUser.verified_organizations || []
        ).filter((orgId) => orgId !== organization.id);

        await User.updateUserByEmail(memberEmail, {
          verified_organizations: updatedVerifiedOrgs,
          active_organization_id:
            memberUser.active_organization_id === organization.id
              ? null
              : memberUser.active_organization_id,
        });

        console.log(
          `✅ Updated user ${memberEmail} - removed from organization ${organization.id}`
        );
      } catch (userError) {
        console.error("Error updating user record:", userError);
        // Continue with removal even if user update fails
      }

      // Perform all updates including organization, department, and team updates in parallel
      await Promise.all([
        Organization.update(organization.id, {
          members: updatedMembers,
          member_profiles: updatedMemberProfiles,
        }),
        ...departmentUpdates,
        ...teamUpdates,
      ]);

      // Refresh data to reflect changes
      await loadTeamData();
    } catch (error) {
      console.error("Error removing member from organization:", error);
    }
  };

  // filteredMembers now uses searchTerm
  const filteredMembers = teamMembers.filter(
    (member) =>
      member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.bio?.toLowerCase().includes(searchTerm.toLowerCase()) // Search bio field
  );

  const getUserRole = (member) => {
    return roleManager.getUserRole(organization, member.email);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // Check if user exists and has active organization
  if (!user || !user.active_organization_id) {
    return (
      <div className="p-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              No Active Organization
            </h3>
            <p className="text-slate-600 mb-6">
              Join or create an organization to see your team members.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() =>
                  (window.location.href = createPageUrl(
                    "Organization",
                    "action=join"
                  ))
                }
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join Organization
              </Button>
              <Button
                onClick={() =>
                  (window.location.href = createPageUrl(
                    "Organization",
                    "action=create"
                  ))
                }
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user has active org ID but the organization object itself is null (e.g., data loading issue)
  if (!organization) {
    return (
      <div className="p-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Loading Organization Data
            </h3>
            <p className="text-slate-600 mb-6">
              Unable to load organization details. Please try refreshing the
              page.
            </p>
            <Button
              onClick={loadTeamData}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Team
          </h1>
          {/* Updated member count to use organization.member_profiles */}
          <p className="text-slate-600 mt-1">
            {organization.name} • {organization.member_profiles?.length || 0}{" "}
            members
          </p>
        </div>
        {/* Search input removed from here */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 w-full sm:w-auto"
            disabled={!canManage}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>

          {/* Test Users Button - Only show for organization owners */}
          {organization?.owner_email === user?.email && (
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    await addTestUsersToOrganization(organization.id);
                    await loadTeamData(); // Refresh to show new users
                    alert(
                      "Test users added successfully! You can now assign roles to them."
                    );
                  } catch (error) {
                    console.error("Error adding test users:", error);
                    alert("Error adding test users: " + error.message);
                  }
                }}
                variant="outline"
                size="sm"
                className="text-xs border-green-200 text-green-600 hover:bg-green-50"
              >
                Add Test Users
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await removeTestUsersFromOrganization(organization.id);
                    await loadTeamData(); // Refresh to remove users
                    alert("Test users removed successfully!");
                  } catch (error) {
                    console.error("Error removing test users:", error);
                    alert("Error removing test users: " + error.message);
                  }
                }}
                variant="outline"
                size="sm"
                className="text-xs border-red-200 text-red-600 hover:bg-red-50"
              >
                Remove Test Users
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="bg-white border border-slate-200 shadow-sm w-full min-w-max">
            {/* Changed value from "members" to "all" and updated member count */}
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs md:text-sm whitespace-nowrap"
            >
              <Users className="w-4 h-4 mr-2" />
              All Members ({organization.member_profiles?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs md:text-sm whitespace-nowrap"
            >
              <Users2 className="w-4 h-4 mr-2" />
              Teams ({teams.length})
            </TabsTrigger>
            <TabsTrigger
              value="departments"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs md:text-sm whitespace-nowrap"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Departments ({departments.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TabsContent for All Members, including search input */}
        <TabsContent value="all" className="mt-4 space-y-4 md:space-y-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 mr-2 text-slate-400" />
            <Input
              placeholder="Search members..."
              value={searchTerm} // Use new searchTerm state
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredMembers.map((member) => (
              <TeamMemberCard
                key={member.email}
                member={member}
                role={getUserRole(member)}
                organization={organization}
                currentUser={user}
                onRemoveFromTeam={handleRemoveFromTeam}
                onRemoveFromOrganization={handleRemoveFromOrganization}
              />
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <Card className="border-none shadow-lg">
              <CardContent className="p-8 md:p-12 text-center">
                <Users className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4 md:mb-6" />
                <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2 md:mb-3">
                  {searchTerm ? "No members found" : "No team members yet"}
                </h3>
                <p className="text-slate-600 text-sm md:text-base">
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "Invite your first team member to get started"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TabsContent for Teams, with updated props */}
        <TabsContent value="teams" className="mt-4">
          <TeamOverview
            teams={teams}
            allMembers={organization.member_profiles || []} // Changed prop name and source
            organization={organization}
            canManage={canManage}
            onUpdate={loadTeamData}
            currentUser={user} // New prop as per outline
            onRemoveFromTeam={handleRemoveFromTeam}
            onRemoveFromOrganization={handleRemoveFromOrganization}
          />
        </TabsContent>

        {/* TabsContent for Departments, with updated props */}
        <TabsContent value="departments" className="mt-4">
          <DepartmentOverview
            departments={departments}
            allMembers={organization.member_profiles || []} // Changed prop name and source
            organization={organization}
            currentUser={user} // Renamed prop from 'user' to 'currentUser'
            canManage={canManage}
            onUpdate={loadTeamData}
            onRemoveFromTeam={handleRemoveFromTeam}
            onRemoveFromOrganization={handleRemoveFromOrganization}
          />
        </TabsContent>
      </Tabs>

      {isInviteModalOpen && (
        <InviteTeamModal
          organization={organization}
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={loadTeamData}
        />
      )}
    </div>
  );
}
