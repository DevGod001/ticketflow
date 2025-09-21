import React, { useState, useCallback, useMemo } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { CollaborationRoom } from "@/api/entities";
import { GroupMessage } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Users,
  Globe,
  Lock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StorageCleanup } from "@/utils/storageCleanup";

export default function CreateCollaborationRoom() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomType, setRoomType] = useState("public");
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Load initial data
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        if (!currentUser.active_organization_id) {
          setError("No active organization found.");
          setIsLoading(false);
          return;
        }

        const orgData = await Organization.filter({
          id: currentUser.active_organization_id,
        }).then((orgs) => orgs[0]);

        if (!orgData) {
          setError("Could not find your organization.");
          setIsLoading(false);
          return;
        }

        let memberProfiles = orgData.member_profiles || [];
        const orgMembers = [
          ...new Set([orgData.owner_email, ...(orgData.members || [])]),
        ];

        if (memberProfiles.length < orgMembers.length) {
          const profiles = [];
          for (const email of orgMembers) {
            try {
              const userList = await User.filter({ email });
              let userProfile = {
                email,
                full_name: email.split("@")[0],
                position: "Team Member",
                avatar_url: null,
              };
              if (userList.length > 0) {
                const u = userList[0];
                userProfile.full_name = u.full_name || email.split("@")[0];
                userProfile.position = u.position || "Team Member";
                userProfile.avatar_url = u.avatar_url;
              }
              if (email === orgData.owner_email) {
                userProfile.position = "Owner";
              }
              profiles.push(userProfile);
            } catch (e) {
              console.error(`Failed to fetch profile for ${email}`, e);
            }
          }
          if (profiles.length > 0) {
            await Organization.update(orgData.id, {
              member_profiles: profiles,
            });
            memberProfiles = profiles;
          }
        }
        setTeamMembers(memberProfiles);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load organization data. Please try again.");
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Optimized input handlers
  const handleRoomNameChange = useCallback((e) => {
    setRoomName(e.target.value);
  }, []);

  const handleRoomDescriptionChange = useCallback((e) => {
    setRoomDescription(e.target.value);
  }, []);

  const handleRoomTypeChange = useCallback((type) => {
    setRoomType(type);
  }, []);

  const handleMemberSelection = useCallback((member, checked) => {
    if (checked) {
      setSelectedMembers((prev) => [...prev, member]);
    } else {
      setSelectedMembers((prev) =>
        prev.filter((m) => m.email !== member.email)
      );
    }
  }, []);

  // Memoized team members list
  const availableTeamMembers = useMemo(
    () => teamMembers.filter((member) => member.email !== user?.email),
    [teamMembers, user?.email]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomName.trim() || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare member data with proper structure
      const allMembers = [
        {
          email: user.email,
          full_name: user.full_name || user.email.split("@")[0],
          position: user.position || "Team Member",
          avatar_url: user.avatar_url || null,
        },
        ...selectedMembers.map((member) => ({
          email: member.email,
          full_name: member.full_name || member.email.split("@")[0],
          position: member.position || "Team Member",
          avatar_url: member.avatar_url || null,
        })),
      ];

      // Create the collaboration room
      const roomData = {
        name: roomName.trim(),
        description: roomDescription.trim() || null,
        type: roomType,
        organization_id: user.active_organization_id,
        member_emails: allMembers.map((m) => m.email),
        members: allMembers,
        isPrivate: roomType === "private",
        created_by: user.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating room with data:", roomData);

      let createdRoom;
      try {
        createdRoom = await CollaborationRoom.create(roomData);
      } catch (storageError) {
        // Check if it's a storage quota error
        if (storageError.message && storageError.message.includes("quota")) {
          console.log("Storage quota exceeded, attempting cleanup...");

          // Show user we're cleaning up storage
          setError("Storage full, cleaning up old data...");

          // Perform emergency cleanup
          const cleanupResult = StorageCleanup.emergencyCleanup();
          console.log("Cleanup completed:", cleanupResult);

          // Wait a moment for cleanup to complete
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Try creating the room again
          setError("Retrying room creation...");
          createdRoom = await CollaborationRoom.create(roomData);
        } else {
          throw storageError;
        }
      }

      console.log("Room created successfully:", createdRoom);

      // Create welcome message
      try {
        await GroupMessage.create({
          room_id: createdRoom.id,
          content: `🎉 Welcome to ${roomName.trim()}! This collaboration room has been created for team communication.`,
          sender_email: "system",
          sender_name: "System",
          organization_id: user.active_organization_id,
          created_at: new Date().toISOString(),
        });
      } catch (messageError) {
        // If welcome message fails due to storage, that's okay - room is still created
        console.warn("Welcome message creation failed:", messageError);
      }

      setSuccess(true);

      // Redirect to messages after a short delay
      setTimeout(() => {
        navigate("/messages");
      }, 2000);
    } catch (error) {
      console.error("Error creating collaboration room:", error);
      console.error("Error details:", error.message, error.stack);

      // Provide more helpful error messages
      let errorMessage = "Please try again.";
      if (error.message && error.message.includes("quota")) {
        errorMessage = "Storage is full. Please clear some data and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(`Failed to create collaboration room: ${errorMessage}`);
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Room Created Successfully!
              </h2>
              <p className="text-slate-600 mb-4">
                Your collaboration room "{roomName}" has been created.
              </p>
              <p className="text-sm text-slate-500">
                Redirecting to messages...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in slide-in-from-bottom-4 duration-700 delay-150">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/messages")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Messages
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Create Collaboration Room
              </h1>
              <p className="text-slate-600">
                Set up a multi-member collaboration space for your team
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Room Details */}
          <Card className="animate-in slide-in-from-left-4 duration-500 delay-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </span>
                Room Details
              </CardTitle>
              <CardDescription>
                Choose a name and description for your collaboration space
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="room-name"
                  className="text-sm font-medium text-slate-900"
                >
                  Room Name *
                </label>
                <Input
                  id="room-name"
                  type="text"
                  value={roomName}
                  onChange={handleRoomNameChange}
                  placeholder="e.g., Marketing Team, Project Alpha, Design Review"
                  className="w-full"
                  required
                />
                <p className="text-xs text-slate-500">
                  Choose a clear, descriptive name that reflects the purpose of
                  this room
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="room-description"
                  className="text-sm font-medium text-slate-900"
                >
                  Description (Optional)
                </label>
                <Input
                  id="room-description"
                  type="text"
                  value={roomDescription}
                  onChange={handleRoomDescriptionChange}
                  placeholder="What's this collaboration about?"
                  className="w-full"
                />
                <p className="text-xs text-slate-500">
                  Briefly describe the purpose or goals of this collaboration
                  room
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Privacy Settings */}
          <Card className="animate-in slide-in-from-right-4 duration-500 delay-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </span>
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Choose who can access this collaboration room
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${
                    roomType === "public"
                      ? "ring-2 ring-blue-500 bg-blue-50 scale-105 shadow-md"
                      : "hover:bg-slate-50"
                  }`}
                  onClick={() => handleRoomTypeChange("public")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">
                          Public Room
                        </h3>
                        <p className="text-sm text-slate-600">
                          Anyone in your organization can join
                        </p>
                      </div>
                      <div className="w-5 h-5">
                        {roomType === "public" && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${
                    roomType === "private"
                      ? "ring-2 ring-blue-500 bg-blue-50 scale-105 shadow-md"
                      : "hover:bg-slate-50"
                  }`}
                  onClick={() => handleRoomTypeChange("private")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">
                          Private Room
                        </h3>
                        <p className="text-sm text-slate-600">
                          Only invited members can join
                        </p>
                      </div>
                      <div className="w-5 h-5">
                        {roomType === "private" && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Add Team Members */}
          <Card className="animate-in slide-in-from-left-4 duration-500 delay-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </span>
                Add Team Members
              </CardTitle>
              <CardDescription>
                Select organization members to invite to this collaboration room
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    {selectedMembers.length} of {availableTeamMembers.length}{" "}
                    members selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMembers([])}
                    >
                      Clear All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedMembers([...availableTeamMembers])
                      }
                    >
                      Select All
                    </Button>
                  </div>
                </div>

                <Separator />

                <ScrollArea className="h-64 w-full rounded-md border p-4">
                  <div className="space-y-3">
                    {availableTeamMembers.map((member) => (
                      <div
                        key={member.email}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Checkbox
                          id={`member-${member.email}`}
                          checked={selectedMembers.some(
                            (m) => m.email === member.email
                          )}
                          onCheckedChange={(checked) =>
                            handleMemberSelection(member, checked)
                          }
                        />
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                            {member.full_name?.charAt(0) ||
                              member.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <label
                          htmlFor={`member-${member.email}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium text-slate-900">
                            {member.full_name || member.email}
                          </div>
                          <div className="text-sm text-slate-500">
                            {member.position} • {member.email}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Submit Section */}
          <Card className="animate-in slide-in-from-right-4 duration-500 delay-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Ready to create your room?
                  </h3>
                  <p className="text-sm text-slate-600">
                    You can always modify settings and add more members later
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/messages")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!roomName.trim() || isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Create Room
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
