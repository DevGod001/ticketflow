import React, { useState } from "react";
import { User } from "@/api/entities";
import { Ticket } from "@/api/entities";
import { Notification } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X, Users } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function ReassignTicketModal({ open, onClose, ticket, teamMembers, onSuccess }) {
  const [selectedAssignees, setSelectedAssignees] = useState(ticket.assigned_to || []);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAssignee = (email) => {
    setSelectedAssignees(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const user = await User.me();
      
      // Update ticket assignments
      const newStatus = selectedAssignees.length > 0 ? 'assigned' : 'open';
      await Ticket.update(ticket.id, {
        assigned_to: selectedAssignees,
        status: newStatus
      });

      // Get newly assigned users (not previously assigned)
      const previousAssignees = ticket.assigned_to || [];
      const newlyAssigned = selectedAssignees.filter(email => !previousAssignees.includes(email));
      const removedAssignees = previousAssignees.filter(email => !selectedAssignees.includes(email));

      // Notify newly assigned users
      for (const email of newlyAssigned) {
        if (email !== user.email) {
          await Notification.create({
            user_email: email,
            type: 'assignment',
            title: `Ticket assigned: ${ticket.title.slice(0, 30)}...`,
            message: `You have been assigned to this ticket by ${user.full_name || user.email}.`,
            organization_id: ticket.organization_id,
            related_id: ticket.id,
            from_user_email: user.email,
            link: createPageUrl("AllTickets", `ticket=${ticket.id}`)
          });
        }
      }

      // Notify removed assignees
      for (const email of removedAssignees) {
        if (email !== user.email) {
          await Notification.create({
            user_email: email,
            type: 'assignment',
            title: `Ticket reassigned: ${ticket.title.slice(0, 30)}...`,
            message: `Your ticket has been reassigned by ${user.full_name || user.email}.`,
            organization_id: ticket.organization_id,
            related_id: ticket.id,
            from_user_email: user.email,
            link: createPageUrl("AllTickets", `ticket=${ticket.id}`)
          });
        }
      }

      // Notify ticket reporter if they're not the one doing the reassignment
      if (ticket.reporter_email !== user.email) {
        await Notification.create({
          user_email: ticket.reporter_email,
          type: 'assignment',
          title: `Ticket reassigned: ${ticket.title.slice(0, 30)}...`,
          message: `Your ticket has been reassigned by ${user.full_name || user.email}.`,
          organization_id: ticket.organization_id,
          related_id: ticket.id,
          from_user_email: user.email,
          link: createPageUrl("AllTickets", `ticket=${ticket.id}`)
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error reassigning ticket:", error);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Reassign Ticket
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Current Assignees</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(ticket.assigned_to || []).map((email) => {
                const member = teamMembers.find(m => m.email === email);
                return (
                  <Badge key={email} variant="secondary">
                    {member?.full_name || email}
                  </Badge>
                );
              })}
              {(!ticket.assigned_to || ticket.assigned_to.length === 0) && (
                <Badge variant="outline" className="text-slate-500">Unassigned</Badge>
              )}
            </div>
          </div>

          <div>
            <Label>New Assignees</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between mt-2"
                >
                  {selectedAssignees.length > 0 ? `${selectedAssignees.length} selected` : "Select assignees..."}
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
                          key={member.email}
                          onSelect={() => toggleAssignee(member.email)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedAssignees.includes(member.email)
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          <div className="flex items-center gap-2">
                            <span>{member.full_name || member.email}</span>
                            <span className="text-xs text-slate-500">({member.email})</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedAssignees.map((email) => {
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

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Reassigning...' : 'Reassign Ticket'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}