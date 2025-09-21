import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ScreenShare,
  Users,
  MessageSquare,
  Settings,
  Download,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Copy,
  UserPlus,
  MoreVertical,
  Sparkles,
  Activity,
  Clock,
  Shield,
  Zap,
  Star,
  Crown,
  AlertCircle,
  CheckCircle,
  Camera,
  Monitor,
  Presentation,
  FileText,
  Image,
  Send,
  Smile,
  Pin,
  Archive,
} from "lucide-react";
import { format } from "date-fns";

// Enterprise Meeting Component with Advanced Features
export default function EnterpriseMeeting({
  meeting,
  user,
  participants,
  onEndMeeting,
  onToggleVideo,
  onToggleMic,
  onStartScreenShare,
  onInviteParticipant,
  onSendChatMessage,
}) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speakerView, setSpeakerView] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState("excellent");
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecordingDialog, setShowRecordingDialog] = useState(false);

  const videoRef = useRef(null);
  const chatEndRef = useRef(null);

  // Meeting timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (meeting?.startTime) {
        const duration = Math.floor(
          (Date.now() - new Date(meeting.startTime).getTime()) / 1000
        );
        setMeetingDuration(duration);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [meeting?.startTime]);

  // Format meeting duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle video toggle
  const handleToggleVideo = async () => {
    setIsVideoOn(!isVideoOn);
    await onToggleVideo(!isVideoOn);
  };

  // Handle mic toggle
  const handleToggleMic = async () => {
    setIsMicOn(!isMicOn);
    await onToggleMic(!isMicOn);
  };

  // Handle screen sharing
  const handleScreenShare = async () => {
    setIsScreenSharing(!isScreenSharing);
    await onStartScreenShare(!isScreenSharing);
  };

  // Handle recording
  const handleToggleRecording = async () => {
    if (!isRecording) {
      setShowRecordingDialog(true);
    } else {
      setIsRecording(false);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setShowRecordingDialog(false);
  };

  // Send chat message
  const handleSendChatMessage = () => {
    if (!chatMessage.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: user,
      content: chatMessage,
      timestamp: new Date().toISOString(),
      type: "chat",
    };

    setChatMessages((prev) => [...prev, newMessage]);
    onSendChatMessage(newMessage);
    setChatMessage("");
  };

  // Participant grid component
  const ParticipantGrid = () => {
    const gridCols =
      participants.length <= 2 ? 1 : participants.length <= 4 ? 2 : 3;

    return (
      <div
        className={`grid gap-4 h-full ${
          speakerView ? "grid-cols-1" : `grid-cols-${gridCols}`
        }`}
      >
        {participants.map((participant, index) => (
          <ParticipantVideo
            key={participant.id || index}
            participant={participant}
            isActiveSpeaker={activeSpeaker?.id === participant.id}
            isSelf={participant.email === user?.email}
          />
        ))}
      </div>
    );
  };

  // Individual participant video component
  const ParticipantVideo = ({ participant, isActiveSpeaker, isSelf }) => {
    return (
      <div
        className={`relative bg-slate-900 rounded-xl overflow-hidden ${
          isActiveSpeaker ? "ring-4 ring-green-500" : ""
        }`}
      >
        {/* Video placeholder */}
        <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
          {participant.videoEnabled ? (
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              <Camera className="w-12 h-12 text-slate-400" />
            </div>
          ) : (
            <Avatar className="w-20 h-20">
              <AvatarImage src={participant.avatar_url} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl">
                {participant.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Participant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">
                {isSelf ? "You" : participant.full_name}
              </span>
              {participant.role === "host" && (
                <Crown className="w-4 h-4 text-amber-400" />
              )}
              {isActiveSpeaker && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400">Speaking</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!participant.micEnabled && (
                <div className="p-1 bg-red-500 rounded-full">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
              {!participant.videoEnabled && (
                <div className="p-1 bg-red-500 rounded-full">
                  <VideoOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Screen sharing indicator */}
        {participant.isScreenSharing && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-500 text-white">
              <Monitor className="w-3 h-3 mr-1" />
              Sharing
            </Badge>
          </div>
        )}
      </div>
    );
  };

  // Chat sidebar
  const ChatSidebar = () => (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Meeting Chat
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <Avatar className="w-6 h-6 mt-1">
              <AvatarImage src={message.sender?.avatar_url} />
              <AvatarFallback className="text-xs">
                {message.sender?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-700">
                  {message.sender?.full_name}
                </span>
                <span className="text-xs text-slate-400">
                  {format(new Date(message.timestamp), "HH:mm")}
                </span>
              </div>
              <p className="text-sm text-slate-600">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendChatMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleSendChatMessage}
            disabled={!chatMessage.trim()}
            size="sm"
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Meeting Header */}
      <div className="flex items-center justify-between p-4 bg-slate-800 text-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">Live Meeting</span>
          </div>
          <Separator orientation="vertical" className="h-6 bg-slate-600" />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{formatDuration(meetingDuration)}</span>
          </div>
          {isRecording && (
            <>
              <Separator orientation="vertical" className="h-6 bg-slate-600" />
              <div className="flex items-center gap-2 text-red-400">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Recording</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Quality */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connectionQuality === "excellent"
                        ? "bg-green-500"
                        : connectionQuality === "good"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-xs capitalize">
                    {connectionQuality}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Connection Quality: {connectionQuality}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Participants Count */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-slate-700"
            onClick={() => setShowParticipants(!showParticipants)}
          >
            <Users className="w-4 h-4 mr-2" />
            {participants.length}
          </Button>

          {/* Meeting ID */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-slate-700"
            onClick={() => navigator.clipboard.writeText(meeting?.id)}
          >
            <Copy className="w-4 h-4 mr-2" />
            ID: {meeting?.id?.slice(-6)}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 p-4">
          <ParticipantGrid />
        </div>

        {/* Chat Sidebar */}
        {showChat && <ChatSidebar />}

        {/* Participants Sidebar */}
        {showParticipants && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  Participants ({participants.length})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onInviteParticipant()}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={participant.avatar_url} />
                    <AvatarFallback>
                      {participant.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {participant.full_name}
                      {participant.email === user?.email && " (You)"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {participant.role === "host" && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Host
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        {participant.micEnabled ? (
                          <Mic className="w-3 h-3 text-green-500" />
                        ) : (
                          <MicOff className="w-3 h-3 text-red-500" />
                        )}
                        {participant.videoEnabled ? (
                          <Video className="w-3 h-3 text-green-500" />
                        ) : (
                          <VideoOff className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Meeting Controls */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-center gap-4">
          {/* Primary Controls */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleToggleMic}
                    size="lg"
                    className={`rounded-full w-12 h-12 ${
                      isMicOn
                        ? "bg-slate-600 hover:bg-slate-500 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    {isMicOn ? (
                      <Mic className="w-5 h-5" />
                    ) : (
                      <MicOff className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMicOn ? "Mute" : "Unmute"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleToggleVideo}
                    size="lg"
                    className={`rounded-full w-12 h-12 ${
                      isVideoOn
                        ? "bg-slate-600 hover:bg-slate-500 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    {isVideoOn ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <VideoOff className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isVideoOn ? "Turn off camera" : "Turn on camera"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleScreenShare}
                    size="lg"
                    className={`rounded-full w-12 h-12 ${
                      isScreenSharing
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "bg-slate-600 hover:bg-slate-500 text-white"
                    }`}
                  >
                    <ScreenShare className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isScreenSharing ? "Stop sharing" : "Share screen"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowChat(!showChat)}
              size="lg"
              variant="ghost"
              className="rounded-full w-12 h-12 text-white hover:bg-slate-700"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleToggleRecording}
              size="lg"
              variant="ghost"
              className={`rounded-full w-12 h-12 ${
                isRecording
                  ? "text-red-400 hover:bg-slate-700"
                  : "text-white hover:bg-slate-700"
              }`}
            >
              <Video className="w-5 h-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-full w-12 h-12 text-white hover:bg-slate-700"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSpeakerView(!speakerView)}>
                  <Presentation className="w-4 h-4 mr-2" />
                  {speakerView ? "Grid View" : "Speaker View"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Download Recording
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* End Meeting */}
          <Button
            onClick={onEndMeeting}
            size="lg"
            className="rounded-full bg-red-500 hover:bg-red-600 text-white px-6"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            End Meeting
          </Button>
        </div>
      </div>

      {/* Recording Dialog */}
      <Dialog open={showRecordingDialog} onOpenChange={setShowRecordingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              Start Recording
            </DialogTitle>
            <DialogDescription>
              This meeting will be recorded and saved to your organization's
              storage. All participants will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRecordingDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={startRecording}
              className="bg-red-500 hover:bg-red-600"
            >
              Start Recording
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
