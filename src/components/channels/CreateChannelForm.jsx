
import React, { useState } from "react";
import { Channel } from "@/api/entities";
import { User } from "@/api/entities"; // Added User import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"; // Added Badge import
import { Alert, AlertDescription } from "@/components/ui/alert"; // Added Alert imports
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Added Popover imports
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"; // Added Command imports
import {
  ArrowLeft,
  Save,
  Hash,
  Palette,
  AlertCircle, // Added AlertCircle icon
  Users,       // Added Users icon
  Lock,        // Added Lock icon
  Plus,        // Added Plus icon
  X            // Added X icon
} from "lucide-react";

const CHANNEL_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#84cc16", // Lime
  "#ec4899", // Pink
  "#6366f1"  // Indigo
];

export default function CreateChannelForm({ user, teamMembers, onCancel, onSuccess }) { // Added teamMembers prop
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general',
    color: '#3b82f6'
  });
  const [selectedMembers, setSelectedMembers] = useState(user ? [user.email] : []); // Added selectedMembers state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleMemberSelect = (memberEmail) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberEmail)) {
        // Prevent creator from being removed
        if (memberEmail === user.email) return prev;
        return prev.filter(email => email !== memberEmail);
      } else {
        return [...prev, memberEmail];
      }
    });
  };

  const getMemberDetails = (email) => {
    return teamMembers.find(m => m.email === email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Channel name is required');
      return;
    }

    // Validate channel name (no spaces, special characters)
    const channelNameRegex = /^[a-z0-9-_]+$/;
    if (!channelNameRegex.test(formData.name.toLowerCase())) {
      setError('Channel name can only contain lowercase letters, numbers, hyphens, and underscores');
      return;
    }

    if (formData.type === 'private' && selectedMembers.length === 0) {
      setError('Private channels must have at least one member');
      return;
    }

    setIsSubmitting(true);
    try {
      await Channel.create({
        name: formData.name.toLowerCase(),
        description: formData.description.trim(),
        type: formData.type,
        organization_id: user.active_organization_id,
        creator_email: user.email,
        members: formData.type === 'private' ? selectedMembers : [user.email], // Conditionally assign members
        admins: [user.email],
        is_public: formData.type !== 'private', // Derive is_public from type
        color: formData.color
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating channel:', error);
      setError('Failed to create channel. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onCancel} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Channels
      </Button>
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Create New Channel</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Channel Name *</Label>
              <div className="relative mt-2">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value.replace(/[^a-z0-9-_]/g, ''))}
                  placeholder="channel-name"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Use lowercase letters, numbers, hyphens, and underscores only
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="What's this channel about?"
                className="mt-2 h-20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="type">Channel Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-500" /> General (Public)
                      </div>
                    </SelectItem>
                    <SelectItem value="announcement">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-slate-500" /> Announcement (Public)
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-slate-500" /> Private
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4" />
                  Channel Color
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {CHANNEL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange('color', color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                        formData.color === color ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {formData.type === 'private' && (
              <div>
                <Label>Members</Label>
                <div className="mt-2 flex flex-wrap gap-2 p-2 border rounded-lg min-h-[40px]">
                  {selectedMembers.map(email => {
                    const member = getMemberDetails(email);
                    return (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {member?.full_name || email}
                        {email !== user.email && ( // Allow removing only if not the creator
                          <button
                            type="button"
                            onClick={() => handleMemberSelect(email)}
                            className="ml-1 rounded-full hover:bg-slate-200 p-0.5"
                            aria-label={`Remove ${member?.full_name || email}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-6">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-64">
                      <Command>
                        <CommandInput placeholder="Search members..." />
                        <CommandList>
                          <CommandEmpty>No members found.</CommandEmpty>
                          <CommandGroup>
                            {teamMembers.map(member => (
                              <CommandItem
                                key={member.email}
                                onSelect={() => handleMemberSelect(member.email)}
                                disabled={selectedMembers.includes(member.email)}
                              >
                                {member.full_name || member.email}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-sm text-slate-500 mt-1">Select who can see and participate in this channel.</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name.trim() || (formData.type === 'private' && selectedMembers.length === 0)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Creating...' : 'Create Channel'}
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
