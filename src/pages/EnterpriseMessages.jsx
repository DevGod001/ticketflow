import React, { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Users,
  Hash,
  Lock,
  Globe,
  Video,
  Phone,
  Search,
  Settings,
  UserPlus,
  Crown,
  Shield,
  Star,
  Pin,
  Bell,
  BellOff,
  Archive,
  MoreVertical,
  Sparkles,
  Activity,
  TrendingUp,
  Zap,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import TeamChatRoom from "../components/collaboration/TeamChatRoom";
import EnterpriseMeeting from "../components/collaboration/EnterpriseMeeting";

// Enterprise Messages with Multi-member Chat Rooms and Meetings
export default function EnterpriseMessages() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const [showInviteMembersDialog, setShowInviteMembersDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // list or grid
  const [sortBy, setSortBy] = useState("recent"); // recent, name, members
  const [filterBy, setFilterBy] = useState("all"); // all, public, private, starred
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedRoomForInvite, setSelectedRoomForInvite] = useState(null);

  // New room creation state
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] = useState("public"); // public or private
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const currentUser = await User.me();
        setUser(currentUser);

        if (!currentUser.active_organization_id) {
          setError("No active organization found");
          setIsLoading(false);
          return;
        }

        const orgData = await Organization.filter({
          id: currentUser.active_organization_id,
        }).then((orgs) => orgs[0]);

        if (!orgData) {
          setError("Could not find your organization");
          setIsLoading(false);
          return;
        }

        setOrganization(orgData);

        // Load team members
        const allMemberEmails = [
          ...new Set([orgData.owner_email, ...(orgData.members || [])]),
        ];

        const memberProfiles = [];
        for (const email of allMemberEmails) {
          try {
            const userList = await User.filter({ email });
            let userProfile = {
              email,
              full_name: email.split("@")[0],
              position: "Team Member",
              avatar_url: null,
              role: email === orgData.owner_email ? "admin" : "member",
              status: "online", // Mock status
            };

            if (userList.length > 0) {
              const u = userList[0];
              userProfile.full_name = u.full_name || email.split("@")[0];
              userProfile.position = u.position || "Team Member";
              userProfile.avatar_url = u.avatar_url;
            }

            memberProfiles.push(userProfile);
          } catch (e) {
            console.error(`Failed to fetch profile for ${email}`, e);
          }
        }

        setTeamMembers(memberProfiles);

        // Initialize with sample chat rooms (in real app, load from backend)
        const sampleRooms = [
          {
            id: "general",
            name: "General",
            description: "General team discussions",
            type: "public",
            members: memberProfiles,
            messages: [
              {
                id: "1",
                content: "Welcome to the team chat! 🎉",
                sender: memberProfiles.find((m) => m.role === "admin"),
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                reactions: [{ emoji: "👋", count: 3 }],
              },
              {
                id: "2",
                content:
                  "Thanks for setting this up! Looking forward to collaborating.",
                sender: memberProfiles.find((m) => m.role === "member"),
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                reactions: [],
              },
            ],
            isPinned: true,
            isPrivate: false,
            createdBy: memberProfiles.find((m) => m.role === "admin"),
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            lastActivity: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: "project-alpha",
            name: "Project Alpha",
            description: "Discussions about Project Alpha development",
            type: "private",
            members: memberProfiles.slice(0, 3),
            messages: [
              {
                id: "3",
                content:
                  "Let's schedule a meeting to discuss the project roadmap.",
                sender: memberProfiles[0],
                timestamp: new Date(Date.now() - 900000).toISOString(),
                reactions: [{ emoji: "👍", count: 2 }],
              },
            ],
            isPinned: false,
            isPrivate: true,
            createdBy: memberProfiles[0],
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            lastActivity: new Date(Date.now() - 900000).toISOString(),
          },
        ];

        setChatRooms(sampleRooms);

        // Auto-select general room
        setSelectedRoom(sampleRooms[0]);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load messages. Please try again later.");
      }

      setIsLoading(false);
    };

    loadData();
  }, []);

  // Create new chat room
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    const newRoom = {
      id: Date.now().toString(),
      name: newRoomName,
      description: newRoomDescription,
      type: newRoomType,
      members: [user, ...selectedMembers],
      messages: [],
      isPinned: false,
      isPrivate: newRoomType === "private",
      createdBy: user,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    setChatRooms((prev) => [newRoom, ...prev]);
    setSelectedRoom(newRoom);

    // Reset form
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomType("public");
    setSelectedMembers([]);
    setShowCreateRoomDialog(false);
  };

  // Send message to room
  const handleSendMessage = async (message) => {
    if (!selectedRoom) return;

    const updatedRoom = {
      ...selectedRoom,
      messages: [...selectedRoom.messages, message],
      lastActivity: new Date().toISOString(),
    };

    setChatRooms((prev) =>
      prev.map((room) => (room.id === selectedRoom.id ? updatedRoom : room))
    );

    setSelectedRoom(updatedRoom);
  };

  // Start meeting
  const handleStartMeeting = async (meetingData) => {
    setActiveMeeting(meetingData);
  };

  // End meeting
  const handleEndMeeting = () => {
    setActiveMeeting(null);
  };

  // Invite members to room
  const handleInviteMembers = (roomId) => {
    setSelectedRoomForInvite(roomId);
    setShowInviteMembersDialog(true);
  };

  // Filter and sort rooms
  const filteredAndSortedRooms = chatRooms
    .filter((room) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !room.name.toLowerCase().includes(query) &&
          !room.description?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Type filter
      if (filterBy === "public" && room.isPrivate) return false;
      if (filterBy === "private" && !room.isPrivate) return false;
      if (filterBy === "starred" && !room.isPinned) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "members":
          return b.members.length - a.members.length;
        case "recent":
        default:
          return new Date(b.lastActivity) - new Date(a.lastActivity);
      }
    });

  // Sidebar component
  const Sidebar = () => (
    <div
      className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
        isSidebarCollapsed ? "w-16" : "w-80"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        {!isSidebarCollapsed && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-500" />
                Enterprise Chat
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(true)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Advanced team collaboration platform
            </p>
          </>
        )}

        {isSidebarCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(false)}
            className="w-full"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        ) : (
          <Dialog
            open={showCreateRoomDialog}
            onOpenChange={setShowCreateRoomDialog}
          >
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-blue-500" />
                  Create New Chat Room
                </DialogTitle>
                <DialogDescription>
                  Set up a new space for team collaboration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Room Name *
                  </label>
                  <Input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g., Marketing Team, Project Alpha"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Description
                  </label>
                  <Input
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder="What's this room for?"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Room Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={newRoomType === "public" ? "default" : "outline"}
                      onClick={() => setNewRoomType("public")}
                      className="flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Public
                    </Button>
                    <Button
                      variant={
                        newRoomType === "private" ? "default" : "outline"
                      }
                      onClick={() => setNewRoomType("private")}
                      className="flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Private
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateRoomDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={!newRoomName.trim()}
                >
                  Create Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isSidebarCollapsed && (
        <>
          {/* Search and Filters */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms..."
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Filter className="w-3 h-3 mr-1" />
                    {filterBy === "all"
                      ? "All"
                      : filterBy === "public"
                      ? "Public"
                      : filterBy === "private"
                      ? "Private"
                      : "Starred"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2">
                  <div className="space-y-1">
                    {["all", "public", "private", "starred"].map((filter) => (
                      <Button
                        key={filter}
                        variant={filterBy === filter ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start capitalize"
                        onClick={() => setFilterBy(filter)}
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <SortAsc className="w-3 h-3 mr-1" />
                    {sortBy === "recent"
                      ? "Recent"
                      : sortBy === "name"
                      ? "Name"
                      : "Members"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2">
                  <div className="space-y-1">
                    {[
                      { key: "recent", label: "Recent" },
                      { key: "name", label: "Name" },
                      { key: "members", label: "Members" },
                    ].map((sort) => (
                      <Button
                        key={sort.key}
                        variant={sortBy === sort.key ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSortBy(sort.key)}
                      >
                        {sort.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Rooms List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredAndSortedRooms.length > 0 ? (
                filteredAndSortedRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2 ${
                      selectedRoom?.id === room.id
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          room.isPrivate
                            ? "bg-gradient-to-r from-purple-500 to-pink-500"
                            : "bg-gradient-to-r from-blue-500 to-indigo-500"
                        }`}
                      >
                        {room.isPrivate ? (
                          <Lock className="w-5 h-5 text-white" />
                        ) : (
                          <Hash className="w-5 h-5 text-white" />
                        )}
                      </div>
                      {room.isPinned && (
                        <Pin className="absolute -top-1 -right-1 w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {room.name}
                        </h3>
                        {room.members.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {room.members.length}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {room.description || `${room.messages.length} messages`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(room.lastActivity), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8">
                  <MessageSquare className="mx-auto w-12 h-12 text-slate-300 mb-4" />
                  <h3 className="font-semibold text-slate-800 mb-2">
                    No rooms found
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Create your first chat room"}
                  </p>
                  <Button
                    onClick={() => setShowCreateRoomDialog(true)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Room
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading enterprise chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Something went wrong
          </h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Show active meeting
  if (activeMeeting) {
    return (
      <EnterpriseMeeting
        meeting={activeMeeting}
        user={user}
        participants={activeMeeting.participants || []}
        onEndMeeting={handleEndMeeting}
        onToggleVideo={() => {}}
        onToggleMic={() => {}}
        onStartScreenShare={() => {}}
        onInviteParticipant={() => {}}
        onSendChatMessage={() => {}}
      />
    );
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <TeamChatRoom
            room={selectedRoom}
            user={user}
            teamMembers={teamMembers}
            onSendMessage={handleSendMessage}
            onStartMeeting={handleStartMeeting}
            onInviteMembers={handleInviteMembers}
            onUpdateRoom={() => {}}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                Welcome to Enterprise Chat
              </h3>
              <p className="text-slate-600 mb-6 max-w-md">
                Select a chat room to start collaborating with your team, or
                create a new room to get started.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setShowCreateRoomDialog(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Room
                </Button>
                <Button variant="outline">
                  <Video className="w-4 h-4 mr-2" />
                  Start Meeting
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
