import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { User } from "@/api/entities";
import { DirectMessage } from "@/api/entities";
import { Organization } from "@/api/entities";
import { CollaborationRoom } from "@/api/entities";
import { GroupMessage } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  Crown,
  Shield,
  Star,
  Pin,
  Bell,
  BellOff,
  Archive,
  MoreVertical,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format, formatDistanceToNow } from "date-fns";
import { groupBy, orderBy, uniqBy } from "lodash";
import { useNavigate } from "react-router-dom";

const EMOJI_OPTIONS = [
  "😀",
  "😂",
  "❤️",
  "👍",
  "🙏",
  "🎉",
  "🔥",
  "🤔",
  "😢",
  "😮",
  "💯",
  "✨",
  "🚀",
  "💪",
  "🎯",
  "⚡",
  "🌟",
  "👏",
  "🤝",
  "💡",
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

// Helper function to detect mentions in text
const detectMentions = (text, teamMembers) => {
  const mentions = [];

  // Find all potential @mentions in the text
  teamMembers.forEach((member) => {
    const memberName = member.full_name || member.email;

    // Create regex patterns for both full name and email
    const patterns = [
      `@${memberName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}(?=\\s|$|[.,!?;:]|$)`,
      `@${member.email.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}(?=\\s|$|[.,!?;:]|$)`,
    ];

    patterns.forEach((pattern) => {
      const regex = new RegExp(pattern, "gi");
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Check if this mention overlaps with existing ones
        const overlaps = mentions.some(
          (existing) =>
            (match.index >= existing.start && match.index < existing.end) ||
            (match.index + match[0].length > existing.start &&
              match.index + match[0].length <= existing.end)
        );

        if (!overlaps) {
          mentions.push({
            text: match[0],
            email: member.email,
            name: member.full_name || member.email,
            start: match.index,
            end: match.index + match[0].length,
          });
        }
      }
    });
  });

  // Sort mentions by start position
  return mentions.sort((a, b) => a.start - b.start);
};

// Helper function to highlight mentions in text
const highlightMentions = (text, teamMembers, onMentionClick) => {
  // Handle case where text might be an array from linkifyText
  const textString = Array.isArray(text) ? text.join("") : String(text);

  const mentions = detectMentions(textString, teamMembers);
  if (mentions.length === 0) return textString;

  let result = [];
  let lastIndex = 0;

  mentions.forEach((mention, index) => {
    // Add text before mention
    if (mention.start > lastIndex) {
      const beforeText = textString.slice(lastIndex, mention.start);
      result.push(beforeText);
    }

    // Add clickable mention with smooth styling
    result.push(
      <button
        key={`mention-${index}-${mention.email}`}
        type="button"
        className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors inline-block"
        title={`Click to chat with ${mention.name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onMentionClick) {
            const member = teamMembers.find((m) => m.email === mention.email);
            if (member) {
              onMentionClick(member);
            }
          }
        }}
      >
        {mention.text}
      </button>
    );

    lastIndex = mention.end;
  });

  // Add remaining text
  if (lastIndex < textString.length) {
    const remainingText = textString.slice(lastIndex);
    result.push(remainingText);
  }

  return result;
};

// Combined function to process message content with both URLs and mentions
const processMessageContent = (content, teamMembers, onMentionClick) => {
  // First, detect all mentions in the original text
  const mentions = detectMentions(content, teamMembers);

  // If no mentions, just handle URLs
  if (mentions.length === 0) {
    if (containsUrl(content)) {
      return linkifyText(content);
    }
    return content;
  }

  // Process text with both URLs and mentions
  let result = [];
  let lastIndex = 0;

  // Sort mentions by position
  const sortedMentions = mentions.sort((a, b) => a.start - b.start);

  sortedMentions.forEach((mention, index) => {
    // Add text before mention (with URL processing)
    if (mention.start > lastIndex) {
      const beforeText = content.slice(lastIndex, mention.start);
      if (containsUrl(beforeText)) {
        result.push(...linkifyText(beforeText));
      } else {
        result.push(beforeText);
      }
    }

    // Add clickable mention with smooth styling
    result.push(
      <button
        key={`mention-${index}-${mention.email}`}
        type="button"
        className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors inline-block"
        title={`Click to chat with ${mention.name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onMentionClick) {
            const member = teamMembers.find((m) => m.email === mention.email);
            if (member) {
              onMentionClick(member);
            }
          }
        }}
      >
        {mention.text}
      </button>
    );

    lastIndex = mention.end;
  });

  // Add remaining text after last mention (with URL processing)
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    if (containsUrl(remainingText)) {
      result.push(...linkifyText(remainingText));
    } else {
      result.push(remainingText);
    }
  }

  return result;
};

