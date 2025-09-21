import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Department } from "@/api/entities";
import { Ticket } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, ChevronsUpDown, Check, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

export default function EditTicketForm({ ticket, teamMembers, onCancel, onSuccess }) {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    department_id: ticket.department_id || '',
    due_date: ticket.due_date ? ticket.due_date.split('T')[0] : '',
    assigned_to: ticket.assigned_to || [],
    tags: ticket.tags || []
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
          organization_id: currentUser.active_organization_id
        });
        setDepartments(orgDepartments);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load initial data. Please try again.");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleAssignee = (email) => {
    const newAssignees = formData.assigned_to.includes(email)
      ? formData.assigned_to.filter(e => e !== email)
      : [...formData.assigned_to, email];
    handleInputChange('assigned_to', newAssignees);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedToArray = Array.isArray(formData.assigned_to) 
        ? formData.assigned_to 
        : (formData.assigned_to ? [formData.assigned_to] : []);

      // Determine new status based on assignments
      let newStatus = ticket.status;
      if (assignedToArray.length > 0 && ticket.status === 'open') {
        newStatus = 'assigned';
      } else if (assignedToArray.length === 0 && ticket.status === 'assigned') {
        newStatus = 'open';
      }

      await Ticket.update(ticket.id, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: newStatus,
        department_id: formData.department_id || null,
        due_date: formData.due_date || null,
        assigned_to: assignedToArray,
        tags: formData.tags.filter(tag => tag.trim())
      });

      // Send notifications to newly assigned users (if any)
      const newlyAssigned = assignedToArray.filter(email => 
        !ticket.assigned_to?.includes(email) && email !== user.email
      );
      
      for (const assigneeEmail of newlyAssigned) {
        await Notification.create({
          user_email: assigneeEmail,
          type: 'assignment',
          title: 'Ticket updated and assigned to you',
          message: `You have been assigned to ticket: ${formData.title.trim()}`,
          organization_id: ticket.organization_id,
          related_id: ticket.id,
          from_user_email: user.email
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating ticket:', error);
      setError('Failed to update ticket. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-slate-900">Edit Ticket</h1>
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
                onChange={(e) => handleInputChange('title', e.target.value)}
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
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the issue..."
                className="mt-2 h-32"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
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
                <Select value={formData.department_id} onValueChange={(value) => handleInputChange('department_id', value)}>
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
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={assigneePopoverOpen}
                      className="w-full justify-between mt-2"
                    >
                      {formData.assigned_to.length > 0 ? `${formData.assigned_to.length} selected` : "Select assignees..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search team members..." />
                      <CommandList>
                        <CommandEmpty>No members found.</CommandEmpty>
                        <CommandGroup>
                          {teamMembers.map((member) => (
                            <CommandItem
                              key={member.id || member.email}
                              onSelect={() => toggleAssignee(member.email)}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.assigned_to.includes(member.email)
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {member.full_name || member.email}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.assigned_to.map((email) => {
                    const member = teamMembers.find(m => m.email === email);
                    return (
                      <Badge key={email} variant="secondary" className="flex items-center gap-2">
                        {member?.full_name || email}
                        <button type="button" onClick={() => toggleAssignee(email)} className="rounded-full hover:bg-slate-300">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              {error && <div className="text-red-500 text-sm mr-auto flex items-center">{error}</div>}
              <Button 
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
                className="bg-gradient-to-r from-green-600 to-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Updating...' : 'Update Ticket'}
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