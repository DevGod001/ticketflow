import React, { useState } from "react";
import { Team } from "@/api/entities";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CreateTeamModal({ open, onClose, onSuccess, allMembers, organizationId }) {
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [leadEmail, setLeadEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const toggleMember = (memberEmail) => {
    setSelectedMembers(prev =>
      prev.includes(memberEmail)
        ? prev.filter(email => email !== memberEmail)
        : [...prev, memberEmail]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Team name is required");
      return;
    }
    if (!leadEmail) {
      setError("A team lead must be selected");
      return;
    }

    setIsSubmitting(true);
    try {
      await Team.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        organization_id: organizationId,
        lead_email: leadEmail,
        members: [...new Set([leadEmail, ...selectedMembers])] // Ensure lead is always a member
      });
      onSuccess();
    } catch (err) {
      console.error("Error creating team:", err);
      setError("Failed to create team. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <div>
            <Label htmlFor="team-name">Team Name *</Label>
            <Input id="team-name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="team-description">Description</Label>
            <Textarea id="team-description" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} />
          </div>

          <div>
            <Label>Team Lead *</Label>
            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border p-2 rounded-md">
              {allMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                  <input type="radio" name="lead" id={`lead-${member.id}`} value={member.email} onChange={(e) => setLeadEmail(e.target.value)} checked={leadEmail === member.email} className="form-radio h-4 w-4 text-blue-600"/>
                  <Avatar className="w-8 h-8"><AvatarImage src={member.avatar_url} /><AvatarFallback>{member.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                  <label htmlFor={`lead-${member.id}`} className="flex-1">{member.full_name || member.email}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <Label>Team Members</Label>
             <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border p-2 rounded-md">
              {allMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                  <Checkbox id={`member-${member.id}`} checked={selectedMembers.includes(member.email)} onCheckedChange={() => toggleMember(member.email)} />
                  <Avatar className="w-8 h-8"><AvatarImage src={member.avatar_url} /><AvatarFallback>{member.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                  <label htmlFor={`member-${member.id}`} className="flex-1">{member.full_name || member.email}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2"/>
              {isSubmitting ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}