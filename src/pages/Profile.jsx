import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { UploadFile } from "@/services/localFileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Camera,
  Save,
  Building2,
  Mail,
  Phone,
  Edit3,
  UserX,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // Logged-in user
  const [organization, setOrganization] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const userEmail = new URLSearchParams(location.search).get("user_email");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const loggedInUser = await User.me();
      setCurrentUser(loggedInUser);

      const targetEmail = userEmail || loggedInUser.email;
      let fetchedOrg = null;
      let targetProfile = null;

      if (loggedInUser.active_organization_id) {
        // Use Organization.filter instead of Organization.get for better compatibility
        const orgs = await Organization.filter({
          id: loggedInUser.active_organization_id,
        });

        if (orgs.length > 0) {
          fetchedOrg = orgs[0];
          if (fetchedOrg?.member_profiles) {
            targetProfile = fetchedOrg.member_profiles.find(
              (p) => p.email === targetEmail
            );
          }
        }
      }

      // If viewing someone else's profile and they're not in organization, try to get their user data directly
      if (!targetProfile && targetEmail !== loggedInUser.email) {
        try {
          const targetUser = await User.getUserByEmail(targetEmail);
          if (targetUser) {
            targetProfile = {
              email: targetUser.email,
              full_name: targetUser.full_name,
              position: targetUser.position,
              bio: targetUser.bio,
              phone: targetUser.phone,
              avatar_url: targetUser.avatar_url,
            };
          }
        } catch (error) {
          console.log(`User ${targetEmail} not found in system`);
        }
      }

      // For local auth, if no organization profile exists, use the current user data
      if (!targetProfile && targetEmail === loggedInUser.email) {
        targetProfile = {
          email: loggedInUser.email,
          full_name: loggedInUser.full_name,
          position: loggedInUser.position,
          bio: loggedInUser.bio,
          phone: loggedInUser.phone,
          avatar_url: loggedInUser.avatar_url,
        };
      }

      setProfileUser(targetProfile);
      setOrganization(fetchedOrg);

      if (targetProfile) {
        setFormData({
          full_name: targetProfile.full_name || "",
          position: targetProfile.position || "",
          bio: targetProfile.bio || "",
          phone: targetProfile.phone || "",
        });
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error loading profile:", error);
      setCurrentUser(null);
      setProfileUser(null);
      setOrganization(null);
    }
    setIsLoading(false);
  }, [userEmail]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Upload the file
      const { file_url } = await UploadFile({ file });

      // 2. Update the global User data first (primary source)
      await User.updateMyUserData({ avatar_url: file_url });

      // 3. Update organization's member profile if user is in an organization
      if (organization && currentUser) {
        // Fetch a fresh copy of the organization to ensure we're not working with stale data
        const orgs = await Organization.filter({ id: organization.id });
        if (orgs.length > 0) {
          const org = orgs[0];
          const updatedProfiles = org.member_profiles.map((p) =>
            p.email === currentUser.email ? { ...p, avatar_url: file_url } : p
          );

          await Organization.update(org.id, {
            member_profiles: updatedProfiles,
          });
        }
      }

      // 4. Refresh the page's data
      await loadProfile();
    } catch (error) {
      console.error("Error uploading avatar:", error);
    }
    setIsUploading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Update the global User data first (primary source)
      await User.updateMyUserData(formData);

      // 2. Update organization member profile if user is in an organization
      if (organization && currentUser) {
        // Fetch a fresh copy of the organization to ensure we're not working with stale data
        const orgs = await Organization.filter({ id: organization.id });
        if (orgs.length > 0) {
          const org = orgs[0];
          let profileUpdated = false;
          const updatedProfiles = org.member_profiles.map((p) => {
            if (p.email === currentUser.email) {
              profileUpdated = true;
              return { ...p, ...formData };
            }
            return p;
          });

          // If user was not in profiles list, add them (edge case: user is logged in, but their profile isn't yet in member_profiles)
          if (!profileUpdated) {
            updatedProfiles.push({ email: currentUser.email, ...formData });
          }

          await Organization.update(org.id, {
            member_profiles: updatedProfiles,
          });
        }
      }

      // 3. Refresh and close edit mode
      await loadProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
    setIsSaving(false);
  };

  const isOwnProfile = !userEmail || currentUser?.email === userEmail;

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-slate-700">
          Authentication Error
        </h1>
        <p className="text-slate-500 mt-2">
          Could not load user data. Please try again.
        </p>
      </div>
    );
  }

  // This is the only place we should block a user.
  // Block ONLY if NOT viewing your own profile AND the profile doesn't exist (e.g., user not in your org).
  if (!isOwnProfile && !profileUser) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center mt-12">
        <UserX className="w-16 h-16 text-slate-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-slate-700">
          Profile Unavailable
        </h1>
        <p className="text-slate-500 mt-2">
          This user's profile is not available. They may not be part of your
          organization.
        </p>
        <Button
          onClick={() =>
            navigate(createPageUrl("Organization", { action: "join" }))
          }
          className="mt-4"
        >
          Manage Organization
        </Button>
      </div>
    );
  }

  // If we've reached here, it's either our own profile or a valid member profile. Render it.
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">
          {isOwnProfile
            ? "My Profile"
            : `${profileUser?.full_name || profileUser?.email}'s Profile`}
        </h1>
        {isOwnProfile && (
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            className={
              isEditing ? "" : "bg-gradient-to-r from-blue-600 to-indigo-600"
            }
          >
            <Edit3 className="w-4 h-4 mr-2" />
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 border-none shadow-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <Avatar className="w-32 h-32 mx-auto shadow-lg">
                  <AvatarImage src={profileUser?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-2xl">
                    {profileUser?.full_name?.charAt(0) ||
                      profileUser?.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors duration-200">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                )}
                {isOwnProfile && isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {profileUser?.full_name || "Unnamed User"}
                </h2>
                <p className="text-slate-600">
                  {profileUser?.position || "Team Member"}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {profileUser?.email}
                </p>
              </div>

              {organization ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    Organization
                  </p>
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1"
                  >
                    <Building2 className="w-3 h-3" />
                    {organization.name}
                  </Badge>
                </div>
              ) : (
                isOwnProfile && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 mb-2">
                      Want to collaborate with teams?
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate(createPageUrl("Organization"))}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Join or Create Organization
                    </Button>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="lg:col-span-2 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900">
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {isOwnProfile && isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      handleInputChange("full_name", e.target.value)
                    }
                    className="mt-1"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) =>
                      handleInputChange("position", e.target.value)
                    }
                    className="mt-1"
                    placeholder="e.g. Senior Developer, Project Manager"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="mt-1"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    className="mt-1 h-24"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-500 text-sm md:text-base">
                      Email
                    </Label>
                    <p className="font-medium text-slate-900 mt-1 text-sm md:text-base">
                      {profileUser?.email}
                    </p>
                  </div>

                  {profileUser?.phone && (
                    <div>
                      <Label className="text-slate-500 text-sm md:text-base">
                        Phone
                      </Label>
                      <p className="font-medium text-slate-900 mt-1 text-sm md:text-base">
                        {profileUser.phone}
                      </p>
                    </div>
                  )}
                </div>

                {profileUser?.bio && (
                  <div>
                    <Label className="text-slate-500 text-sm md:text-base">
                      About
                    </Label>
                    <p className="text-slate-900 mt-1 text-sm md:text-base leading-relaxed">
                      {profileUser.bio}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-slate-500 text-sm md:text-base">
                    Position
                  </Label>
                  <p className="font-medium text-slate-900 mt-1 text-sm md:text-base">
                    {profileUser?.position || "Team Member"}
                  </p>
                </div>

                {!profileUser?.bio && !profileUser?.phone && isOwnProfile && (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-4">
                      Complete your profile to help your teammates get to know
                      you better.
                    </p>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Complete Profile
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
