import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Department } from "@/api/entities";
import { Ticket } from "@/api/entities";
import { Notification } from "@/api/entities";
import { UploadFile } from "../../services/localFileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  ChevronsUpDown,
  Check,
  X,
  Paperclip,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { createPageUrl } from "@/utils";

export default function CreateTicketForm({ teamMembers, onCancel, onSuccess }) {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    department_id: "",
    due_date: "",
    assigned_to: [],
    tags: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.active_organization_id) {
        const orgDepartments = await Department.filter({
          organization_id: currentUser.active_organization_id,
        });
        setDepartments(orgDepartments);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load initial data. Please try again.");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleAssignee = (email) => {
    const newAssignees = formData.assigned_to.includes(email)
      ? formData.assigned_to.filter((e) => e !== email)
      : [...formData.assigned_to, email];
    handleInputChange("assigned_to", newAssignees);
    // Close the popover after selection for better UX
    setAssigneePopoverOpen(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear any previous errors
    setError(null);
    setIsUploading(true);

    try {
      const result = await UploadFile({ file });
      const newAttachment = {
        url: result.file_url,
        name: result.file_name || file.name,
        type: file.type,
        size: file.size,
        id: result.file_id,
      };
      setAttachments((prev) => [...prev, newAttachment]);
      console.log("File uploaded successfully:", result);
    } catch (error) {
      console.error("Error uploading file:", error);
      // Extract the actual error message from the error object
      const errorMessage =
        error.message ||
        error.toString() ||
        "Failed to upload file. Please try again.";
      setError(errorMessage);
    }
    setIsUploading(false);
    e.target.value = null; // Allow re-uploading the same file
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user || !user.active_organization_id || !user.email) {
        throw new Error("User data not available for ticket creation.");
      }

      const assignedToArray = Array.isArray(formData.assigned_to)
        ? formData.assigned_to
        : formData.assigned_to
        ? [formData.assigned_to]
        : [];

      const newTicket = await Ticket.create({
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: assignedToArray.length > 0 ? "assigned" : "open",
        organization_id: user.active_organization_id,
        department_id: formData.department_id || null,
        reporter_email: user.email,
        due_date: formData.due_date || null,
        assigned_to: assignedToArray,
        tags: formData.tags.filter((tag) => tag.trim()),
        attachments: attachments, // Include attachments in ticket creation
        watchers: [user.email],
      });

      // Send notifications to assigned users (improved)
      console.log("Creating notifications for assignees:", assignedToArray);
      for (const assigneeEmail of assignedToArray) {
        if (assigneeEmail !== user.email) {
          try {
            const notificationData = {
              user_email: assigneeEmail,
              type: "assignment",
              title: "New ticket assigned to you",
              message: `You have been assigned to ticket: "${formData.title.trim()}" by ${
                user.full_name || user.email
              }`,
              organization_id: user.active_organization_id,
              related_id: newTicket.id,
              from_user_email: user.email,
              link: createPageUrl("AllTickets", `ticket=${newTicket.id}`),
            };
            console.log("Creating notification:", notificationData);

            const createdNotification = await Notification.create(
              notificationData
            );
            console.log(
              "Notification created successfully:",
              createdNotification
            );

            // Verify notification was stored
            const storedNotifications = JSON.parse(
              localStorage.getItem("ticketflow_notifications") || "{}"
            );
            console.log("All stored notifications:", storedNotifications);

            // Check if we can filter it back
            const userNotifications = await Notification.filter({
              user_email: assigneeEmail,
              read: false,
            });
            console.log(
              `Notifications for ${assigneeEmail}:`,
              userNotifications
            );
          } catch (notificationError) {
            console.error(
              `Failed to send notification to ${assigneeEmail}:`,
              notificationError
            );
            // Don't fail the entire ticket creation if notification fails
          }
        }
      }

      // Trigger immediate notification refresh
      if (window.refreshNotifications) {
        window.refreshNotifications();
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating ticket:", error);
      setError("Failed to create ticket. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-slate-900">Create New Ticket</h1>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Brief description of the issue"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Detailed description of the issue..."
                className="mt-2 h-32"
              />
            </div>

            {/* Enhanced Attachments Section */}
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Attachments
              </Label>
              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 cursor-pointer border border-slate-300 rounded-lg px-4 py-2 hover:bg-blue-50 transition-all duration-200 hover:border-blue-300">
                    <Paperclip className="w-4 h-4" />
                    <span>Attach Files</span>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple={false}
                      accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
                    />
                  </label>
                  {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading file...</span>
                    </div>
                  )}
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-medium">
                      {attachments.length} file
                      {attachments.length > 1 ? "s" : ""} attached
                    </p>
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700 font-medium truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {file.type || "Unknown type"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-all duration-200"
                          title="Remove attachment"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Supported formats: Images, PDF, Word, Excel, PowerPoint, Text
                  files (Max 2MB per file)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    handleInputChange("priority", value)
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) =>
                    handleInputChange("department_id", value)
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>General</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assign_to">Assign To</Label>
                <Popover
                  open={assigneePopoverOpen}
                  onOpenChange={setAssigneePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={assigneePopoverOpen}
                      className="w-full justify-between mt-2"
                    >
                      {formData.assigned_to.length > 0
                        ? `${formData.assigned_to.length} selected`
                        : "Select assignees..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search team members..." />
                      <CommandList>
                        <CommandEmpty>No members found.</CommandEmpty>
                        <CommandGroup>
                          {teamMembers && teamMembers.length > 0 ? (
                            teamMembers.map((member) => (
                              <CommandItem
                                key={member.email}
                                onSelect={() => toggleAssignee(member.email)}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.assigned_to.includes(member.email)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <div className="flex items-center gap-2">
                                  <span>
                                    {member.full_name || member.email}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    ({member.email})
                                  </span>
                                </div>
                              </CommandItem>
                            ))
                          ) : (
                            <CommandItem disabled>
                              No team members available
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Show selected assignees immediately */}
                {formData.assigned_to.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.assigned_to.map((email) => {
                      const member = teamMembers.find((m) => m.email === email);
                      return (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          {member?.full_name || email}
                          <button
                            type="button"
                            onClick={() => toggleAssignee(email)}
                            className="rounded-full hover:bg-slate-300 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    handleInputChange("due_date", e.target.value)
                  }
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              {error && (
                <div className="text-red-500 text-sm mr-auto flex items-center">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || isUploading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Creating..." : "Create Ticket"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
