import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { processTextLinks } from "@/utils/linkify.jsx";
import { Ticket } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Edit,
  Users,
  Clock,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle,
  Circle,
  PlayCircle,
  PauseCircle,
  Check,
  XCircle,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";

import CommentSection from "./CommentSection";
import EditTicketForm from "./EditTicketForm";
import ReassignTicketModal from "./ReassignTicketModal";
import AttachmentDisplay from "./AttachmentDisplay";

const statusConfig = {
  open: { icon: Circle, color: "text-blue-500", label: "Open" },
  assigned: { icon: UserPlus, color: "text-purple-500", label: "Assigned" },
  in_progress: {
    icon: PlayCircle,
    color: "text-yellow-500",
    label: "In Progress",
  },
  pending: { icon: PauseCircle, color: "text-orange-500", label: "Pending" },
  resolved: { icon: Check, color: "text-green-500", label: "Resolved" },
  closed: { icon: XCircle, color: "text-gray-500", label: "Closed" },
};

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  assigned: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  pending: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export default function TicketView({
  ticket,
  teamMembers,
  user,
  onBack,
  onUpdate,
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const location = useLocation();

  const getMemberDetails = (email) =>
    teamMembers.find((m) => m.email === email);

  // Enterprise-standard smooth scrolling to specific comments
  useEffect(() => {
    const scrollToComment = () => {
      const urlParams = new URLSearchParams(location.search);
      const commentId = urlParams.get("comment");

      if (commentId) {
        // Wait for the DOM to be fully rendered
        const timer = setTimeout(() => {
          const commentElement = document.getElementById(
            `comment-${commentId}`
          );
          if (commentElement) {
            // Enterprise-standard smooth scrolling with offset for header
            const headerOffset = 100; // Account for fixed headers
            const elementPosition = commentElement.getBoundingClientRect().top;
            const offsetPosition =
              elementPosition + window.pageYOffset - headerOffset;

            // Smooth scroll with enterprise-standard easing
            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth",
            });

            // Add subtle highlight animation for better UX
            commentElement.style.transition =
              "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
            commentElement.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
            commentElement.style.borderLeft = "4px solid #3b82f6";
            commentElement.style.paddingLeft = "1rem";

            // Remove highlight after animation
            setTimeout(() => {
              commentElement.style.backgroundColor = "";
              commentElement.style.borderLeft = "";
              commentElement.style.paddingLeft = "";
            }, 2000);
          }
        }, 500); // Allow time for CommentSection to render

        return () => clearTimeout(timer);
      }
    };

    scrollToComment();
  }, [location.search, ticket.id]); // Re-run when URL changes or ticket changes

  // Check if current user is the ticket creator
  const isTicketCreator = user?.email === ticket.reporter_email;

  // Check if current user can reassign (any team member can reassign)
  const canReassign = user && teamMembers.some((m) => m.email === user.email);

  const handleAssignToMe = async () => {
    if (!user || ticket.assigned_to?.includes(user.email)) return;
    setIsUpdating(true);
    try {
      const newAssignees = [...(ticket.assigned_to || []), user.email];
      const newStatus = ticket.status === "open" ? "assigned" : ticket.status;

      await Ticket.update(ticket.id, {
        assigned_to: newAssignees,
        status: newStatus,
      });

      if (ticket.reporter_email !== user.email) {
        await Notification.create({
          user_email: ticket.reporter_email,
          type: "assignment",
          title: `Ticket assigned: ${ticket.title.slice(0, 30)}...`,
          message: `${
            user.full_name || user.email
          } has been assigned to your ticket.`,
          organization_id: ticket.organization_id,
          related_id: ticket.id,
          from_user_email: user.email,
          link: createPageUrl("AllTickets", `ticket=${ticket.id}`),
        });
      }

      onUpdate();
    } catch (error) {
      console.error("Error assigning ticket:", error);
    }
    setIsUpdating(false);
  };

  const handleStatusChange = async (newStatus) => {
    if (ticket.status === newStatus) return;
    setIsUpdating(true);
    try {
      await Ticket.update(ticket.id, { status: newStatus });

      const recipients = new Set([
        ticket.reporter_email,
        ...(ticket.assigned_to || []),
      ]);
      for (const email of recipients) {
        if (email !== user.email) {
          await Notification.create({
            user_email: email,
            type: "status_change",
            title: `Status changed for: ${ticket.title.slice(0, 30)}...`,
            message: `Status changed to "${newStatus.replace("_", " ")}" by ${
              user.full_name || user.email
            }.`,
            organization_id: ticket.organization_id,
            related_id: ticket.id,
            from_user_email: user.email,
            link: createPageUrl("AllTickets", `ticket=${ticket.id}`),
          });
        }
      }
      onUpdate();
    } catch (error) {
      console.error("Error changing status:", error);
    }
    setIsUpdating(false);
  };

  const handleToggleWatch = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const isCurrentlyWatching = ticket.watchers?.includes(user.email);
      const newWatchers = isCurrentlyWatching
        ? ticket.watchers.filter((email) => email !== user.email)
        : [...(ticket.watchers || []), user.email];

      await Ticket.update(ticket.id, { watchers: newWatchers });
      onUpdate();
    } catch (error) {
      console.error("Error toggling watch status:", error);
    }
    setIsUpdating(false);
  };

  const isWatching = ticket.watchers?.includes(user?.email);
  const isAssigned = ticket.assigned_to?.includes(user?.email);

  // If editing, show edit form instead
  if (isEditing) {
    return (
      <EditTicketForm
        ticket={ticket}
        teamMembers={teamMembers}
        onCancel={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          onUpdate();
        }}
      />
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 line-clamp-2">
            {ticket.title}
          </h1>
          <p className="text-slate-500 text-sm">#{ticket.id.slice(-8)}</p>
        </div>
        {isTicketCreator && (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="hidden sm:flex"
          >
            <Edit className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Edit Ticket</span>
            <span className="md:hidden">Edit</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Ticket Details */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg md:text-xl">Details</CardTitle>
                <div className="flex gap-2">
                  <Badge className={statusColors[ticket.status]}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={priorityColors[ticket.priority]}
                  >
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-slate-700 whitespace-pre-wrap text-sm md:text-base">
                {processTextLinks(ticket.description)}
              </div>

              <div className="mt-4 md:mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-500">Created:</span>
                  <p className="mt-1">
                    {format(
                      new Date(ticket.created_date),
                      "MMM d, yyyy • h:mm a"
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-500">Reporter:</span>
                  <Link
                    to={createPageUrl(
                      "Profile",
                      `user_email=${ticket.reporter_email}`
                    )}
                    className="text-blue-600 hover:underline block mt-1"
                  >
                    {getMemberDetails(ticket.reporter_email)?.full_name ||
                      ticket.reporter_email}
                  </Link>
                </div>
                {ticket.due_date && (
                  <div>
                    <span className="font-medium text-slate-500">
                      Due Date:
                    </span>
                    <p className="flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(ticket.due_date), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <AttachmentDisplay attachments={ticket.attachments} />
          )}

          <CommentSection
            ticket={ticket}
            onUpdate={onUpdate}
            teamMembers={teamMembers}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Assigned To
                {canReassign && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsReassigning(true)}
                    className="ml-auto text-blue-600 hover:text-blue-700"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Reassign
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.assigned_to?.length > 0 ? (
                <div className="space-y-3">
                  {ticket.assigned_to.map((email, index) => {
                    const member = getMemberDetails(email);
                    return (
                      <Link
                        key={index}
                        to={createPageUrl("Profile", `user_email=${email}`)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member?.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">
                            {email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-slate-800 truncate hover:text-blue-600">
                          {member?.full_name || email}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4 text-sm">
                  No one assigned
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                onClick={handleAssignToMe}
                disabled={isUpdating || isAssigned}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isAssigned ? "Already Assigned" : "Assign to Me"}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    disabled={isUpdating}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[--radix-dropdown-menu-trigger-width]"
                >
                  <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(statusConfig).map(
                    ([status, { icon: Icon, color, label }]) => (
                      <DropdownMenuItem
                        key={status}
                        onSelect={() => handleStatusChange(status)}
                        disabled={ticket.status === status}
                      >
                        <Icon className={`w-4 h-4 mr-2 ${color}`} />
                        <span>{label}</span>
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                onClick={handleToggleWatch}
                disabled={isUpdating}
              >
                {isWatching ? (
                  <EyeOff className="w-4 h-4 mr-2" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {isWatching ? "Unwatch Ticket" : "Watch Ticket"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reassign Modal */}
      {isReassigning && (
        <ReassignTicketModal
          open={isReassigning}
          onClose={() => setIsReassigning(false)}
          ticket={ticket}
          teamMembers={teamMembers}
          onSuccess={() => {
            setIsReassigning(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
