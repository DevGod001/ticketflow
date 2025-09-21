
import React, { useState } from "react";
import { Department } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Save,
  AlertCircle,
  ChevronsUpDown,
  X,
  Trash2,
  Palette,
  Check,
} from "lucide-react";

const DEPARTMENT_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316",
  "#ec4899", "#6366f1", "#14b8a6", "#eab308",
];

export default function EditDepartmentModal({
  department,
  teamMembers,
  onClose,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    name: department.name || "",
    description: department.description || "",
    color: department.color || DEPARTMENT_COLORS[0],
    head_email: department.head_email || "",
    members: department.members || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const [headPopoverOpen, setHeadPopoverOpen] = useState(false);
  const [membersPopoverOpen, setMembersPopoverOpen] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const toggleMember = (email) => {
    const newMembers = formData.members.includes(email)
      ? formData.members.filter((m) => m !== email)
      : [...formData.members, email];
    handleInputChange("members", newMembers);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Department name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await Department.update(department.id, formData);
      onSuccess();
    } catch (error) {
      console.error("Error updating department:", error);
      setError("Failed to update department. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete the "${department.name}" department? This action cannot be undone.`
      )
    ) {
      setIsDeleting(true);
      setError("");
      try {
        await Department.delete(department.id);
        onSuccess();
      } catch (error) {
        console.error("Error deleting department:", error);
        setError("Failed to delete department. Please try again.");
        setIsDeleting(false);
      }
    }
  };

  const getMemberDetails = (email) => teamMembers.find((m) => m.email === email);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Edit Department
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-6 pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm">Department Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="mt-2 h-20"
              />
            </div>

            <div>
              <Label className="text-sm">Department Head</Label>
              <Popover open={headPopoverOpen} onOpenChange={setHeadPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={headPopoverOpen}
                    className="w-full justify-between mt-2"
                  >
                    {formData.head_email
                      ? getMemberDetails(formData.head_email)?.full_name ||
                        formData.head_email
                      : "Select a member..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search member..." />
                    <CommandList>
                      <CommandEmpty>No member found.</CommandEmpty>
                      <CommandGroup>
                        {teamMembers.map((member) => (
                          <CommandItem
                            key={member.id}
                            onSelect={() => {
                              handleInputChange("head_email", member.email);
                              setHeadPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                formData.head_email === member.email
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
            </div>

            <div>
              <Label className="text-sm">Members</Label>
              <Popover
                open={membersPopoverOpen}
                onOpenChange={setMembersPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={membersPopoverOpen}
                    className="w-full justify-between mt-2"
                  >
                    Select members...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        {teamMembers.map((member) => (
                          <CommandItem
                            key={member.id}
                            onSelect={() => toggleMember(member.email)}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                formData.members.includes(member.email)
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
                {formData.members.map((email) => {
                  const member = getMemberDetails(email);
                  return (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1 text-xs"
                    >
                      {member?.full_name || email}
                      <button
                        type="button"
                        onClick={() => toggleMember(email)}
                        className="rounded-full hover:bg-slate-300 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-3 block text-sm">Department Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {DEPARTMENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleInputChange("color", color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                      formData.color === color
                        ? "border-slate-900 ring-2 ring-offset-2 ring-slate-900"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-6 flex flex-col-reverse sm:flex-row sm:justify-between w-full gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
