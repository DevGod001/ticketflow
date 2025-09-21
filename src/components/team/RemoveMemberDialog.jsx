import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UserMinus, Building2, Users } from "lucide-react";

export default function RemoveMemberDialog({
  isOpen,
  onClose,
  member,
  onRemoveFromTeam,
  onRemoveFromOrganization,
  currentUser,
  organization,
}) {
  // Set default removal type based on available options
  const [removalType, setRemovalType] = useState(
    onRemoveFromTeam ? "team" : "organization"
  );
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      if (removalType === "organization") {
        await onRemoveFromOrganization(member.email);
      } else {
        await onRemoveFromTeam(member.email);
      }
      onClose();
    } catch (error) {
      console.error("Error removing member:", error);
    }
    setIsRemoving(false);
  };

  const isOwner = organization?.owner_email === currentUser?.email;
  const isMemberOwner = organization?.owner_email === member?.email;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-red-600" />
            Remove Team Member
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="text-sm text-slate-600">
              You are about to remove{" "}
              <strong>{member?.full_name || member?.email}</strong> from your
              organization.
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-900">
                Choose removal type:
              </Label>
              <RadioGroup value={removalType} onValueChange={setRemovalType}>
                {onRemoveFromTeam && (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="team" id="team" />
                    <Label htmlFor="team" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-medium">
                            Remove from current team only
                          </div>
                          <div className="text-xs text-slate-500">
                            Member stays in organization but is removed from
                            current team/department
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                )}

                {isOwner && !isMemberOwner && (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="organization" id="organization" />
                    <Label
                      htmlFor="organization"
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-red-600" />
                        <div>
                          <div className="font-medium text-red-700">
                            Remove from entire organization
                          </div>
                          <div className="text-xs text-slate-500">
                            Member loses all access and must rejoin to return
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>

            {removalType === "organization" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-red-800">
                  <strong>Warning:</strong> This action will completely remove
                  the member from your organization. They will lose access to
                  all teams, departments, and organization data.
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isRemoving}
            className={
              removalType === "organization"
                ? "bg-red-600 hover:bg-red-700"
                : ""
            }
          >
            {isRemoving
              ? "Removing..."
              : `Remove from ${
                  removalType === "organization" ? "Organization" : "Team"
                }`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
