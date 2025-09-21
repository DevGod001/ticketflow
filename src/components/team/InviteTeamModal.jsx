import React, { useState } from "react";
import { SendEmail } from "@/api/integrations";
import { User, Notification } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Send,
  AlertCircle,
  CheckCircle,
  Bell,
  UserCheck,
} from "lucide-react";

export default function InviteTeamModal({ organization, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [inviteMethod, setInviteMethod] = useState(""); // 'notification' or 'email'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Check if user already exists in TicketFlow
      const existingUsers = await User.filter({ email: email.trim() });
      const userExists = existingUsers.length > 0;

      if (userExists) {
        // User exists - send in-app notification
        setInviteMethod("notification");

        const notificationMessage = message
          ? `${organization.name} has invited you to join their organization: "${message}"`
          : `${organization.name} has invited you to join their organization on TicketFlow!`;

        await Notification.create({
          user_email: email.trim(),
          type: "organization_invite",
          title: `Invitation to join ${organization.name}`,
          message: notificationMessage,
          data: {
            organization_id: organization.id,
            organization_name: organization.name,
            organization_code: organization.organization_id,
            inviter_message: message || null,
          },
          action_url: `/organization?tab=join&org_id=${organization.organization_id}`,
          is_read: false,
        });

        console.log(`✅ In-app notification sent to existing user: ${email}`);
      } else {
        // User doesn't exist - send email invitation
        setInviteMethod("email");

        const inviteMessage = `
You've been invited to join ${organization.name} on TicketFlow!

${message || "Join our team to collaborate on tickets and projects."}

To join the organization, use this Organization ID: ${
          organization.organization_id
        }

Sign up at our platform and enter the organization ID to request access.

Welcome to the team!
        `.trim();

        await SendEmail({
          to: email,
          subject: `Invitation to join ${organization.name}`,
          body: inviteMessage,
          from_name: organization.name,
        });

        console.log(`✅ Email invitation sent to new user: ${email}`);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error("Error sending invitation:", error);
      setError("Failed to send invitation. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invite Team Member
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            {inviteMethod === "notification" ? (
              <>
                <Bell className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Notification Sent!
                </h3>
                <p className="text-slate-600">
                  The team member will receive an in-app notification to join
                  your organization.
                </p>
              </>
            ) : (
              <>
                <Mail className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Email Invitation Sent!
                </h3>
                <p className="text-slate-600">
                  The team member will receive an email with instructions to
                  join.
                </p>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email" className="text-sm">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-sm">
                Personal Message (Optional)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal welcome message..."
                className="mt-2 h-24"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-slate-700">
                Organization ID:
              </p>
              <p className="text-sm text-slate-600 break-all">
                {organization.organization_id}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                This ID will be included in the invitation email
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 w-full sm:w-auto"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
