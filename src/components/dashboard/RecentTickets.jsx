import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, ArrowRight, User, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

const getStatusIcon = (status) => {
  switch(status) {
    case 'resolved':
    case 'closed':
      return CheckCircle2;
    case 'in_progress':
    case 'assigned':
      return Circle;
    default:
      return AlertCircle;
  }
};

const getStatusColor = (status) => {
  switch(status) {
    case 'resolved':
    case 'closed':
      return 'text-green-600';
    case 'in_progress':
      return 'text-blue-600';
    case 'assigned':
      return 'text-purple-600';
    default:
      return 'text-orange-600';
  }
};

const getPriorityDot = (priority) => {
  switch(priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-blue-500';
    default:
      return 'bg-slate-400';
  }
};

export default function RecentTickets({ tickets, teamMembers }) {
  const getMemberDetails = (email) => {
    if (!teamMembers || !Array.isArray(teamMembers)) return null;
    return teamMembers.find(m => m.email === email);
  };

  return (
    <Card className="border-none shadow-sm bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
            My Recent Tickets
          </CardTitle>
          <Link to={createPageUrl("AllTickets")}>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {tickets.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All caught up!</h3>
            <p className="text-slate-500 mb-6">No recent tickets to show</p>
            <Link to={createPageUrl("AllTickets", "action=create")}>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl">
                Create Your First Ticket
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-0">
            {tickets.slice(0, 5).map((ticket, index) => {
              const StatusIcon = getStatusIcon(ticket.status);
              const statusColor = getStatusColor(ticket.status);
              const priorityDot = getPriorityDot(ticket.priority);
              const member = getMemberDetails(ticket.reporter_email);
              
              return (
                <Link key={ticket.id} to={createPageUrl("AllTickets", `ticket=${ticket.id}`)} className="block">
                  <div className="group p-6 hover:bg-slate-50/80 transition-all duration-200 border-b border-slate-100 last:border-b-0">
                    <div className="flex items-start gap-4">
                      {/* Priority Indicator */}
                      <div className={`w-1 h-12 rounded-full ${priorityDot.replace('bg-', 'bg-')} flex-shrink-0 mt-1`}></div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-200 line-clamp-1 text-base">
                              {ticket.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                                <span className="text-sm font-medium text-slate-600 capitalize">
                                  {ticket.status.replace('_', ' ')}
                                </span>
                              </div>
                              <span className="text-slate-300">•</span>
                              <span className="text-sm text-slate-500 capitalize font-medium">
                                {ticket.priority} priority
                              </span>
                            </div>
                          </div>
                          
                          {/* Date */}
                          <div className="flex-shrink-0 text-right">
                            <div className="text-sm text-slate-500">
                              {format(new Date(ticket.created_date), 'MMM d')}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              #{ticket.id.slice(-6)}
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={member?.avatar_url} />
                              <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                                {member?.full_name?.charAt(0) || ticket.reporter_email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-600">
                              {member?.full_name || ticket.reporter_email}
                            </span>
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}