// Reusable Message Input Component
const MessageInput = ({
  onSendMessage,
  onFileUpload,
  teamMembers = [],
  user = null,
}) => {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const handleSend = () => {
    if (message.trim()) {
      const mentions = detectMentions(message, teamMembers);
      onSendMessage(message, null, mentions);
      setMessage("");
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ mentions - improved regex to handle spaces and special characters
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s\.]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase().trim();
      setMentionQuery(query);

      const suggestions = teamMembers
        .filter(
          (member) =>
            member.email.toLowerCase().includes(query) ||
            member.full_name?.toLowerCase().includes(query) ||
            (query === "" && member.email !== user?.email) // Show all members when just typing @
        )
        .slice(0, 5);

      setMentionSuggestions(suggestions);
      setShowMentionSuggestions(suggestions.length > 0);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleMentionSelect = (member) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);

    // Replace the @query with @member.full_name (or email if no name)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const memberName = member.full_name || member.email;
      const newMessage = `${beforeMention}@${memberName} ${textAfterCursor}`;
      setMessage(newMessage);
      setShowMentionSuggestions(false);

      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = beforeMention.length + memberName.length + 2;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
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
    setShowEmojiPicker(false); // Close the emoji picker after selection
  };

  return (
    <div className="p-4 border-t bg-white">
      <div className="relative">
        <Input
          ref={inputRef}
          value={message}
          onChange={handleTextChange}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message... (@mention to tag someone)"
          className="pr-32"
        />

        {/* Mention Suggestions Dropdown */}
        {showMentionSuggestions && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
            {mentionSuggestions.map((member) => (
              <div
                key={member.email}
                className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer"
                onClick={() => handleMentionSelect(member)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    {member.full_name?.charAt(0) || member.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">
                    {member.full_name || member.email}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    @{member.email} • {member.position}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center gap-1">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
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

// Main Component
export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [activeMessageActions, setActiveMessageActions] = useState(null);

  // Collaboration state
  const [collaborationRooms, setCollaborationRooms] = useState([]);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] = useState("public");
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Group management state
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const [showGroupMembersDialog, setShowGroupMembersDialog] = useState(false);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState([]);
  const [hoveredMember, setHoveredMember] = useState(null);
  const [tappedMember, setTappedMember] = useState(null);

  const scrollAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const sidebarRef = useRef(null);
  const resizeHandleRef = useRef(null);

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

  // Hide actions on scroll or outside click
  useEffect(() => {
    const handleInteraction = () => {
      setActiveMessageActions(null);
    };
    document.addEventListener("click", handleInteraction, true);
    window.addEventListener("scroll", handleInteraction);
    return () => {
      document.removeEventListener("click", handleInteraction, true);
      window.removeEventListener("scroll", handleInteraction);
    };
  }, []);

  // Resize functionality for sidebar
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      e.preventDefault();

      // Get the sidebar container position
      const sidebarRect = sidebarRef.current?.getBoundingClientRect();
      if (!sidebarRect) return;

      // Calculate new width based on mouse position relative to sidebar start
      const newWidth = Math.max(
        280,
        Math.min(600, e.clientX - sidebarRect.left)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
    };

    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.body.style.pointerEvents = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  // Handle adding members to existing group
  const handleAddMembersToGroup = async () => {
    if (
      !selectedConversation?.isCollaborationRoom ||
      selectedMembersToAdd.length === 0
    )
      return;

    try {
      const updatedMemberEmails = [
        ...selectedConversation.member_emails,
        ...selectedMembersToAdd.map((m) => m.email),
      ];

      const updatedMembers = [
        ...selectedConversation.members,
        ...selectedMembersToAdd,
      ];

      // Update room in database
      await CollaborationRoom.update(selectedConversation.id, {
        member_emails: updatedMemberEmails,
        members: updatedMembers,
        updated_at: new Date().toISOString(),
      });

      // Update local state
      const updatedRoom = {
        ...selectedConversation,
        member_emails: updatedMemberEmails,
        members: updatedMembers,
      };

      setCollaborationRooms((prev) =>
        prev.map((room) =>
          room.id === selectedConversation.id ? updatedRoom : room
        )
      );

      setSelectedConversation(updatedRoom);
      setSelectedMembersToAdd([]);
      setShowAddMembersDialog(false);
    } catch (error) {
      console.error("Error adding members to group:", error);
      setError("Failed to add members to group. Please try again.");
    }
  };

  // Handle starting direct chat with group member
  const handleStartDirectChat = async (member) => {
    if (member.email === user.email) return;

    console.log("Starting direct chat with:", member);

    // Check if conversation already exists
    const existingConvo = conversations.find(
      (c) => c.otherUserEmail === member.email
    );

    if (existingConvo) {
      console.log("Found existing conversation:", existingConvo);
      handleConversationSelect(existingConvo);
    } else {
      console.log("Creating new conversation with:", member.email);
      // Create a placeholder conversation and select it
      const placeholderConvo = {
        id: [user.email, member.email].sort().join("-"),
        otherUserEmail: member.email,
        latestMessage: null,
        unreadCount: 0,
        messages: [],
      };

      // Add to conversations list
      setConversations((prev) => [placeholderConvo, ...prev]);

      // Select the conversation
      handleConversationSelect(placeholderConvo);

      // If we're in mobile view, make sure we show the chat
      if (isMobileView) {
        setSelectedConversation(placeholderConvo);
      }
    }

    // Close any open dialogs
    setShowGroupMembersDialog(false);
  };

  // Handle removing member from group
  const handleRemoveMemberFromGroup = async (memberToRemove) => {
    if (
      !selectedConversation?.isCollaborationRoom ||
      memberToRemove.email === user.email
    )
      return;

    try {
      const updatedMemberEmails = selectedConversation.member_emails.filter(
        (email) => email !== memberToRemove.email
      );

      const updatedMembers = selectedConversation.members.filter(
        (member) => member.email !== memberToRemove.email
      );

      // Update room in database
      await CollaborationRoom.update(selectedConversation.id, {
        member_emails: updatedMemberEmails,
        members: updatedMembers,
        updated_at: new Date().toISOString(),
      });

      // Update local state
      const updatedRoom = {
        ...selectedConversation,
        member_emails: updatedMemberEmails,
        members: updatedMembers,
      };

      setCollaborationRooms((prev) =>
        prev.map((room) =>
          room.id === selectedConversation.id ? updatedRoom : room
        )
      );

      setSelectedConversation(updatedRoom);
    } catch (error) {
      console.error("Error removing member from group:", error);
      setError("Failed to remove member from group. Please try again.");
    }
  };

  // Real-time message polling with error handling (only for direct messages)
  const pollForNewMessages = useCallback(async () => {
    if (
      !user ||
      !selectedConversation ||
      selectedConversation.isCollaborationRoom
    )
      return;

    try {
      const [messagesToUser, messagesFromUser] = await Promise.allSettled([
        DirectMessage.filter(
          {
            conversation_id: selectedConversation.id,
            to_email: user.email,
          },
          "-created_date",
          50
        ),
        DirectMessage.filter(
          {
            conversation_id: selectedConversation.id,
            from_email: user.email,
          },
          "-created_date",
          50
        ),
      ]);

      const safeToUser =
        messagesToUser.status === "fulfilled" ? messagesToUser.value : [];
      const safeFromUser =
        messagesFromUser.status === "fulfilled" ? messagesFromUser.value : [];

      const allMessages = uniqBy([...safeToUser, ...safeFromUser], "id");
      const sortedMessages = orderBy(
        allMessages,
        [(m) => new Date(m.created_date)],
        ["asc"]
      );

      setMessages((prevMessages) => {
        if (
          sortedMessages.length !== prevMessages.length ||
          sortedMessages.some((m, i) => m.id !== prevMessages[i]?.id)
        ) {
          const newUnreadMessages = sortedMessages.filter(
            (m) =>
              m.to_email === user.email &&
              !m.read &&
              !prevMessages.some((existing) => existing.id === m.id)
          );

          if (newUnreadMessages.length > 0) {
            Promise.all(
              newUnreadMessages.map((m) =>
                DirectMessage.update(m.id, { read: true })
              )
            ).catch((err) =>
              console.error("Failed to mark messages as read in poll:", err)
            );
          }
          return sortedMessages;
        }
        return prevMessages;
      });
    } catch (error) {
      console.error("Error polling for new messages:", error);
    }
  }, [user, selectedConversation]);

  // Start/stop polling based on selected conversation (only for direct messages)
  useEffect(() => {
    if (
      selectedConversation &&
      user &&
      !selectedConversation.isCollaborationRoom
    ) {
      pollIntervalRef.current = setInterval(pollForNewMessages, 5000);
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    } else {
      // Clear polling for collaboration rooms
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [selectedConversation, user, pollForNewMessages]);

  // Memoized handler for conversation selection
  const handleConversationSelect = useCallback(
    async (conversation) => {
      if (!user) return;

      setSelectedConversation(conversation);

      // Handle collaboration room messages
      if (conversation.isCollaborationRoom) {
        setMessages(conversation.messages || []);
      } else {
        setMessages(conversation.messages);
      }

      setTimeout(() => {
        scrollToBottom();
      }, 100);

      if (conversation.unreadCount > 0 && !conversation.isCollaborationRoom) {
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

  // Effect for initial data loading, runs once on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        if (!currentUser.active_organization_id) {
          setConversations([]);
          setCollaborationRooms([]);
          setIsLoading(false);
          return;
        }

        const orgData = await Organization.filter({
          id: currentUser.active_organization_id,
        }).then((orgs) => orgs[0]);
        if (!orgData) {
          // If organization data is missing, try to recover gracefully
          console.warn(
            "Organization data not found, initializing with minimal data"
          );
          setTeamMembers([]);
          setConversations([]);
          setCollaborationRooms([]);
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

        // Load collaboration rooms for the current user
        try {
          const userRooms = await CollaborationRoom.filter({
            organization_id: currentUser.active_organization_id,
            member_emails: currentUser.email,
          });

          // Load messages for each room
          const roomsWithMessages = await Promise.all(
            userRooms.map(async (room) => {
              const roomMessages = await GroupMessage.getByRoomId(room.id);
              return {
                ...room,
                messages: roomMessages.map((msg) => ({
                  id: msg.id,
                  content: msg.content,
                  sender: {
                    email: msg.sender_email,
                    full_name:
                      msg.sender_name || msg.sender_email.split("@")[0],
                  },
                  timestamp: msg.created_at,
                  reactions: msg.reactions || [],
                  mentions: msg.mentions || [],
                })),
                lastActivity: room.updated_at,
                latestMessage:
                  roomMessages.length > 0
                    ? {
                        content: roomMessages[roomMessages.length - 1].content,
                        created_date:
                          roomMessages[roomMessages.length - 1].created_at,
                      }
                    : null,
              };
            })
          );

          setCollaborationRooms(roomsWithMessages);
        } catch (roomError) {
          console.error("Error loading collaboration rooms:", roomError);
          setCollaborationRooms([]);
        }

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

          if (allMessages.length === 0) {
            setConversations([]);
            setIsLoading(false);
            return;
          }

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
        } catch (messageError) {
          console.error("Error loading messages:", messageError);
          setError(
            "Unable to load messages at this time. Please try again later."
          );
          setConversations([]);
        }
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

  // Effect for handling URL parameters and selecting conversations after data is loaded
  useEffect(() => {
    if (user && conversations.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const conversationId = urlParams.get("conversation_id");
      if (conversationId) {
        const conversationToOpen = conversations.find(
          (c) => c.id === conversationId
        );
        if (conversationToOpen) {
          handleConversationSelect(conversationToOpen);
        }
      }
    }
  }, [conversations, user, handleConversationSelect]);

  // Debounce search query to prevent excessive re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Scroll whenever messages change or a new conversation is selected
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [selectedConversation, messages.length, scrollToBottom]);

  const handleSendMessage = async (content, recipient = null) => {
    // Handle collaboration room messages
    if (selectedConversation?.isCollaborationRoom) {
      try {
        // Create message in database
        const createdMessage = await GroupMessage.create({
          room_id: selectedConversation.id,
          content,
          sender_email: user.email,
          sender_name: user.full_name || user.email.split("@")[0],
          organization_id: user.active_organization_id,
        });

        // Format message for display
        const newMessage = {
          id: createdMessage.id,
          content: createdMessage.content,
          sender: {
            email: user.email,
            full_name: user.full_name || user.email.split("@")[0],
          },
          timestamp: createdMessage.created_at,
          reactions: [],
          mentions: [],
        };

        // Update the collaboration room
        const updatedRoom = {
          ...selectedConversation,
          messages: [...selectedConversation.messages, newMessage],
          lastActivity: new Date().toISOString(),
          latestMessage: {
            content,
            created_date: createdMessage.created_at,
          },
        };

        // Update collaboration rooms state
        setCollaborationRooms((prev) =>
          prev.map((room) =>
            room.id === selectedConversation.id ? updatedRoom : room
          )
        );

        // Update messages
        setMessages((prev) => [...prev, newMessage]);

        // Update selected conversation
        setSelectedConversation(updatedRoom);

        // Update room's last activity in database
        await CollaborationRoom.update(selectedConversation.id, {
          updated_at: new Date().toISOString(),
        });

        return;
      } catch (error) {
        console.error("Error sending group message:", error);
        setError("Failed to send message. Please try again.");
        return;
      }
    }

    // Handle direct messages (existing logic)
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

  const handleEditMessage = async (messageId) => {
    if (!editText.trim()) return;
    try {
      if (selectedConversation?.isCollaborationRoom) {
        // Handle group message editing
        await GroupMessage.update(messageId, {
          content: editText.trim(),
          edited_at: new Date().toISOString(),
        });

        // Update local state for collaboration room
        const updatedMessages = messages.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: editText.trim(),
                edited_at: new Date().toISOString(),
              }
            : msg
        );
        setMessages(updatedMessages);

        // Update collaboration room state
        const updatedRoom = {
          ...selectedConversation,
          messages: updatedMessages,
        };
        setCollaborationRooms((prev) =>
          prev.map((room) =>
            room.id === selectedConversation.id ? updatedRoom : room
          )
        );
        setSelectedConversation(updatedRoom);
      } else {
        // Handle direct message editing
        await DirectMessage.update(messageId, {
          content: editText.trim(),
          edited_at: new Date().toISOString(),
        });

        // Update local messages state immediately for direct messages too
        const updatedMessages = messages.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: editText.trim(),
                edited_at: new Date().toISOString(),
              }
            : msg
        );
        setMessages(updatedMessages);

        // Update conversations state
        setConversations((prevConvos) =>
          prevConvos.map((convo) => {
            if (convo.id === selectedConversation.id) {
              const updatedConvoMessages = convo.messages.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      content: editText.trim(),
                      edited_at: new Date().toISOString(),
                    }
                  : msg
              );
              return {
                ...convo,
                messages: updatedConvoMessages,
              };
            }
            return convo;
          })
        );
      }

      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Error editing message:", error);
      setError("Failed to edit message. Please try again.");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      if (selectedConversation?.isCollaborationRoom) {
        // Handle group message deletion
        await GroupMessage.delete(messageId);

        // Update local state for collaboration room
        const updatedMessages = messages.filter((m) => m.id !== messageId);
        setMessages(updatedMessages);

        // Update collaboration room state
        const updatedRoom = {
          ...selectedConversation,
          messages: updatedMessages,
        };
        setCollaborationRooms((prev) =>
          prev.map((room) =>
            room.id === selectedConversation.id ? updatedRoom : room
          )
        );
        setSelectedConversation(updatedRoom);
      } else {
        // Handle direct message deletion
        await DirectMessage.delete(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        setConversations((prevConvos) => {
          return prevConvos
            .map((convo) => {
              const updatedMessages = convo.messages.filter(
                (m) => m.id !== messageId
              );
              let newLatestMessage = convo.latestMessage;
              if (convo.latestMessage.id === messageId) {
                newLatestMessage =
                  orderBy(
                    updatedMessages,
                    [(m) => new Date(m.created_date)],
                    ["desc"]
                  )[0] || null;
              }
              return {
                ...convo,
                latestMessage: newLatestMessage,
                messages: updatedMessages,
              };
            })
            .filter((convo) => convo.messages.length > 0);
        });
      }

      setActiveMessageActions(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      setError("Failed to delete message. Please try again.");
    }
  };

  const startEditMessage = (message) => {
    setEditingMessage(message.id);
    setEditText(message.content);
    setActiveMessageActions(null);
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditText("");
    setActiveMessageActions(null);
  };

  const handleMessageTap = (e, messageId, canEdit) => {
    e.stopPropagation();
    if (canEdit) {
      setActiveMessageActions((prev) =>
        prev === messageId ? null : messageId
      );
    }
  };

  // Optimized input handlers to prevent excessive re-renders
  const handleRoomNameChange = useCallback((e) => {
    setNewRoomName(e.target.value);
  }, []);

  const handleRoomDescriptionChange = useCallback((e) => {
    setNewRoomDescription(e.target.value);
  }, []);

  const handleRoomTypeChange = useCallback((type) => {
    setNewRoomType(type);
  }, []);

  // Memoized member selection handler to prevent excessive re-renders
  const handleMemberSelection = useCallback((member, checked) => {
    if (checked) {
      setSelectedMembers((prev) => [...prev, member]);
    } else {
      setSelectedMembers((prev) =>
        prev.filter((m) => m.email !== member.email)
      );
    }
  }, []);

  // Memoized team members list for the form to prevent re-renders
  const availableTeamMembers = useMemo(
    () => teamMembers.filter((member) => member.email !== user?.email),
    [teamMembers, user?.email]
  );
  // Memoize allConversations to prevent re-renders
  const allConversations = useMemo(
    () => [
      ...conversations,
      ...collaborationRooms.map((room) => ({
        ...room,
        isCollaborationRoom: true,
        otherUserEmail: null, // No single other user for rooms
        unreadCount: 0, // For now, no unread count for rooms
      })),
    ],
    [conversations, collaborationRooms]
  );

  // Memoized filtered conversations to prevent re-renders
  const filteredConversations = useMemo(() => {
    return allConversations.filter((convo) => {
      if (convo.isCollaborationRoom) {
        return (
          convo.name
            ?.toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          convo.description
            ?.toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase())
        );
      } else {
        const member = teamMembers.find(
          (m) => m.email === convo.otherUserEmail
        );
        return (
          member?.full_name
            ?.toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          convo.otherUserEmail
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase())
        );
      }
    });
  }, [allConversations, debouncedSearchQuery, teamMembers]);

  // Memoized form reset handler
  const resetRoomForm = useCallback(() => {
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomType("public");
    setSelectedMembers([]);
    setShowCreateRoomDialog(false);
  }, []);

  const ConversationList = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold text-slate-900">Team Chat</h1>
        <p className="text-sm text-slate-500">
          Quick communication with your team
        </p>
        <div className="space-y-2 mt-4">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
            onClick={() => {
              setIsComposing(true);
              setSelectedConversation(null);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            onClick={() => navigate("/create-collaboration-room")}
          >
            <Users className="w-4 h-4 mr-2" />
            Collaborate
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Conversations
              </h3>
              <Badge variant="secondary" className="text-xs">
                {filteredConversations.length}
              </Badge>
            </div>

            {/* Search Input - Using same approach as AllTickets */}
            <div className="w-full">
              <label
                htmlFor="conversation-search"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Search Conversations
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="conversation-search"
                  name="conversation-search"
                  type="text"
                  placeholder="Search conversations, people, or rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg leading-5 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                  autoComplete="off"
                  style={{ color: "#111827" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-sm text-slate-600">
                  Searching for:{" "}
                  <span className="font-medium text-slate-900">
                    "{searchQuery}"
                  </span>
                </div>
              )}
            </div>

            {/* Search Stats */}
            {searchQuery && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {filteredConversations.length} result
                  {filteredConversations.length !== 1 ? "s" : ""} found
                </span>
                <span className="text-slate-400">for "{searchQuery}"</span>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 pb-4">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {searchQuery
                    ? "No conversations found"
                    : "No conversations yet"}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : "Start a new conversation to get started"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((convo) => {
                  if (convo.isCollaborationRoom) {
                    // Render collaboration room
                    return (
                      <div
                        key={convo.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === convo.id
                            ? "bg-emerald-50 border-emerald-200 border"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => handleConversationSelect(convo)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                              <Hash className="w-5 h-5 text-white" />
                            </div>
                            {convo.isPrivate && (
                              <Lock className="w-3 h-3 text-slate-600 absolute -top-1 -right-1 bg-white rounded-full p-0.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-slate-900 truncate">
                                {convo.name}
                              </h3>
                              <span className="text-xs text-slate-500">
                                {formatDistanceToNow(
                                  new Date(convo.lastActivity),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {convo.description ||
                                convo.latestMessage?.content ||
                                "No messages yet"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex -space-x-1">
                                {convo.members
                                  ?.slice(0, 3)
                                  .map((member, idx) => (
                                    <Avatar
                                      key={idx}
                                      className="w-4 h-4 border border-white"
                                    >
                                      <AvatarImage src={member.avatar_url} />
                                      <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                        {member.full_name?.charAt(0) ||
                                          member.email?.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                {convo.members?.length > 3 && (
                                  <div className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-xs text-slate-600">
                                    +{convo.members.length - 3}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-slate-400">
                                {convo.members?.length} member
                                {convo.members?.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Render direct message conversation
                    const member = teamMembers.find(
                      (m) => m.email === convo.otherUserEmail
                    );
                    return (
                      <div
                        key={convo.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === convo.id
                            ? "bg-blue-50 border-blue-200 border"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => handleConversationSelect(convo)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={member?.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                {member?.full_name?.charAt(0) ||
                                  convo.otherUserEmail.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {convo.unreadCount > 0 && (
                              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0">
                                {convo.unreadCount > 99
                                  ? "99+"
                                  : convo.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-slate-900 truncate">
                                {member?.full_name || convo.otherUserEmail}
                              </h3>
                              <span className="text-xs text-slate-500">
                                {formatDistanceToNow(
                                  new Date(convo.latestMessage.created_date),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {convo.latestMessage.content}
                            </p>
                            {member?.position && (
                              <p className="text-xs text-slate-400 truncate">
                                {member.position}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const ComposeMessage = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b flex items-center gap-3">
        {isMobileView && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsComposing(false)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-slate-900">New Message</h2>
          <p className="text-sm text-slate-500">
            Send a message to a team member
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                Select recipient...
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search team members..." />
                <CommandList>
                  <CommandEmpty>No team member found.</CommandEmpty>
                  <CommandGroup>
                    {teamMembers
                      .filter((member) => member.email !== user?.email)
                      .map((member) => (
                        <CommandItem
                          key={member.email}
                          value={member.email}
                          onSelect={() => {
                            handleSendMessage("", member);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                              {member.full_name?.charAt(0) ||
                                member.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.full_name || member.email}
                            </div>
                            <div className="text-sm text-slate-500">
                              {member.position}
                            </div>
                          </div>
                          <Check className="ml-auto h-4 w-4 opacity-0" />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Select a recipient
            </h3>
            <p className="text-slate-500">
              Choose a team member to start a conversation
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const ChatView = () => {
    const member = selectedConversation?.isCollaborationRoom
      ? null
      : teamMembers.find(
          (m) => m.email === selectedConversation?.otherUserEmail
        );

    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b flex items-center gap-3">
          {isMobileView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {selectedConversation?.isCollaborationRoom ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <Hash className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedConversation.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedConversation.description ||
                      `${selectedConversation.members?.length} members`}
                  </p>
                </div>
              </div>

              {/* Group Management Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGroupMembersDialog(true)}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <Users className="w-4 h-4 mr-1" />
                  {selectedConversation.members?.length}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMembersDialog(true)}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={member?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  {member?.full_name?.charAt(0) ||
                    selectedConversation?.otherUserEmail?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {member?.full_name || selectedConversation?.otherUserEmail}
                </h2>
                <p className="text-sm text-slate-500">{member?.position}</p>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = selectedConversation?.isCollaborationRoom
                ? message.sender?.email === user?.email
                : message.from_email === user?.email;
              const canEdit = isOwnMessage;
              const messageTime = selectedConversation?.isCollaborationRoom
                ? message.timestamp
                : message.created_date;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isOwnMessage
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-slate-900"
                        : "bg-white border border-slate-200 text-slate-900 shadow-sm"
                    } rounded-lg px-4 py-2 relative group select-text`}
                    onMouseDown={(e) => {
                      // Allow text selection by preventing click handler during selection
                      const selection = window.getSelection();
                      if (selection && selection.toString().length > 0) {
                        e.stopPropagation();
                      }
                    }}
                    onClick={(e) => {
                      // Only handle click if no text is selected
                      const selection = window.getSelection();
                      if (!selection || selection.toString().length === 0) {
                        handleMessageTap(e, message.id, canEdit);
                      }
                    }}
                  >
                    {selectedConversation?.isCollaborationRoom &&
                      !isOwnMessage && (
                        <div className="text-xs opacity-75 mb-1">
                          {message.sender?.full_name ||
                            message.sender?.email ||
                            "Unknown"}
                        </div>
                      )}

                    {editingMessage === message.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleEditMessage(message.id);
                            } else if (e.key === "Escape") {
                              cancelEditMessage();
                            }
                          }}
                          className="bg-white text-slate-900"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditMessage(message.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditMessage}
                            className="bg-white text-slate-900"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="break-words">
                          {processMessageContent(
                            message.content,
                            teamMembers,
                            handleStartDirectChat
                          )}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            isOwnMessage ? "text-slate-500" : "text-slate-500"
                          }`}
                        >
                          {format(new Date(messageTime), "HH:mm")}
                          {message.edited_at && (
                            <span className="ml-1">(edited)</span>
                          )}
                        </div>
                      </>
                    )}

                    {canEdit && editingMessage !== message.id && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1 bg-white border rounded-lg shadow-lg p-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditMessage(message);
                            }}
                            className="h-6 w-6 p-0 hover:bg-blue-50"
                            title="Edit message"
                          >
                            <Edit3 className="w-3 h-3 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this message?")) {
                                handleDeleteMessage(message.id);
                              }
                            }}
                            className="h-6 w-6 p-0 hover:bg-red-50"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <MessageInput
          onSendMessage={handleSendMessage}
          onFileUpload={async (file) => {
            try {
              // Create a file message with file info
              const fileMessage = `📎 File: ${file.name} (${(
                file.size / 1024
              ).toFixed(1)}KB)`;

              // For now, we'll send the file info as a message
              // In a real app, you'd upload to a file server first
              await handleSendMessage(fileMessage);

              console.log("File uploaded:", file.name, file.size);
            } catch (error) {
              console.error("File upload failed:", error);
              setError("Failed to upload file. Please try again.");
            }
          }}
          teamMembers={teamMembers}
          user={user}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50">
      {/* Resizable Sidebar */}
      <div
        ref={sidebarRef}
        className={`${
          isMobileView
            ? selectedConversation || isComposing
              ? "hidden"
              : "w-full"
            : "flex-shrink-0"
        } border-r bg-white relative`}
        style={{
          width: isMobileView ? "100%" : `${sidebarWidth}px`,
          minWidth: isMobileView ? "100%" : "280px",
          maxWidth: isMobileView ? "100%" : "600px",
        }}
      >
        <ConversationList />

        {/* Resize Handle */}
        {!isMobileView && (
          <div
            ref={resizeHandleRef}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-200 transition-colors group"
            onMouseDown={handleResizeStart}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 ${
          isMobileView && !selectedConversation && !isComposing ? "hidden" : ""
        }`}
      >
        {isComposing ? (
          <ComposeMessage />
        ) : selectedConversation ? (
          <ChatView />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-slate-500">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Group Members Dialog */}
      <Dialog
        open={showGroupMembersDialog}
        onOpenChange={setShowGroupMembersDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Group Members
            </DialogTitle>
            <DialogDescription>
              {selectedConversation?.name} •{" "}
              {selectedConversation?.members?.length} members
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {selectedConversation?.members?.map((member) => (
                <div
                  key={member.email}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleStartDirectChat(member)}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {member.full_name?.charAt(0) || member.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Remove Button - Small overlay on avatar */}
                    {((member.email !== user?.email &&
                      member.email !== selectedConversation?.created_by) ||
                      (member.email === user?.email &&
                        user?.email !== selectedConversation?.created_by)) && (
                      <button
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isLeavingGroup = member.email === user?.email;
                          const confirmMessage = isLeavingGroup
                            ? "Are you sure you want to leave this group?"
                            : `Remove ${
                                member.full_name || member.email
                              } from this group?`;

                          if (window.confirm(confirmMessage)) {
                            handleRemoveMemberFromGroup(member);
                          }
                        }}
                        title={
                          member.email === user?.email
                            ? "Leave group"
                            : "Remove from group"
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {member.full_name || member.email}
                      {member.email === user?.email && (
                        <span className="text-xs text-slate-500 ml-2">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 truncate">
                      {member.position || "Team Member"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">Click to chat</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog
        open={showAddMembersDialog}
        onOpenChange={setShowAddMembersDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              Add Members
            </DialogTitle>
            <DialogDescription>
              Add new members to {selectedConversation?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {teamMembers
                  .filter(
                    (member) =>
                      !selectedConversation?.member_emails?.includes(
                        member.email
                      )
                  )
                  .map((member) => (
                    <div
                      key={member.email}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Checkbox
                        id={`add-member-${member.email}`}
                        checked={selectedMembersToAdd.some(
                          (m) => m.email === member.email
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMembersToAdd((prev) => [
                              ...prev,
                              member,
                            ]);
                          } else {
                            setSelectedMembersToAdd((prev) =>
                              prev.filter((m) => m.email !== member.email)
                            );
                          }
                        }}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                          {member.full_name?.charAt(0) ||
                            member.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor={`add-member-${member.email}`}
                        className="flex-1 cursor-pointer min-w-0"
                      >
                        <div className="font-medium text-slate-900 truncate">
                          {member.full_name || member.email}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {member.position}
                        </div>
                      </label>
                    </div>
                  ))}
              </div>
            </ScrollArea>

            {selectedMembersToAdd.length > 0 && (
              <div className="text-sm text-slate-600">
                {selectedMembersToAdd.length} member
                {selectedMembersToAdd.length !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMembersDialog(false);
                setSelectedMembersToAdd([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembersToGroup}
              disabled={selectedMembersToAdd.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Add {selectedMembersToAdd.length} Member
              {selectedMembersToAdd.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
