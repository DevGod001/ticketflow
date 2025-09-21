import React, { useState, useEffect } from "react";
import { Organization, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Copy,
  Settings,
  Save,
  Users,
  UserMinus,
  Crown,
  Shield,
  Search,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RemoveMemberDialog from "../team/RemoveMemberDialog";

export default function OrgManagement({ organization, onUpdate }) {
  const [allMembers, setAllMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(organization || {});
  const [isSaving, setIsSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!organization) {
    return (
      <Alert>
        <AlertDescription>
          Select an active organization to manage its settings.
        </AlertDescription>
      </Alert>
    );
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSettingsChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Organization.update(organization.id, formData);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating organization:", error);
    }
    setIsSaving(false);
  };

  const copyOrgId = async () => {
    try {
      await navigator.clipboard.writeText(organization.organization_id);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDeleteOrganization = async () => {
    setIsDeleting(true);
    try {
      await Organization.delete(organization.id);
      setShowDeleteDialog(false);
      // Redirect to organization page after deletion
      window.location.href = "/organization";
    } catch (error) {
      console.error("Error deleting organization:", error);
    }
    setIsDeleting(false);
  };

  // Load all organization members
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);

        if (organization?.member_profiles) {
          setAllMembers(organization.member_profiles);
        }
      } catch (error) {
        console.error("Error loading members:", error);
      }
    };

    if (organization) {
      loadMembers();
    }
  }, [organization]);

  // Handle member removal from organization
  const handleRemoveFromOrganization = async (memberEmail) => {
    try {
      // Get the member user data
      const memberUser = await User.getUserByEmail(memberEmail);
      const updatedVerifiedOrgs = (
        memberUser.verified_organizations || []
      ).filter((orgId) => orgId !== organization.id);

      // Update user's organization membership
      await User.updateUserByEmail(memberEmail, {
        verified_organizations: updatedVerifiedOrgs,
        active_organization_id:
          memberUser.active_organization_id === organization.id
            ? null
            : memberUser.active_organization_id,
      });

      // Remove from organization's member list and profiles
      const updatedMembers = organization.members.filter(
        (email) => email !== memberEmail
      );
      const updatedMemberProfiles = organization.member_profiles.filter(
        (profile) => profile.email !== memberEmail
      );

      // Update organization
      await Organization.update(organization.id, {
        members: updatedMembers,
        member_profiles: updatedMemberProfiles,
      });

      // Refresh data
      onUpdate();
      console.log(`✅ Removed ${memberEmail} from organization`);
    } catch (error) {
      console.error("Error removing member from organization:", error);
    }
  };

  const filteredMembers = allMembers.filter(
    (member) =>
      member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRole = (member) => {
    if (organization.owner_email === member.email) return "Owner";
    if (organization.admins?.includes(member.email)) return "Admin";
    return "Member";
  };

  return (
    <div className="space-y-4 md:space-y-6 px-3 md:px-0">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            All Members ({allMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="border-none shadow-lg">
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-lg md:text-xl">
                  Organization Settings
                </CardTitle>
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant={isEditing ? "outline" : "default"}
                  className="w-full sm:w-auto"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm md:text-base">
                      Organization Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm md:text-base"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      className="mt-2 h-20 md:h-24"
                    />
                  </div>

                  <div className="space-y-4 p-3 md:p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 text-sm md:text-base">
                      Join Settings
                    </h4>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm md:text-base">
                          Allow Public Join
                        </Label>
                        <p className="text-xs md:text-sm text-slate-500">
                          Allow users to join without invitation
                        </p>
                      </div>
                      <Switch
                        checked={formData.settings?.allow_public_join || false}
                        onCheckedChange={(value) =>
                          handleSettingsChange("allow_public_join", value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm md:text-base">
                          Require Approval
                        </Label>
                        <p className="text-xs md:text-sm text-slate-500">
                          Admin approval required for new members
                        </p>
                      </div>
                      <Switch
                        checked={formData.settings?.require_approval || false}
                        onCheckedChange={(value) =>
                          handleSettingsChange("require_approval", value)
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-green-600 to-green-700 w-full sm:w-auto"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label className="text-slate-500 text-sm md:text-base">
                        Organization Name
                      </Label>
                      <p className="font-medium text-slate-900 mt-1 text-sm md:text-base">
                        {organization.name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500 text-sm md:text-base">
                        Organization ID
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="font-mono text-sm bg-slate-100 px-2 py-1 rounded break-all">
                          {organization.organization_id}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={copyOrgId}
                          className={copySuccess ? "text-green-600" : ""}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {copySuccess && (
                        <p className="text-xs text-green-600 mt-1">Copied!</p>
                      )}
                    </div>
                  </div>

                  {organization.description && (
                    <div>
                      <Label className="text-slate-500 text-sm md:text-base">
                        Description
                      </Label>
                      <p className="text-slate-900 mt-1 text-sm md:text-base">
                        {organization.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-slate-500 text-sm md:text-base">
                      Settings
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge
                        variant={
                          organization.settings?.allow_public_join
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {organization.settings?.allow_public_join
                          ? "Public Join"
                          : "Invite Only"}
                      </Badge>
                      <Badge
                        variant={
                          organization.settings?.require_approval
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {organization.settings?.require_approval
                          ? "Approval Required"
                          : "Auto Accept"}
                      </Badge>
                    </div>
                  </div>

                  {/* Delete Organization Section - Only for owners */}
                  {currentUser?.email === organization.owner_email && (
                    <div className="border-t pt-6 mt-6">
                      <div className="bg-red-50 p-4 rounded-lg">
                        <h4 className="font-medium text-red-900 text-sm md:text-base mb-2">
                          Danger Zone
                        </h4>
                        <p className="text-red-700 text-xs md:text-sm mb-4">
                          Permanently delete this organization and all its data.
                          This action cannot be undone.
                        </p>
                        <Button
                          onClick={() => setShowDeleteDialog(true)}
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Organization
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card className="border-none shadow-lg">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl">
                All Organization Members
              </CardTitle>
              <div className="relative w-full sm:w-64 mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((member) => {
                  const role = getUserRole(member);
                  const isOwner = role === "Owner";
                  const canRemove =
                    currentUser?.email === organization.owner_email && !isOwner;

                  return (
                    <Card
                      key={member.email}
                      className="border shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                              {member.full_name?.charAt(0) ||
                                member.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {member.full_name || member.email}
                            </p>
                            <p className="text-sm text-slate-500 truncate">
                              {member.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  role === "Owner"
                                    ? "bg-amber-100 text-amber-800"
                                    : role === "Admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {role === "Owner" && (
                                  <Crown className="w-3 h-3 mr-1" />
                                )}
                                {role === "Admin" && (
                                  <Shield className="w-3 h-3 mr-1" />
                                )}
                                {role}
                              </Badge>
                            </div>
                          </div>
                          {canRemove && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMemberToRemove(member);
                                setShowRemoveDialog(true);
                              }}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredMembers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {searchTerm ? "No members found" : "No members yet"}
                  </h3>
                  <p className="text-slate-600">
                    {searchTerm
                      ? "Try adjusting your search criteria"
                      : "Invite your first team member to get started"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showRemoveDialog && memberToRemove && (
        <RemoveMemberDialog
          isOpen={showRemoveDialog}
          onClose={() => {
            setShowRemoveDialog(false);
            setMemberToRemove(null);
          }}
          member={memberToRemove}
          onRemoveFromTeam={null} // Disable team removal in organization context
          onRemoveFromOrganization={handleRemoveFromOrganization}
          currentUser={currentUser}
          organization={organization}
        />
      )}

      {/* Delete Organization Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Delete Organization
                </h3>
                <p className="text-sm text-slate-600">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-slate-700 mb-3">
                Are you sure you want to delete{" "}
                <strong>{organization.name}</strong>?
              </p>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-red-800 text-sm">
                  This will permanently delete:
                </p>
                <ul className="text-red-700 text-sm mt-2 space-y-1">
                  <li>• All organization data and settings</li>
                  <li>• All member profiles and roles</li>
                  <li>• All teams and departments</li>
                  <li>• All tickets and collaboration rooms</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteDialog(false)}
                variant="outline"
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteOrganization}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Organization
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
