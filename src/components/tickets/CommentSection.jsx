import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Comment } from "@/api/entities";
import { User } from "@/api/entities";
import { Notification } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Send,
  Edit3,
  Trash2,
  Reply,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Paperclip,
  X,
  File as FileIcon,
  Loader2,
} from "lucide-react";
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
import { format, formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function CommentSection({ ticket, teamMembers, onUpdate }) {
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [expandedThreads, setExpandedThreads] = useState(new Set());
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // State for @mention functionality
  const newCommentRef = useRef(null);
  const replyCommentRef = useRef(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [mentionTarget, setMentionTarget] = useState(null); // 'new' or 'reply'

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  }, []);

  const loadComments = useCallback(async () => {
    try {
      const allComments = await Comment.filter(
        { ticket_id: ticket.id },
        "-created_date"
      );
      setComments(allComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  }, [ticket.id]);

  useEffect(() => {
    loadUser();
    loadComments();
  }, [loadUser, loadComments]);

  // Hide mention suggestions on scroll or outside click
  useEffect(() => {
    const handleInteraction = () => {
      setShowMentionSuggestions(false);
    };
    window.addEventListener("scroll", handleInteraction);
    document.addEventListener("click", handleInteraction);
    return () => {
      window.removeEventListener("scroll", handleInteraction);
      document.removeEventListener("click", handleInteraction);
    };
  }, []);

  // Auto-focus on reply input when it appears
  useEffect(() => {
    if (replyingTo && replyCommentRef.current) {
      replyCommentRef.current.focus();
    }
  }, [replyingTo]);

  const extractMentions = (text) => {
    // Regex updated to extract email from markdown link format: [Name](email)
    const mentionRegex = /\(([^)]+?@\S+?\.\S+?)\)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]); // The email is in the first capturing group
    }
    return mentions;
  };

  const getMemberDetails = (email) =>
    teamMembers.find((m) => m.email === email);
  const getTopLevelComments = () =>
    comments.filter((comment) => !comment.parent_comment_id);
  const getThreadReplies = (parentId) =>
    comments
      .filter((c) => c.parent_comment_id === parentId)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const getThreadCount = (parentId) =>
    comments.filter((c) => c.parent_comment_id === parentId).length;

  const toggleThread = (commentId) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      newSet.has(commentId) ? newSet.delete(commentId) : newSet.add(commentId);
      return newSet;
    });
  };

  const handleFileSelect = async (e, isReply = false) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      const newAttachment = { url: file_url, name: file.name, type: file.type };
      if (isReply) {
        setReplyAttachments((prev) => [...prev, newAttachment]);
      } else {
        setAttachments((prev) => [...prev, newAttachment]);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setIsUploading(false);
    e.target.value = null;
  };

  const removeAttachment = (index, isReply = false) => {
    if (isReply) {
      setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddComment = async () => {
    if ((!newComment.trim() && attachments.length === 0) || !user) return;

    setIsSubmitting(true);
    try {
      const mentions = extractMentions(newComment);
      const newCommentData = await Comment.create({
        content: newComment.trim(),
        ticket_id: ticket.id,
        author_email: user.email,
        mentions,
        attachments,
      });

      for (const mentionedEmail of mentions) {
        if (mentionedEmail !== user.email) {
          await Notification.create({
            user_email: mentionedEmail,
            type: "mention",
            title: "You were mentioned in a comment",
            message: `${
              user.full_name || user.email
            } mentioned you in ticket: ${ticket.title}`,
            organization_id: ticket.organization_id,
            related_id: ticket.id,
            comment_id: newCommentData.id, // Include comment ID for direct scrolling
            from_user_email: user.email,
            link: createPageUrl(
              "AllTickets",
              `ticket=${ticket.id}&comment=${newCommentData.id}`
            ),
          });
        }
      }

      setNewComment("");
      setAttachments([]);
      loadComments();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error creating comment:", error);
    }
    setIsSubmitting(false);
  };

  const handleAddReply = async (parentCommentId) => {
    if ((!replyText.trim() && replyAttachments.length === 0) || !user) return;
    setIsSubmitting(true);
    try {
      const mentions = extractMentions(replyText);
      await Comment.create({
        content: replyText.trim(),
        ticket_id: ticket.id,
        author_email: user.email,
        parent_comment_id: parentCommentId,
        mentions,
        attachments: replyAttachments,
      });
      setExpandedThreads((prev) => new Set([...prev, parentCommentId]));
      setReplyingTo(null);
      setReplyText("");
      setReplyAttachments([]);
      loadComments();
    } catch (error) {
      console.error("Error creating reply:", error);
    }
    setIsSubmitting(false);
  };

  const handleEditComment = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await Comment.update(commentId, {
        content: editText.trim(),
        edited_at: new Date().toISOString(),
      });
      cancelEdit();
      loadComments();
    } catch (error) {
      console.error("Error editing comment:", error);
    }
  };

  const startEdit = (comment) => {
    setEditingComment(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditText("");
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await Comment.delete(commentId);
      loadComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  // @mention handlers
  const handleTextChange = (e, type) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;

    if (type === "new") setNewComment(text);
    else setReplyText(text);

    const textBeforeCursor = text.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const precedingChar = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
      if (/\s/.test(precedingChar) || atIndex === 0) {
        // Trigger if @ is preceded by space or is at the beginning
        const query = textBeforeCursor.substring(atIndex + 1);
        // Only trigger if query doesn't contain a closing parenthesis, to avoid matching inside a markdown link that's already formed
        if (!query.includes(")") && !/\s/.test(query)) {
          const filtered = teamMembers.filter(
            (member) =>
              member.full_name?.toLowerCase().includes(query.toLowerCase()) ||
              member.email.toLowerCase().includes(query.toLowerCase())
          );
          setMentionQuery(query);
          setFilteredMembers(filtered);
          setMentionTarget(type);
          setShowMentionSuggestions(true);
          return;
        }
      }
    }
    setShowMentionSuggestions(false);
    setMentionQuery("");
    setFilteredMembers([]);
  };

  const handleMentionSelect = (member) => {
    const targetRef = mentionTarget === "new" ? newCommentRef : replyCommentRef;
    const currentText = mentionTarget === "new" ? newComment : replyText;
    const setText = mentionTarget === "new" ? setNewComment : setReplyText;

    if (!targetRef.current) return;

    const cursorPosition = targetRef.current.selectionStart;
    const textBeforeCursor = currentText.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = currentText.substring(cursorPosition);

    // Format the mention as a markdown link: @[Display Name](email@domain.com)
    const mentionString = `@[${member.full_name || member.email}](${
      member.email
    })`;

    const newText =
      currentText.substring(0, atIndex) + mentionString + textAfterCursor;

    setText(newText);
    setShowMentionSuggestions(false);

    setTimeout(() => {
      targetRef.current?.focus();
      // Calculate new cursor position based on the length of the inserted mention string
      const newCursorPosition = atIndex + mentionString.length;
      targetRef.current?.setSelectionRange(
        newCursorPosition,
        newCursorPosition
      );
    }, 0);
  };

  const customMarkdownComponents = {
    a: ({ node, ...props }) => {
      // Check if it's an email link (our mention format)
      // The href will be the email from the markdown link: [Name](email)
      const isMention =
        props.href && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.href);
      if (isMention) {
        const email = props.href;
        const member = getMemberDetails(email);
        const displayName = member?.full_name || email;

        return (
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Link
                  to={createPageUrl("Profile", `user_email=${email}`)}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  onClick={(e) => e.stopPropagation()} // Prevent parent click handler
                >
                  {displayName}
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      // Render normal links
      return (
        <a
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {props.children}
        </a>
      );
    },
  };

  const renderComment = (comment, isReply = false) => {
    const member = getMemberDetails(comment.author_email);
    const threadReplies = getThreadReplies(comment.id);
    const threadCount = threadReplies.length;
    const isExpanded = expandedThreads.has(comment.id);
    const canEdit = user?.email === comment.author_email;
    const isEditing = editingComment === comment.id;
    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`} // Add unique ID for smooth scrolling
        className={`group ${isReply ? "ml-4 md:ml-12" : ""}`}
      >
        <div className="flex gap-2 md:gap-3 p-3 md:p-4 rounded-lg hover:bg-slate-50 transition-colors duration-200">
          <div className="flex-shrink-0">
            <Link
              to={createPageUrl(
                "Profile",
                `user_email=${comment.author_email}`
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar className="w-8 h-8 md:w-10 md:h-10 hover:ring-2 hover:ring-blue-200 transition-all duration-200">
                <AvatarImage src={member?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs md:text-sm">
                  {comment.author_email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
              <div className="flex-shrink-0">
                <Link
                  to={createPageUrl(
                    "Profile",
                    `user_email=${comment.author_email}`
                  )}
                  className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-sm md:text-base truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {member?.full_name || comment.author_email}
                </Link>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  {formatDistanceToNow(new Date(comment.created_date), {
                    addSuffix: true,
                  })}
                </span>
                {comment.edited_at && <span className="italic">(edited)</span>}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="text-sm md:text-base resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditComment(comment.id)}
                    className="text-xs"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEdit}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm md:text-base text-slate-800 mb-3">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown components={customMarkdownComponents}>
                      {comment.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {comment.attachments?.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {comment.attachments.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg border hover:bg-slate-200 transition-colors"
                      >
                        <FileIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">
                          {file.name}
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 md:gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyingTo(comment.id);
                    }}
                    className="text-xs text-slate-600 hover:text-slate-800 p-0 h-auto font-normal"
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Reply
                  </Button>

                  {!isReply && threadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleThread(comment.id);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-800 p-0 h-auto font-normal flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {threadCount} {threadCount > 1 ? "replies" : "reply"}
                    </Button>
                  )}

                  {canEdit && (
                    <div
                      className="flex items-center gap-1 md:gap-2 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-opacity duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(comment)}
                        className="text-xs p-1 h-auto text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs p-1 h-auto text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-3">
            {threadReplies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <MessageCircle className="w-5 h-5" />
          Comments & Activity ({getTopLevelComments().length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Add Comment Form */}
        <div className="relative">
          <Textarea
            ref={newCommentRef}
            value={newComment}
            onChange={(e) => handleTextChange(e, "new")}
            placeholder="Add a comment... use @ to mention teammates"
            className="text-sm md:text-base resize-none"
            rows={3}
            onClick={() => setShowMentionSuggestions(false)}
          />

          {/* Mention Suggestions */}
          {showMentionSuggestions &&
            mentionTarget === "new" &&
            filteredMembers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <button
                    key={member.email}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMentionSelect(member);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-b-0 text-sm"
                  >
                    <div className="font-medium">{member.full_name}</div>
                    <div className="text-xs text-slate-500">{member.email}</div>
                  </button>
                ))}
              </div>
            )}
        </div>

        <div className="space-y-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <FileIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 cursor-pointer">
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                onChange={(e) => handleFileSelect(e, false)}
                className="hidden"
              />
            </label>
            {isUploading && mentionTarget !== "reply" && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            )}
          </div>
          <Button
            onClick={handleAddComment}
            disabled={
              (!newComment.trim() && attachments.length === 0) || isSubmitting
            }
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting && mentionTarget !== "reply"
              ? "Posting..."
              : "Comment"}
          </Button>
        </div>

        {/* Reply Form */}
        {replyingTo && (
          <div className="space-y-3 ml-4 md:ml-12 p-3 md:p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-700">
              Replying to{" "}
              {getMemberDetails(
                comments.find((c) => c.id === replyingTo)?.author_email
              )?.full_name || "comment"}
            </p>
            <div className="relative">
              <Textarea
                ref={replyCommentRef}
                value={replyText}
                onChange={(e) => handleTextChange(e, "reply")}
                placeholder="Write your reply..."
                className="text-sm resize-none"
                rows={2}
                onClick={() => setShowMentionSuggestions(false)}
              />

              {/* Reply Mention Suggestions */}
              {showMentionSuggestions &&
                mentionTarget === "reply" &&
                filteredMembers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.email}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMentionSelect(member);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-b-0 text-sm"
                      >
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {member.email}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div className="space-y-2">
              {replyAttachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index, true)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 cursor-pointer">
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    onChange={(e) => handleFileSelect(e, true)}
                    className="hidden"
                  />
                </label>
                {isUploading && mentionTarget === "reply" && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAddReply(replyingTo)}
                  disabled={
                    (!replyText.trim() && replyAttachments.length === 0) ||
                    isSubmitting
                  }
                  className="text-xs bg-blue-600"
                >
                  <Send className="w-3 h-3 mr-1" />
                  {isSubmitting && mentionTarget === "reply"
                    ? "Posting..."
                    : "Reply"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText("");
                    setReplyAttachments([]);
                    setShowMentionSuggestions(false);
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3">
          {getTopLevelComments().map((comment) => renderComment(comment))}
        </div>
      </CardContent>
    </Card>
  );
}
