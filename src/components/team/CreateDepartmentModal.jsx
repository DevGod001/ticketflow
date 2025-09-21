import React, { useState } from "react";
import { Department } from "@/api/entities";
import { User } from "@/api/entities";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, X, Users } from "lucide-react";

const departmentColors = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Teal", value: "#14b8a6" }
];

export default function CreateDepartmentModal({ open, onClose, onSuccess, teamMembers, user, organizationId }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6"
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
      setError("Department name is required");
      return;
    }

    if (!user?.email) {
      setError("User information not available");
      return;
    }

    if (!organizationId) {
      setError("Organization information not available");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create department with current user as head and all selected members
      const members = [user.email, ...selectedMembers.filter(email => email !== user.email)];
      
      await Department.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        organization_id: organizationId,
        head_email: user.email,
        members: members,
        color: formData.color
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        color: "#3b82f6"
      });
      setSelectedMembers([]);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating department:", error);
      setError("Failed to create department. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6"
    });
    setSelectedMembers([]);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create Department</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="name">Department Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g. Engineering"
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description..."
              className="mt-2 h-20"
            />
          </div>

          <div>
            <Label>Department Color</Label>
            <div className="grid grid-cols-4 gap-3 mt-2">
              {departmentColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleInputChange("color", color.value)}
                  className={`flex items-center gap-2 p-2 rounded-lg border hover:bg-slate-50 transition-colors ${
                    formData.color === color.value ? "border-slate-400 bg-slate-50" : "border-slate-200"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-sm">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" />
              Add Team Members
            </Label>
            
            {teamMembers && teamMembers.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {teamMembers
                      .filter(member => member.email !== user?.email) // Exclude current user since they're auto-included
                      .map((member) => (
                        <div key={member.email} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                          <Checkbox
                            id={member.email}
                            checked={selectedMembers.includes(member.email)}
                            onCheckedChange={() => toggleMember(member.email)}
                          />
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">
                              {member.full_name?.charAt(0) || member.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-900 truncate">
                              {member.full_name || member.email}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{member.email}</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  
                  {selectedMembers.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-slate-700 mb-2">Selected Members:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map((email) => {
                          const member = teamMembers.find(m => m.email === email);
                          return (
                            <Badge key={email} variant="secondary" className="flex items-center gap-1">
                              {member?.full_name || email}
                              <button type="button" onClick={() => toggleMember(email)}>
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <p className="text-slate-500 text-sm">No team members available to add.</p>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You will be set as the department head and automatically added as a member.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? "Creating..." : "Create Department"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}