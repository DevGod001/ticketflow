import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChannelMessage } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  Paperclip,
  Smile,
  Loader2,
  Edit3,
  Trash2,
  Reply,
  MessageSquare,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

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
];

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

const containsUrl = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,})/i;
  return urlRegex.test(text);
};

export default function ChannelMessages({ channel, user, teamMembers }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [activeMessageActions, setActiveMessageActions] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const scrollAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const replyInputRef = useRef(null);
  const messageInputRef = useRef(null);

  const refreshMessages = useCallback(async () => {
    if (!channel) return;
    try {
      // Sort by created date ascending to display oldest first
      const channelMessages = await ChannelMessage.filter(
        { channel_id: channel.id },
        "created_date"
      );
      setMessages(channelMessages);
    } catch (error) {
      console.error("Error refreshing messages:", error);
    }
  }, [channel]);

  useEffect(() => {
    if (!channel) return;

    const loadInitialMessages = async () => {
      setIsLoading(true);
      await refreshMessages();
      setIsLoading(false);
    };

    loadInitialMessages();
    const interval = setInterval(refreshMessages, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [channel, refreshMessages]);

  // Hide actions on scroll or outside click
  useEffect(() => {
    const handleInteraction = () => {
      setActiveMessageActions(null);
    };
    window.addEventListener("scroll", handleInteraction);
    document.addEventListener("click", handleInteraction);
    return () => {
      window.removeEventListener("scroll", handleInteraction);
      document.removeEventListener("click", handleInteraction);
    };
  }, []);

  // Smooth scroll to bottom whenever messages change
  useEffect(() => {
    if (!isLoading) {
      // Only scroll after initial loading is complete
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isLoading]);

  // Auto-focus on reply input when it appears
  useEffect(() => {
    if (replyingTo && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyingTo]);

  // Enterprise-level channel selection experience: smooth scroll and focus
  useEffect(() => {
    if (channel && !isLoading) {
      // Smooth scroll to bottom when channel is first selected
      const timer = setTimeout(() => {
        scrollToBottom();
        // Auto-focus on message input for immediate typing
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 200); // Slight delay for smooth transition
      return () => clearTimeout(timer);
    }
  }, [channel?.id, isLoading]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSendMessage = async (content, parentId = null) => {
    if (!content.trim() || !user) return;
    const isReply = !!parentId;

    try {
      await ChannelMessage.create({
        content: content.trim(),
        channel_id: channel.id,
        author_email: user.email,
        parent_message_id: parentId,
      });

      if (isReply) {
        setReplyingTo(null);
      } else {
        setNewMessage("");
      }

      await refreshMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleEditMessage = async (messageId) => {
    if (!editText.trim()) return;
    try {
      await ChannelMessage.update(messageId, {
        content: editText.trim(),
        edited_at: new Date().toISOString(),
      });
      setEditingMessage(null);
      setEditText("");
      setActiveMessageActions(null);
      refreshMessages();
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await ChannelMessage.delete(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setActiveMessageActions(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleReaction = async (message, emoji) => {
    if (!user) return;

    const currentReactions = message.reactions || {};
    const usersForEmoji = currentReactions[emoji] || [];

    let updatedReactions;

    if (usersForEmoji.includes(user.email)) {
      // User is removing their reaction
      const updatedUsers = usersForEmoji.filter(
        (email) => email !== user.email
      );
      updatedReactions = { ...currentReactions, [emoji]: updatedUsers };
      if (updatedUsers.length === 0) {
        delete updatedReactions[emoji];
      }
    } else {
      // User is adding a reaction
      updatedReactions = {
        ...currentReactions,
        [emoji]: [...usersForEmoji, user.email],
      };
    }

    try {
      await ChannelMessage.update(message.id, { reactions: updatedReactions });
      await refreshMessages();
      setActiveMessageActions(null); // Hide actions after reacting
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const startEditMessage = (message) => {
    setEditingMessage(message.id);
    setEditText(message.content);
    setActiveMessageActions(null); // Close actions when starting edit
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditText("");
    setActiveMessageActions(null);
  };

  const handleMessageTap = (e, messageId) => {
    e.stopPropagation();
    setActiveMessageActions((prev) => (prev === messageId ? null : messageId));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      await ChannelMessage.create({
        content: `📎 ${file.name}`,
        channel_id: channel.id,
        author_email: user.email,
        attachments: [{ url: file_url, name: file.name, type: file.type }],
      });
      refreshMessages();
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji);
  };

  const getMemberDetails = (email) => {
    return teamMembers.find((m) => m.email === email);
  };

  const topLevelMessages = messages.filter((m) => !m.parent_message_id);
  const repliesByParent = messages.reduce((acc, msg) => {
    if (msg.parent_message_id) {
      if (!acc[msg.parent_message_id]) {
        acc[msg.parent_message_id] = [];
      }
      acc[msg.parent_message_id].push(msg);
    }
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const ReplyInput = ({ parentMessage }) => {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Input
          ref={replyInputRef}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && replyText.trim()) {
              handleSendMessage(replyText, parentMessage.id);
              setReplyText(""); // Clear after sending
            }
          }}
          placeholder={`Reply to ${
            getMemberDetails(parentMessage.author_email)?.full_name || "... "
          }`}
          className="h-9 text-sm"
          autoFocus
        />
        <Button
          size="sm"
          onClick={() => {
            if (replyText.trim()) {
              handleSendMessage(replyText, parentMessage.id);
              setReplyText(""); // Clear after sending
            }
          }}
          disabled={!replyText.trim()}
        >
          Reply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setReplyingTo(null);
            setReplyText(""); // Clear when canceling
          }}
        >
          Cancel
        </Button>
      </div>
    );
  };

  const renderMessage = (message) => {
    const member = getMemberDetails(message.author_email);
    const isOwnMessage = user?.email === message.author_email;
    const showActions = activeMessageActions === message.id;
    const isEditing = editingMessage === message.id;
    const hasUrl = containsUrl(message.content);
    const replies = repliesByParent[message.id] || [];

    return (
      <div key={message.id} className="group">
        <div
          className={`flex gap-3 hover:bg-slate-50 rounded-lg p-3 transition-colors duration-200 cursor-pointer`}
          onClick={(e) => handleMessageTap(e, message.id)}
        >
          {/* Avatar rendering */}
          <Link
            to={createPageUrl("Profile", `user_email=${message.author_email}`)}
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={member?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                {member?.full_name?.charAt(0) ||
                  message.author_email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0 relative">
            {/* Message Header (name, time) */}
            <div className="flex items-center gap-2 mb-1">
              <Link
                to={createPageUrl(
                  "Profile",
                  `user_email=${message.author_email}`
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                  {member?.full_name || message.author_email}
                </span>
              </Link>
              {isOwnMessage && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  You
                </span>
              )}
              <span className="text-xs text-slate-500">
                {message.created_date && !isNaN(new Date(message.created_date))
                  ? format(new Date(message.created_date), "p")
                  : "Just now"}
              </span>
              {message.edited_at && (
                <span className="text-xs text-slate-400 italic">(edited)</span>
              )}
            </div>

            {isEditing ? (
              // Editing UI
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditMessage(message.id)}
                    className="text-xs bg-blue-600"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditMessage}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Message Content & Attachments */}
                <div
                  className={`text-slate-800 ${
                    hasUrl ? "p-3 bg-slate-50 rounded-lg" : ""
                  }`}
                >
                  {linkifyText(message.content)}
                </div>

                {message.attachments?.map((file, fileIndex) => (
                  <a
                    key={fileIndex}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg border hover:bg-slate-200 transition-colors mt-2 w-fit"
                  >
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{file.name}</span>
                  </a>
                ))}

                {/* Reactions Display */}
                {message.reactions &&
                  Object.keys(message.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(message.reactions).map(
                        ([emoji, users]) =>
                          users.length > 0 && (
                            <button
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(message, emoji);
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors ${
                                users.includes(user?.email)
                                  ? "bg-blue-100 border-blue-300"
                                  : "bg-slate-100"
                              }`}
                            >
                              <span className="text-sm">{emoji}</span>
                              <span className="text-xs font-medium text-slate-700">
                                {users.length}
                              </span>
                            </button>
                          )
                      )}
                    </div>
                  )}
              </>
            )}

            {/* Action buttons */}
            {showActions && !isEditing && (
              <div
                className="absolute top-0 right-0 flex gap-1 bg-white rounded-lg shadow-lg border p-1 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1 h-auto text-slate-600 hover:text-blue-600"
                    >
                      <Smile className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1">
                    <div className="grid grid-cols-5 gap-0.5">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="icon"
                          className="text-lg rounded-md"
                          onClick={() => handleReaction(message, emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReplyingTo(message.id);
                    setActiveMessageActions(null);
                  }}
                  className="p-1 h-auto text-slate-600 hover:text-blue-600"
                >
                  <Reply className="w-3 h-3" />
                </Button>
                {isOwnMessage && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditMessage(message)}
                      className="p-1 h-auto text-slate-600 hover:text-blue-600"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMessage(message.id)}
                      className="p-1 h-auto text-slate-600 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Replies section */}
            {replies.length > 0 && (
              <div className="mt-3 pl-4 border-l-2 border-slate-200">
                {replies.map((reply) => (
                  <div key={reply.id} className="flex gap-2 items-start mt-2">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage
                        src={getMemberDetails(reply.author_email)?.avatar_url}
                      />
                      <AvatarFallback className="text-xs">
                        {getMemberDetails(
                          reply.author_email
                        )?.full_name?.charAt(0) ||
                          reply.author_email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <span className="font-semibold text-slate-800">
                        {getMemberDetails(reply.author_email)?.full_name ||
                          reply.author_email}
                      </span>
                      <p className="text-slate-700">
                        {linkifyText(reply.content)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input */}
            {replyingTo === message.id && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <ReplyInput parentMessage={message} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length > 0 ? (
          <div className="space-y-6">
            {topLevelMessages.map((message) => renderMessage(message))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
            <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">
              It's quiet in here
            </h3>
            <p>Be the first to send a message in #{channel.name}.</p>
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && handleSendMessage(newMessage)
              }
              placeholder={`Message #${channel.name}`}
              className="pr-20"
            />
            {/* bottom input form buttons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
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
            </div>
          </div>
          <Button
            onClick={() => handleSendMessage(newMessage)}
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
