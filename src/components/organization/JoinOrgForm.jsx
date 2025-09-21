import React, { useState } from "react";
import { User } from "@/api/entities";
import { JoinRequest } from "@/api/entities";
import { Notification } from "@/api/entities"; // Added import for Notification
import { apiClient } from "@/services/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, AlertCircle, CheckCircle } from "lucide-react";

export default function JoinOrgForm({ onSuccess }) {
  const [organizationId, setOrganizationId] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check URL params for pre-filled org_id (from notification)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get("org_id");
    if (orgId) {
      setOrganizationId(orgId);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!organizationId.trim()) {
      setError("Organization ID is required");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const user = await User.me();

      // Check if organization exists using the new API endpoint
      let organization;
      try {
        const orgCheck = await apiClient.checkOrganizationExists(
          organizationId.trim()
        );
        organization = {
          id: orgCheck.organization_id, // Note: API returns organization_id, but we need id for other calls
          organization_id: orgCheck.organization_id,
          name: orgCheck.name,
        };
      } catch (error) {
        if (error.message.includes("Organization not found")) {
          setError(
            "Organization not found. Please check the ID and try again."
          );
        } else {
          setError("Failed to verify organization. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }

      // Check if user is already a member
      if (user.verified_organizations?.includes(organization.id)) {
        setError("You are already a member of this organization.");
        setIsSubmitting(false);
        return;
      }

      // Check if there's already a pending request
      const existingRequests = await JoinRequest.filter({
        user_email: user.email,
        organization_id: organization.id,
        status: "pending",
      });

      if (existingRequests.length > 0) {
        setError(
          "You already have a pending join request for this organization."
        );
        setIsSubmitting(false);
        return;
      }

      // Create join request
      await JoinRequest.create({
        user_email: user.email,
        organization_id: organization.id,
        message: message.trim(),
        status: "pending",
      });

      // Create notifications for organization owner and admins
      const notificationRecipients = [
        organization.owner_email,
        ...(organization.admins || []).map((admin) => admin.email), // Assuming admins is an array of objects with an 'email' property
      ];

      // Remove duplicates and current user
      const uniqueRecipients = [...new Set(notificationRecipients)].filter(
        (recipientEmail) => recipientEmail !== user.email
      );

      // Create notifications for all admins/owner
      await Promise.all(
        uniqueRecipients.map((recipientEmail) =>
          Notification.create({
            user_email: recipientEmail,
            type: "organization_join_request", // Changed from 'organization_invite' to 'organization_join_request' for clarity
            title: "New Join Request",
            message: `${user.email} wants to join ${organization.name}${
              message.trim() ? ': "' + message.trim() + '"' : ""
            }`,
            link: `/organization?tab=requests`, // Navigate to organization page with requests tab active
            organization_id: organization.id,
            from_user_email: user.email,
          })
        )
      );

      setSuccess(
        `Join request sent to ${organization.name}. You'll be notified when it's reviewed.`
      );
      setOrganizationId("");
      setMessage("");
    } catch (error) {
      console.error("Error joining organization:", error);
      setError("Failed to send join request. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-0">
      <Card className="border-none shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl">
                Join Organization
              </CardTitle>
              <p className="text-slate-600 text-sm md:text-base">
                Join an existing team using their organization ID
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4 md:mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 md:mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <Label htmlFor="organizationId" className="text-sm md:text-base">
                Organization ID *
              </Label>
              <Input
                id="organizationId"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                placeholder="e.g. ACME-123456"
                className="mt-2"
                required
              />
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Ask your team admin for the organization ID
              </p>
            </div>

            <div>
              <Label htmlFor="message" className="text-sm md:text-base">
                Message (Optional)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself to the organization admins..."
                className="mt-2 h-20 md:h-24"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 w-full sm:w-auto"
              >
                {isSubmitting ? "Sending Request..." : "Send Join Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
