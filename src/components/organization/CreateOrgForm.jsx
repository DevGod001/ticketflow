
import React, { useState } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, AlertCircle } from "lucide-react";

export default function CreateOrgForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const generateOrgId = () => {
    const prefix = formData.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Organization name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await User.me();
      const orgId = formData.organization_id || generateOrgId();

      // Check if organization ID is already taken
      const existing = await Organization.filter({ organization_id: orgId });
      if (existing.length > 0) {
        setError('Organization ID already exists. Please choose a different one.');
        setIsSubmitting(false);
        return;
      }

      const newOrg = await Organization.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        organization_id: orgId,
        owner_email: user.email,
        admins: [user.email],
        members: [user.email], // Add owner to members list
        member_profiles: [{
          email: user.email,
          full_name: user.full_name,
          position: user.position || 'Owner',
          avatar_url: user.avatar_url
        }],
        settings: {
          allow_public_join: false,
          require_approval: true
        }
      });

      // Update user to be verified and set as active organization
      // TESTING: Automatically assign admin role to organization creator
      await User.updateMyUserData({
        verified_organizations: [...(user.verified_organizations || []), newOrg.id],
        active_organization_id: newOrg.id,
        role: 'admin'  // Auto-assign admin role
      });

      onSuccess(newOrg);
    } catch (error) {
      console.error('Error creating organization:', error);
      setError('Failed to create organization. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-0">
      <Card className="border-none shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl">Create Organization</CardTitle>
              <p className="text-slate-600 text-sm md:text-base">Start your team's ticketing journey</p>
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

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <Label htmlFor="name" className="text-sm md:text-base">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm md:text-base">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of your organization..."
                className="mt-2 h-20 md:h-24"
              />
            </div>

            <div>
              <Label htmlFor="organization_id" className="text-sm md:text-base">Organization ID</Label>
              <Input
                id="organization_id"
                value={formData.organization_id}
                onChange={(e) => handleInputChange('organization_id', e.target.value)}
                placeholder="Leave empty to auto-generate"
                className="mt-2"
              />
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                This ID will be used by team members to join your organization
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full sm:w-auto"
              >
                {isSubmitting ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
