
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  UserPlus, 
  AlertCircle, 
  CheckCircle, 
  AtSign,
  Bell
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const getNotificationIcon = (type) => {
  const icons = {
    mention: AtSign,
    assignment: AlertCircle,
    comment: MessageCircle,
    status_change: CheckCircle,
    organization_invite: UserPlus
  };
  return icons[type] || Bell;
};

const getNotificationColor = (type) => {
  const colors = {
    mention: "text-blue-500 dark:text-blue-400",
    assignment: "text-orange-500 dark:text-orange-400", 
    comment: "text-green-500 dark:text-green-400",
    status_change: "text-purple-500 dark:text-purple-400",
    organization_invite: "text-indigo-500 dark:text-indigo-400"
  };
  return colors[type] || "text-gray-500 dark:text-gray-400";
};

export default function RecentActivity({ notifications }) {
  // Filter out direct messages to keep dashboard professional
  const workNotifications = notifications.filter(notification => 
    notification.type !== 'direct_message'
  );

  return (
    <Card className="border-none shadow-lg dark:bg-slate-700">
      <CardHeader className="border-b border-slate-100 dark:border-slate-600">
        <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">Recent Activity</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">Work-related updates and notifications</p>
      </CardHeader>
      <CardContent className="p-6">
        {workNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-3">All Quiet</h3>
            <p className="text-slate-500 dark:text-slate-400">No recent work activity to show</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Check the Messages section for team conversations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {workNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);
              
              return (
                <div key={notification.id} className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600/50 transition-colors duration-200">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{notification.title}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-2">
                      <span>
                        {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                      </span>
                      {notification.from_user_email && (
                        <>
                          <span>•</span>
                          <span>from {notification.from_user_email.split('@')[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
