import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { roleManager } from "../../services/roleManager";
import { Organization } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle,
  UserMinus,
  Crown,
  Shield,
  Users,
  User,
  Settings,
  ChevronDown,
} from "lucide-react";
import RemoveMemberDialog from "./RemoveMemberDialog";

export default function TeamMemberCard({
  member,
  role,
  organization,
  currentUser,
  onRemoveFromTeam,
  onRemoveFromOrganization,
}) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const isCurrentUser = currentUser?.email === member.email;
  const isOrganizationOwner = organization?.owner_email === currentUser?.email;
  const isMemberOwner = organization?.owner_email === member.email;

  // Check if current user can manage this member
  const canManageMember = roleManager.canManageUser(
    organization,
    currentUser?.email,
    member.email
  );

  // Get assignable roles for current user
  const assignableRoles = roleManager.getAssignableRoles(
    organization,
    currentUser?.email
  );

  // Only show remove button if user can manage this member
  const canRemoveMember = canManageMember && !isMemberOwner && !isCurrentUser;

  // Handle role assignment
  const handleRoleAssignment = async (newRole) => {
    if (!organization || !currentUser || isAssigningRole) return;

    setIsAssigningRole(true);
    try {
      const updatedOrg = roleManager.assignRole(
        organization,
        currentUser.email,
        member.email,
        newRole
      );
      await Organization.update(organization.id, updatedOrg);

      // Refresh the page to show updated roles
      window.location.reload();
    } catch (error) {
      console.error("Error assigning role:", error);
      alert(`Error assigning role: ${error.message}`);
    } finally {
      setIsAssigningRole(false);
    }
  };

  const getRoleIcon = (userRole) => {
    switch (userRole) {
      case "owner":
        return <Crown className="w-3 h-3" />;
      case "admin":
        return <Shield className="w-3 h-3" />;
      case "manager":
        return <Users className="w-3 h-3" />;
      case "member":
        return <User className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const getRoleColor = (userRole) => {
    const roleInfo = roleManager.getRoleDisplayInfo(userRole);
    return roleInfo.color;
  };

  const getRoleLabel = (userRole) => {
    const roleInfo = roleManager.getRoleDisplayInfo(userRole);
    return roleInfo.label;
  };

  return (
    <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link
            to={createPageUrl("Profile", `user_email=${member.email}`)}
            className="group transition-transform duration-200 hover:scale-105"
          >
            <Avatar className="w-16 h-16 md:w-20 md:h-20 shadow-lg group-hover:shadow-xl transition-shadow duration-200">
              <AvatarImage src={member.avatar_url} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-lg md:text-xl">
                {member.full_name?.charAt(0) ||
                  member.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="space-y-2 min-w-0 w-full">
            <Link
              to={createPageUrl("Profile", `user_email=${member.email}`)}
              className="group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-200 truncate text-sm md:text-base">
                {member.full_name || member.email}
              </h3>
            </Link>
            <p className="text-slate-600 text-xs md:text-sm truncate">
              {member.position || "Team Member"}
            </p>
            <p className="text-slate-500 text-xs truncate">{member.email}</p>
          </div>

          {/* Role Badge with Dropdown for Role Management */}
          <div className="flex flex-col items-center gap-2">
            {/* Always show current role */}
            <Badge
              variant="secondary"
              className={`text-xs flex items-center gap-1 ${getRoleColor(
                role
              )}`}
            >
              {getRoleIcon(role)}
              {getRoleLabel(role)}
            </Badge>

            {/* Show role assignment dropdown for organization owners/admins */}
            {(isOrganizationOwner ||
              roleManager.hasPermission(
                organization,
                currentUser?.email,
                "manage_roles"
              )) &&
            !isCurrentUser &&
            assignableRoles.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1 h-auto border-slate-300 hover:bg-slate-50"
                    disabled={isAssigningRole}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    {isAssigningRole ? "Updating..." : "Change Role"}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  <div className="px-2 py-1 text-xs font-medium text-slate-500">
                    Assign New Role
                  </div>
                  <DropdownMenuSeparator />
                  {assignableRoles.map((availableRole) => {
                    const roleInfo =
                      roleManager.getRoleDisplayInfo(availableRole);
                    const isCurrentRole = role.toLowerCase() === availableRole;

                    return (
                      <DropdownMenuItem
                        key={availableRole}
                        onClick={() =>
                          !isCurrentRole && handleRoleAssignment(availableRole)
                        }
                        className={`flex items-center gap-2 text-xs ${
                          isCurrentRole
                            ? "bg-slate-100 cursor-default opacity-50"
                            : "cursor-pointer hover:bg-slate-50"
                        }`}
                        disabled={isCurrentRole}
                      >
                        {availableRole === "owner" && (
                          <Crown className="w-3 h-3 text-amber-600" />
                        )}
                        {availableRole === "admin" && (
                          <Shield className="w-3 h-3 text-purple-600" />
                        )}
                        {availableRole === "manager" && (
                          <Users className="w-3 h-3 text-green-600" />
                        )}
                        {availableRole === "member" && (
                          <User className="w-3 h-3 text-blue-600" />
                        )}
                        <div className="flex flex-col">
                          <span className={isCurrentRole ? "font-medium" : ""}>
                            {roleInfo.label}
                            {isCurrentRole && " (Current)"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {roleInfo.description}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="flex gap-2 w-full">
            <Link
              to={createPageUrl("Messages", `conversation=${member.email}`)}
              className="flex-1"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 text-xs md:text-sm"
              >
                <MessageCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Message
              </Button>
            </Link>

            {canRemoveMember && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
                className="border-red-200 text-red-600 hover:bg-red-50 px-2 md:px-3 text-xs md:text-sm"
              >
                <UserMinus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                <span className="hidden sm:inline">Remove</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <RemoveMemberDialog
        isOpen={showRemoveDialog}
        onClose={() => setShowRemoveDialog(false)}
        member={member}
        onRemoveFromTeam={onRemoveFromTeam}
        onRemoveFromOrganization={onRemoveFromOrganization}
        currentUser={currentUser}
        organization={organization}
      />
    </Card>
  );
}
