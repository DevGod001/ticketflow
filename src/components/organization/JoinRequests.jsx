import React from "react";
import { JoinRequest } from "@/api/entities";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities"; // Added import for Organization entity
import { Notification } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

export default function JoinRequests({ requests, organization, onUpdate }) {
  const handleRequest = async (requestId, status) => {
    try {
      const currentUser = await User.me();

      const request = requests.find((r) => r.id === requestId);
      if (!request) {
        console.error("Join request not found!");
        return;
      }

      if (status === "approved") {
        // Add user to the organization's member list
        const updatedMembers = [
          ...(organization.members || []),
          request.user_email,
        ];

        // Create a basic profile for the new member
        const newProfile = {
          email: request.user_email,
          full_name: request.user_email.split("@")[0], // Use email prefix as name fallback
          position: "Member",
          avatar_url: null,
        };
        const updatedMemberProfiles = [
          ...(organization.member_profiles || []),
          newProfile,
        ];

        // Update the organization with new member
        await Organization.update(organization.id, {
          members: updatedMembers,
          member_profiles: updatedMemberProfiles,
        });

        // Update the user's record to include organization membership
        try {
          const user = await User.getUserByEmail(request.user_email);
          const currentVerifiedOrgs = user.verified_organizations || [];
          const updatedVerifiedOrgs = currentVerifiedOrgs.includes(
            organization.id
          )
            ? currentVerifiedOrgs
            : [...currentVerifiedOrgs, organization.id];

          await User.updateUserByEmail(request.user_email, {
            verified_organizations: updatedVerifiedOrgs,
            active_organization_id: organization.id, // Set as active organization
          });
        } catch (userError) {
          console.error("Error updating user record:", userError);
          // Continue with approval even if user update fails
        }

        // Send approval notification
        await Notification.create({
          user_email: request.user_email,
          type: "organization_join_request",
          title: "Welcome to the team! 🎉",
          message: `Your request to join ${organization.name} has been approved.`,
          organization_id: organization.organization_id,
          from_user_email: currentUser.email,
        });
      } else {
        // Send rejection notification
        await Notification.create({
          user_email: request.user_email,
          type: "organization_join_request",
          title: "Join request update",
          message: `Your request to join ${organization.name} has been declined.`,
          organization_id: organization.organization_id,
          from_user_email: currentUser.email,
        });
      }

      // Finally, update the join request status
      await JoinRequest.update(requestId, {
        status,
        reviewed_by: currentUser.email,
        reviewed_at: new Date().toISOString(),
      });

      onUpdate(); // Refresh the list
    } catch (error) {
      console.error("Error handling join request:", error);
    }
  };

  return (
    <div className="px-3 md:px-0">
      <Card className="border-none shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <UserCheck className="w-5 h-5" />
            Join Requests Management
          </CardTitle>
          <p className="text-slate-600 text-sm md:text-base">
            Review and manage requests from users who want to join your
            organization
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="text-center py-8 md:py-12 px-4 md:px-6">
              <Clock className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4 md:mb-6" />
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2 md:mb-3">
                No pending requests
              </h3>
              <p className="text-slate-600 mb-4 text-sm md:text-base">
                All join requests have been processed.
              </p>
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-blue-900 text-sm md:text-base">
                    Organization ID
                  </span>
                </div>
                <p className="text-blue-800 text-xs md:text-sm mb-2">
                  Share this ID with team members so they can request to join:
                </p>
                <code className="bg-white px-2 md:px-3 py-1 md:py-2 rounded border text-xs md:text-sm font-mono break-all">
                  {organization?.organization_id}
                </code>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 md:p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4 min-w-0 flex-1">
                      <Avatar className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                          {request.user_email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3 mb-2">
                          <h4 className="font-semibold text-slate-900 text-sm md:text-base truncate">
                            {request.user_email}
                          </h4>
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs w-fit"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            Pending Review
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-slate-500 mb-3">
                          Requested{" "}
                          {format(
                            new Date(request.created_date),
                            "MMM d, yyyy • h:mm a"
                          )}
                        </p>
                        {request.message && (
                          <div className="bg-slate-100 p-2 md:p-3 rounded-lg mb-3">
                            <p className="text-xs md:text-sm text-slate-700 italic">
                              "{request.message}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 lg:ml-4 lg:flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleRequest(request.id, "approved")}
                        className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequest(request.id, "declined")}
                        className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
