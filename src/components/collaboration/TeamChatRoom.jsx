import React, { useState, useEffect, useCallback, useRef } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Plus,
  Users,
  Video,
  Phone,
  MoreVertical,
  UserPlus,
  Settings,
  Pin,
  Archive,
  Bell,
  BellOff,
  Share2,
  FileText,
  Image,
  Paperclip,
  Smile,
  Search,
  Calendar,
  Clock,
  Zap,
  Star,
  Hash,
  Lock,
  Globe,
  Crown,
  Shield,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Volume2,
  VolumeX,
  Download,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Activity,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

// Enterprise-grade Team Chat Room Component
export default function TeamChatRoom({
  room,
  user,
  teamMembers,
  onSendMessage,
  onStartMeeting,
  onInviteMembers,
  onUpdateRoom,
}) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [room?.messages, scrollToBottom]);

  // Handle message sending
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      content: message,
      sender: user,
      timestamp: new Date().toISOString(),
      type: "text",
      reactions: [],
      mentions: extractMentions(message),
      attachments: [],
    };

    await onSendMessage(newMessage);
    setMessage("");
    setIsTyping(false);
  };

  // Extract @mentions from message
  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedUser = teamMembers.find((member) =>
        member.full_name.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentionedUser) {
        mentions.push(mentionedUser);
      }
    }
    return mentions;
  };

  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "HH:mm")}`;
    } else {
      return format(date, "MMM dd, HH:mm");
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages?.forEach((message) => {
      const date = format(new Date(message.timestamp), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  // Start video meeting - Coming Soon
  const handleStartMeeting = async (type = "video") => {
    const meetingType = type === "video" ? "Video Call" : "Audio Call";
    alert(
      `🚀 ${meetingType} - Coming Soon!\n\nWe're working on bringing you enterprise-grade video conferencing with:\n\n✨ HD video & crystal-clear audio\n🎥 Screen sharing & recording\n📊 Real-time collaboration tools\n🔒 Enterprise-grade security\n\nStay tuned for this exciting feature!`
    );
    setShowMeetingDialog(false);
  };

  // Handle pin/unpin channel
  const handlePinChannel = () => {
    const updatedRoom = { ...room, isPinned: !room.isPinned };
    onUpdateRoom(updatedRoom);
  };

  // Handle notifications toggle
  const handleToggleNotifications = () => {
    setNotifications(!notifications);
    // Show toast notification
    console.log(
      `Notifications ${!notifications ? "enabled" : "disabled"} for ${
        room.name
      }`
    );
  };

  // Handle channel settings
  const handleChannelSettings = () => {
    console.log("Opening channel settings for:", room.name);
    // In a real app, this would open a settings modal
  };

  // Handle archive channel
  const handleArchiveChannel = () => {
    if (
      window.confirm(
        `Are you sure you want to archive #${room.name}? This action cannot be undone.`
      )
    ) {
      console.log("Archiving channel:", room.name);
      // In a real app, this would archive the channel
    }
  };

  // Handle search functionality
  const handleSearch = () => {
    const query = prompt("Search messages in this channel:");
    if (query) {
      setSearchQuery(query);
      console.log("Searching for:", query);
      // In a real app, this would filter messages
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    console.log("Uploading file:", file.name);
    // In a real app, this would upload the file and add it to the message
    const fileMessage = {
      id: Date.now().toString(),
      content: `📎 Shared file: ${file.name}`,
      sender: user,
      timestamp: new Date().toISOString(),
      type: "file",
      reactions: [],
      mentions: [],
      attachments: [{ name: file.name, size: file.size, type: file.type }],
    };
    await onSendMessage(fileMessage);
  };

  // Handle emoji picker
  const handleEmojiPick = (emoji) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // Message component with enterprise features
  const MessageComponent = ({ message, isOwn, showAvatar }) => {
    const [showReactions, setShowReactions] = useState(false);

    return (
      <div className={`flex gap-3 mb-4 ${isOwn ? "flex-row-reverse" : ""}`}>
        {showAvatar && !isOwn && (
          <Avatar className="w-8 h-8 mt-1">
            <AvatarImage src={message.sender?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
              {message.sender?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={`flex-1 max-w-[70%] ${isOwn ? "items-end" : ""}`}>
          {showAvatar && (
            <div
              className={`flex items-center gap-2 mb-1 ${
                isOwn ? "justify-end" : ""
              }`}
            >
              <span className="text-sm font-medium text-slate-700">
                {isOwn ? "You" : message.sender?.full_name}
              </span>
              <span className="text-xs text-slate-400">
                {formatMessageTime(message.timestamp)}
              </span>
              {message.edited && (
                <span className="text-xs text-slate-400 italic">(edited)</span>
              )}
            </div>
          )}

          <div
            className={`relative group rounded-2xl px-4 py-2 ${
              isOwn
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-800"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>

            {/* Message actions */}
            <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1 bg-white rounded-full shadow-lg px-2 py-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-slate-100"
                  onClick={() => setShowReactions(!showReactions)}
                >
                  <Smile className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-slate-100"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Reactions */}
            {message.reactions?.length > 0 && (
              <div className="flex gap-1 mt-2">
                {message.reactions.map((reaction, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs px-2 py-1 cursor-pointer hover:bg-slate-200"
                  >
                    {reaction.emoji} {reaction.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const messageGroups = groupMessagesByDate(room?.messages || []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Hash className="w-5 h-5 text-white" />
            </div>
            {room?.isPrivate && (
              <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-slate-500 bg-white rounded-full p-0.5" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              {room?.name}
              {room?.isPinned && <Pin className="w-4 h-4 text-amber-500" />}
            </h2>
            <p className="text-sm text-slate-500">
              {room?.members?.length} members • {room?.messages?.length || 0}{" "}
              messages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleSearch}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search messages</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Start Meeting */}
          <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg">
                <Video className="w-4 h-4 mr-2" />
                Meet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  Start Enterprise Meeting
                </DialogTitle>
                <DialogDescription>
                  Launch a professional meeting with advanced collaboration
                  features
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <Button
                  onClick={() => handleStartMeeting("video")}
                  className="h-20 flex-col gap-2 bg-gradient-to-r from-blue-500 to-blue-600"
                >
                  <Video className="w-6 h-6" />
                  Video Call
                </Button>
                <Button
                  onClick={() => handleStartMeeting("audio")}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                >
                  <Phone className="w-6 h-6" />
                  Audio Call
                </Button>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>✨ HD video & crystal-clear audio</p>
                <p>🎥 Screen sharing & recording</p>
                <p>📊 Real-time collaboration tools</p>
                <p>🔒 Enterprise-grade security</p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Members */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setShowMembersList(!showMembersList)}
          >
            <Users className="w-4 h-4" />
          </Button>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onInviteMembers(room.id)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePinChannel}>
                <Pin className="w-4 h-4 mr-2" />
                {room?.isPinned ? "Unpin Channel" : "Pin Channel"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleNotifications}>
                {notifications ? (
                  <BellOff className="w-4 h-4 mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                {notifications
                  ? "Disable Notifications"
                  : "Enable Notifications"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleChannelSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Channel Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleArchiveChannel}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {Object.entries(messageGroups).map(([date, messages]) => (
              <div key={date} className="mb-6">
                {/* Date separator */}
                <div className="flex items-center gap-4 mb-4">
                  <Separator className="flex-1" />
                  <Badge variant="secondary" className="text-xs px-3 py-1">
                    {format(new Date(date), "MMMM dd, yyyy")}
                  </Badge>
                  <Separator className="flex-1" />
                </div>

                {/* Messages */}
                {messages.map((message, index) => {
                  const isOwn = message.sender?.email === user?.email;
                  const showAvatar =
                    index === 0 ||
                    messages[index - 1]?.sender?.email !==
                      message.sender?.email;

                  return (
                    <MessageComponent
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                    />
                  );
                })}
              </div>
            ))}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                </div>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={`Message #${room?.name}...`}
                className="pr-32 py-3 text-base rounded-xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEmojiPick("😊")}
                >
                  <Smile className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembersList && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({room?.members?.length || 0})
              </h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {room?.members?.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
                          {member.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {member.full_name}
                        {member.email === user?.email && " (You)"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {member.position}
                      </p>
                    </div>
                    {member.role === "admin" && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Active Meeting Indicator */}
      {activeMeeting && (
        <div className="absolute top-4 right-4 z-50">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <div>
                <p className="font-medium">Meeting in progress</p>
                <p className="text-xs opacity-90">
                  {activeMeeting.participants?.length} participants
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="ml-4"
                onClick={() => setActiveMeeting(null)}
              >
                Join
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
