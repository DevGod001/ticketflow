
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Channel } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Hash,
  Plus,
  Search,
  Users,
  Lock,
  Volume2,
  ArrowLeft
} from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";

import CreateChannelForm from "../components/channels/CreateChannelForm";
import ChannelMessages from "../components/channels/ChannelMessages";

export default function Channels() {
  const [user, setUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);

  const { isDark } = useTheme();

  useEffect(() => {
    loadData();

    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.active_organization_id) {
        const [org, orgChannels] = await Promise.all([
          Organization.filter({ id: currentUser.active_organization_id }).then(orgs => orgs[0]),
          Channel.filter({
            organization_id: currentUser.active_organization_id
          })
        ]);

        setTeamMembers(org?.member_profiles || []);
        setChannels(orgChannels);
      }
    } catch (error) {
      console.error("Error loading channels data:", error);
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel.type) {
      case 'announcement': return Volume2;
      case 'private': return Lock;
      default: return Hash;
    }
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
  };

  const handleBackToChannels = () => {
    setSelectedChannel(null);
  };

  if (isCreatingChannel) {
    return (
      <CreateChannelForm
        user={user}
        teamMembers={teamMembers}
        onCancel={() => setIsCreatingChannel(false)}
        onSuccess={() => {
          setIsCreatingChannel(false);
          loadData();
        }}
      />
    );
  }

  const ChannelListView = ({ isMainView }) => (
    <div className={`flex flex-col h-full ${isMainView ? 'w-full' : 'w-1/3 border-r'} transition-colors duration-200 ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'
    }`}>
      <div className={`flex items-center justify-between p-6 ${isMainView ? 'border-b' : ''} transition-colors duration-200 ${
        isDark ? 'border-slate-700' : 'border-slate-200'
      }`}>
        <h1 className={`text-2xl font-bold transition-colors duration-200 ${
          isDark ? 'text-slate-50' : 'text-slate-900'
        }`}>Channels</h1>
        <Button
          size={isMainView ? 'default' : 'sm'}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          onClick={() => setIsCreatingChannel(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isMainView ? 'Create Channel' : 'Create'}
        </Button>
      </div>

      <div className={`flex-1 overflow-hidden flex flex-col ${isMainView ? '' : 'p-4'}`}>
        <div className="relative mb-4 flex-shrink-0">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
            isDark ? 'text-slate-400' : 'text-slate-400'
          }`} />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 transition-colors duration-200 ${
              isDark ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400' : ''
            }`}
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {filteredChannels.length > 0 ? (
              filteredChannels.map((channel) => {
                const ChannelIcon = getChannelIcon(channel);
                return (
                  <div
                    key={channel.id}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                      selectedChannel?.id === channel.id
                        ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/50 dark:border-blue-700'
                        : isDark
                          ? 'hover:bg-slate-700/50 border-slate-700 hover:border-slate-600'
                          : 'hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                    onClick={() => handleChannelSelect(channel)}
                  >
                    <div className="flex items-center gap-3">
                      <ChannelIcon className={`w-5 h-5 transition-colors duration-200 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`} style={{ color: channel.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium truncate transition-colors duration-200 ${
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          }`}>#{channel.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs transition-colors duration-200 ${
                              isDark ? 'border-slate-600 text-slate-400' : ''
                            }`}>
                              {channel.members?.length || 0}
                            </Badge>
                            {channel.type === 'private' && (
                              <Lock className={`w-3 h-3 transition-colors duration-200 ${
                                isDark ? 'text-slate-500' : 'text-slate-400'
                              }`} />
                            )}
                          </div>
                        </div>
                        <p className={`text-sm truncate mt-1 transition-colors duration-200 ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>{channel.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Hash className={`w-12 h-12 mx-auto mb-4 transition-colors duration-200 ${
                  isDark ? 'text-slate-600' : 'text-slate-300'
                }`} />
                <p className={`transition-colors duration-200 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>No channels found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const ChannelMessageView = () => {
    return (
      <div className={`h-full flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900' : 'bg-white'
      }`}>
        <div className={`flex items-center gap-3 p-4 border-b transition-colors duration-200 ${
          isDark ? 'border-slate-700' : 'border-slate-200'
        }`}>
          {isMobileView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToChannels}
              className={`transition-colors duration-200 ${
                isDark ? 'hover:bg-slate-700 text-slate-300' : ''
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <Hash className="w-6 h-6" style={{ color: selectedChannel?.color || '#3b82f6' }} />
          <div>
            <h2 className={`text-xl font-bold transition-colors duration-200 ${
              isDark ? 'text-slate-50' : 'text-slate-900'
            }`}>#{selectedChannel?.name}</h2>
            <p className={`text-sm transition-colors duration-200 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>{selectedChannel?.description}</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ChannelMessages
            key={selectedChannel?.id}
            channel={selectedChannel}
            user={user}
            teamMembers={teamMembers}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {isMobileView ? (
        !selectedChannel ? (
          <ChannelListView isMainView={true} />
        ) : (
          <ChannelMessageView />
        )
      ) : (
        <div className="flex h-full">
          <ChannelListView isMainView={false} />
          <div className="flex-1">
            {selectedChannel ? (
              <ChannelMessageView />
            ) : (
              <div className={`flex-1 flex items-center justify-center transition-colors duration-200 ${
                isDark ? 'bg-slate-900' : 'bg-white'
              }`}>
                <div className="text-center py-12">
                  <Users className={`w-16 h-16 mx-auto mb-6 transition-colors duration-200 ${
                    isDark ? 'text-slate-700' : 'text-slate-300'
                  }`} />
                  <h3 className={`text-lg font-semibold mb-3 transition-colors duration-200 ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}>Select a Channel</h3>
                  <p className={`transition-colors duration-200 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>Choose a channel from the sidebar to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
