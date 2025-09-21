import React, { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@/api/entities";
import { DirectMessage } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronsUpDown,
  Check,
  Send,
  Paperclip,
  Smile,
  X,
  MessageSquare,
  Plus,
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  Edit3,
  Trash2,
  Users,
  Hash,
  Lock,
  Globe,
  Video,
  Phone,
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
  Calendar,
  Clock,
  CheckCircle,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { groupBy, orderBy, uniqBy } from "lodash";
import TeamChatRoom from "@/components/collaboration/TeamChatRoom";
import EnterpriseMeeting from "@/components/collaboration/EnterpriseMeeting";

const EMOJI_OPTIONS = [
  "😀", "😂", "❤️", "👍", "🙏", "🎉", "🔥", "🤔", "😢", "😮",
  "💯", "✨", "🚀", "💪", "🎯", "⚡", "🌟", "👏", "🤝", "💡",
];

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏"];

const containsUrl = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,})/i;
  return urlRegex.test(text);
};

// Helper function to detect and make URLs clickable
const linkifyText = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,}[^\s]*)/gi;

  return text.split(urlRegex).map((part, index) => {
    if (urlRegex.test(part)) {
      let href = part;
      if (!part.startsWith("http://") && !part.startsWith("https://")) {
        href = "https://" + part;
      }
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Reusable Message Input Component
const MessageInput = ({ onSendMessage, onFileUpload }) => {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleTextChange = (e) => {
    setMessage(e.target.value);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    await onFileUpload(file);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  return (
    <div className="p-4 border-t bg-white">
      <div className="relative">
        <Input
          value={message}
          onChange={handleTextChange}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="pr-32"
        />
        <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="icon"
                    className="text-lg"
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Hybrid Messages Component
export default function HybridMessages() {
  const [activeTab, setActiveTab] = useState("direct"); // direct or groups
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Direct Messages State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [activeMessageActions, setActiveMessageActions] = useState(null);

  // Group Chat State
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] = useState("public");

  const scrollAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        if (!currentUser.active_organization_id) {
          setConversations([]);
          setChatRooms([]);
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

        setOrganization(orgData);

        // Load team members
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
                role: email === orgData.owner_email ? "admin" : "member",
                status: "online",
              };
              if (userList.length > 0) {
                const u = userList[0];
                userProfile.full_name = u.full_name || email.split("@")[0];
                userProfile.position = u.position || "Team Member";
                userProfile.avatar_url = u.avatar_url;
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

        // Load direct messages
        try {
          const [messagesToUser, messagesFromUser] = await Promise.all([
            DirectMessage.filter({
              organization_id: currentUser.active_organization_id,
              to_email: currentUser.email,
            }),
            DirectMessage.filter({
              organization_id: currentUser.active_organization_id,
              from_email: currentUser.email,
            }),
          ]);

          const allMessages = uniqBy(
            [...(messagesToUser || []), ...(messagesFromUser || [])],
            "id"
          );

          if (allMessages.length > 0) {
            const grouped = groupBy(allMessages, "conversation_id");
            const convos = Object.values(grouped).map((msgs) => {
              const latestMessage = orderBy(
                msgs,
                [(m) => new Date(m.created_date)],
                ["desc"]
              )[0];
              const otherUserEmail =
                latestMessage.from_email === currentUser.email
                  ? latestMessage.to_email
                  : latestMessage.from_email;
              const unreadCount = msgs.filter(
                (m) => m.to_email === currentUser.email && !m.read
              ).length;

              return {
                id: latestMessage.conversation_id,
                otherUserEmail,
                latestMessage,
                unreadCount,
                messages: orderBy(
                  msgs,
                  [(m) => new Date(m.created_date)],
                  ["asc"]
                ),
              };
            });

            const sortedConvos = orderBy(
              convos,
              [(c) => new Date(c.latestMessage.created_date)],
              ["desc"]
            );
            setConversations(sortedConvos);
          }
        } catch (messageError) {
          console.error("Error loading messages:", messageError);
          setConversations([]);
        }

        // Initialize sample chat rooms
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
                content: "Thanks for setting this up! Looking forward to collaborating.",
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
                content: "Let's schedule a meeting to discuss the project roadmap.",
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

      } catch (err) {
        console.error("Error loading messages data:", err);
        setError("Failed to load your messages. Please try again later.");
      }
      setIsLoading(false);
    };

    loadData();

    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Direct Messages Functions
  const handleConversationSelect = useCallback(
    async (conversation) => {
      if (!user) return;

      setSelectedConversation(conversation);
      setMessages(conversation.messages);

      setTimeout(() => {
        scrollToBottom();
      }, 100);

      if (conversation.unreadCount > 0) {
        const unreadMessageIds = conversation.messages
          .filter((m) => m.to_email === user.email && !m.read)
          .map((m) => m.id);

        try {
          await Promise.all(
            unreadMessageIds.map((id) =>
              DirectMessage.update(id, { read: true })
            )
          );
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversation.id ? { ...c, unreadCount: 0 } : c
            )
          );
        } catch (err) {
          console.error("Failed to mark messages as read:", err);
        }
      }
    },
    [user, scrollToBottom]
  );

  const handleSendDirectMessage = async (content, recipient = null) => {
    let targetConversation = selectedConversation;
    let recipientEmail = recipient?.email;

    if (isComposing && recipient) {
      const existingConvo = conversations.find(
        (c) => c.otherUserEmail === recipient.email
      );
      if (existingConvo) {
        targetConversation = existingConvo;
      } else {
        recipientEmail = recipient.email;
      }
    }

    const conversationId =
      targetConversation?.id || [user.email, recipientEmail].sort().join("-");
    const toEmail = targetConversation?.otherUserEmail || recipientEmail;

    if (!toEmail) {
      console.error("No recipient found for message");
      return;
    }

    const newMessage = {
      from_email: user.email,
      to_email: toEmail,
      content,
      conversation_id: conversationId,
      organization_id: user.active_organization_id,
      read: false,
    };

    try {
      const createdMessage = await DirectMessage.create(newMessage);

      setMessages((prev) => [...prev, createdMessage]);

      setConversations((prevConvos) => {
        const updatedConvos = prevConvos.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              latestMessage: createdMessage,
              messages: [...c.messages, createdMessage],
            };
          }
          return c;
        });

        if (!updatedConvos.some((c) => c.id === conversationId)) {
          const newConvo = {
            id: conversationId,
            otherUserEmail: toEmail,
            latestMessage: createdMessage,
            unreadCount: 0,
            messages: [createdMessage],
          };
          return orderBy(
            uniqBy([newConvo, ...updatedConvos], "id"),
            [(c) => new Date(c.latestMessage.created_date)],
            ["desc"]
          );
        }
        return orderBy(
          updatedConvos,
          [(c) => new Date(c.latestMessage.created_date)],
          ["desc"]
        );
      });

      if (isComposing) {
        setIsComposing(false);
        const convo = {
          id: conversationId,
          otherUserEmail: toEmail,
          latestMessage: createdMessage,
          unreadCount: 0,
          messages: [createdMessage],
          ...conversations.find((c) => c.id === conversationId),
        };
        handleConversationSelect(convo);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
    }
  };

  // Group Chat Functions
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
  };

  const handleSendGroupMessage = async (message) => {
    if (!selectedRoom) return;

    const newMessage = {
      id: Date.now().toString(),
      content: message.content || message,
      sender: user,
      timestamp: new Date().toISOString(),
      reactions: [],
      mentions: [],
    };

    const updatedRoom = {
      ...selectedRoom,
      messages: [...selectedRoom.messages, newMessage],
      lastActivity: new Date().toISOString(),
    };

    setChatRooms((prev) =>
      prev.map((room) => (room.id === selectedRoom.id ? updatedRoom : room))
    );

    setSelectedRoom(updatedRoom);
  };

  const handleStartMeeting = async (meetingData) => {
    setActiveMeeting(meetingData);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    const newRoom = {
      id: Date.now().toString(),
      name: newRoomName,
      description: newRoomDescription,
      type: newRoomType,
      members: [user],
      messages: [],
      isPinned: false,
      isPrivate: newRoomType === "private",
      createdBy: user,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    setChatRooms((prev) => [newRoom, ...prev]);
    setSelectedRoom(newRoom);

    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomType("public");
    setShowCreateRoomDialog(false);
  };

  // Direct Messages UI Components
  const DirectMessagesView = () => {
    const filteredConversations = conversations.filter((convo) => {
      const member = teamMembers.find((m) => m.email === convo.otherUserEmail);
      return (
        member?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        convo.otherUserEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    const ConversationList = () => (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-slate-900">Direct Messages</h2>
          <p className="text-sm text-slate-500">Private conversations with team members</p>
          <Button
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600"
            onClick={() => {
              setIsComposing(true);
              setSelectedConversation(null);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((convo) => {
              const member = teamMembers.find(
                (m) => m.email === convo.otherUserEmail
              );
              return (
                <div
                  key={convo.id}
                  onClick={() => handleConversationSelect(convo)}
                  className={`flex items-center gap-3 p-4 cursor-pointer border-l-4 transition-all duration-200 hover:bg-slate-50 ${
                    selectedConversation?.id === convo.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-transparent"
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={member?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                      {member?.full_name?.charAt(0) ||
                        convo.otherUserEmail.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className="font-semibold truncate">
                        {member?.full_name || convo.otherUserEmail}
                      </p>
                      <p className="text-xs text-slate-400 flex-shrink-0">
                        {convo.latestMessage?.created_date
                          ? formatDistanceToNow(
                              new Date(convo.latestMessage.created_date),
                              { addSuffix: true }
                            )
                          : ""}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-500 truncate">
                        {convo.latestMessage?.content}
                      </p>
                      {convo.unreadCount > 0 && (
                        <Badge className="w-5 h-5 p-0 flex items-center justify-center rounded-full bg-red-500 text-white shrink-0">
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-8">
              <MessageSquare className="mx-auto w-12 h-12 text-slate-300 mb-4" />
              <h3 className="font-semibold text-slate-800">No Conversations Yet</h3>
              <p className="text-sm text-slate-500">Start messaging your team members</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setIsComposing(true);
                  setSelectedConversation(null);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Conversation
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>
    );

    const MessageView = () => {
      if (!selectedConversation) return null;

      const otherUser = teamMembers.find(
        (m) => m.email === selectedConversation.otherUserEmail
      );
      const currentUserEmail = user?.email;

      return (
        <div className="flex flex-col h-full bg-slate-50">
          <header className="flex items-center gap-3 p-4 border-b bg-white">
            {isMobileView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft />
              </Button>
            )}
            <Avatar>
              <AvatarImage src={otherUser?.avatar_url} />
              <AvatarFallback>
                {otherUser?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-bold text-slate-900">{otherUser?.full_name}</h2>
              <p className="text-sm text-slate-500">
                {otherUser?.position || otherUser?.email}
              </p>
            </div>
          </header>
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.map((msg, index) => {
              const isOwnMessage = msg.from_email === currentUserEmail;
              const hasUrl = containsUrl(msg.content);

              const messageBgClass = isOwnMessage
                ? hasUrl
                  ? "bg-white text-slate-800 rounded-br-none shadow-sm"
                  : "bg-blue-500 text-white rounded-br-none"
                : "bg-white rounded-bl-none shadow-sm";
              const messageTimeClass =
                isOwnMessage && !hasUrl ? "text-blue-200" : "text-slate-400";

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 my-4 ${
                    isOwnMessage ? "justify-end" : ""
                  }`}
                >
                  {!isOwnMessage && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={otherUser?.avatar_url} />
                      <AvatarFallback>
                        {otherUser?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="relative">
                    <div
                      className={`max-w-xs md:max-w-md p-3 rounded-2xl ${messageBgClass}`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {linkifyText(msg.content)}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${messageTimeClass}`}>
                          {format(new Date(msg.created_date), "p")}
                        </p>
                        {msg.edited_at && (
                          <span className={`text-xs italic ${messageTimeClass}`}>
                            (edited)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOwnMessage && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback>
                        {user?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </ScrollArea>
          <MessageInput
            onSendMessage={(content) => handleSendDirectMessage(content)}
            onFileUpload={() => {}}
          />
        </div>
      );
    };

    const ComposeView = () => {
      const [recipient, setRecipient] = useState(null);
      const [popoverOpen, setPopoverOpen] = useState(false);

      const availableRecipients = teamMembers.filter(
        (member) => user?.email !== member.email
      );

      return (
        <div className="flex flex-col h-full bg-slate-50">
          <header className="flex items-center gap-3 p-4 border-b bg-white">
            {(isMobileView || conversations.length > 0) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsComposing(false)}
              >
                <ArrowLeft />
