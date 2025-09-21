
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bell, 
  Check, 
  CheckCheck,
  AtSign,
  MessageCircle,
  UserPlus,
  AlertCircle,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";

const getNotificationIcon = (type) => {
  const icons = {
    mention: AtSign,
    assignment: AlertCircle,
    comment: MessageCircle,
    status_change: CheckCheck,
    organization_invite: UserPlus,
    direct_message: MessageCircle
  };
  return icons[type] || Bell;
};

const getNotificationColor = (type) => {
  const colors = {
    mention: "text-blue-500",
    assignment: "text-orange-500", 
    comment: "text-green-500",
    status_change: "text-purple-500",
    organization_invite: "text-indigo-500",
    direct_message: "text-pink-500"
  };
  return colors[type] || "text-gray-500";
};

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const userNotifications = await Notification.filter(
        { user_email: currentUser.email },
        "-created_date"
      );
      setNotifications(userNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
    setIsLoading(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { read: true });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => Notification.update(n.id, { read: true }))
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await Notification.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const clearAllRead = async () => {
    try {
      const readNotifications = notifications.filter(n => n.read);
      await Promise.all(
        readNotifications.map(n => Notification.delete(n.id))
      );
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (error) {
      console.error("Error clearing read notifications:", error);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "unread") return !notification.read;
    if (filter === "mentions") return notification.type === "mention";
    if (filter === "assignments") return notification.type === "assignment";
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
          {notifications.filter(n => n.read).length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={clearAllRead} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Read
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className="text-xs md:text-sm"
        >
          All ({notifications.length})
        </Button>
        <Button
          variant={filter === "unread" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
          className="text-xs md:text-sm"
        >
          Unread ({unreadCount})
        </Button>
        <Button
          variant={filter === "mentions" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("mentions")}
          className="text-xs md:text-sm"
        >
          Mentions
        </Button>
        <Button
          variant={filter === "assignments" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("assignments")}
          className="text-xs md:text-sm"
        >
          Assignments
        </Button>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-6" />
              <h3 className="text-lg font-semibold text-slate-900 mb-3">No Notifications</h3>
              <p className="text-slate-600 text-sm md:text-base">
                {filter === "all" 
                  ? "You're all caught up! No notifications to show."
                  : `No ${filter} notifications found.`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                
                return (
                  <div 
                    key={notification.id}
                    className={`group relative transition-colors duration-200 ${
                      !notification.read ? 'border-l-4 border-blue-500 bg-blue-50/30' : ''
                    } hover:bg-slate-50`}
                  >
                    {/* Actions menu - appears on hover */}
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full shadow-sm"
                            onClick={(e) => e.stopPropagation()} // Prevent link click when opening dropdown
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {!notification.read && (
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}>
                                <Check className="w-4 h-4 mr-2" />
                                Mark as Read
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Link
                      to={notification.link || '#'}
                      className="block"
                      onClick={(e) => {
                        // Only prevent default if there's no link to navigate to
                        // Or if the click originated from an action button (handled by stopPropagation)
                        if (!notification.link) e.preventDefault();
                        if (!notification.read) markAsRead(notification.id);
                      }}
                    >
                      <div className={`p-4 md:p-6 pr-12 md:pr-16`}>
                        <div className="flex gap-3 md:gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${iconColor}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col">
                              <div className="flex items-start gap-2 mb-1">
                                <h4 className="font-medium text-slate-900 text-sm md:text-base line-clamp-2 flex-1">
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                                )}
                              </div>
                              <p className="text-slate-600 text-sm line-clamp-3 mb-3">{notification.message}</p>
                              <div className="flex items-center gap-4 text-xs md:text-sm text-slate-500">
                                <span>
                                  {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                                </span>
                                {notification.from_user_email && (
                                  <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="hidden sm:inline">from {notification.from_user_email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
