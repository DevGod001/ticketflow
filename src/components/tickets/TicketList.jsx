
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  assigned: "bg-purple-100 text-purple-800", 
  in_progress: "bg-yellow-100 text-yellow-800",
  pending: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800"
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800", 
  urgent: "bg-red-100 text-red-800"
};

export default function TicketList({ tickets, teamMembers, onTicketSelect }) {
  const getMemberDetails = (email) => teamMembers.find(m => m.email === email);

  if (tickets.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8 md:p-12 text-center">
          <Clock className="w-12 md:w-16 h-12 md:h-16 text-slate-300 mx-auto mb-4 md:mb-6" />
          <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2 md:mb-3">No tickets found</h3>
          <p className="text-slate-600 text-sm md:text-base">Create your first ticket to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {tickets.map((ticket) => (
        <Card 
          key={ticket.id} 
          className="border-none shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
          onClick={() => onTicketSelect(ticket)}
        >
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 line-clamp-2 pr-2">
                    {ticket.title}
                  </h3>
                  <div className="flex gap-1 md:gap-2 flex-shrink-0">
                    <Badge className={`${statusColors[ticket.status]} text-xs`}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={`${priorityColors[ticket.priority]} text-xs`}>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm md:text-base text-slate-600 line-clamp-2 mb-3">
                  {ticket.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-slate-500 flex-wrap">
                <span className="font-mono">#{ticket.id.slice(-8)}</span>
                <span className="hidden sm:inline">•</span>
                <span>{format(new Date(ticket.created_date), 'MMM d, yyyy')}</span>
                {ticket.due_date && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1 text-orange-600">
                      <Clock className="w-3 h-3" />
                      Due {format(new Date(ticket.due_date), 'MMM d')}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end">
                {ticket.assigned_to?.length > 0 ? (
                  <div className="flex items-center -space-x-1 md:-space-x-2">
                    {ticket.assigned_to.slice(0, 3).map((email, index) => {
                      const member = getMemberDetails(email);
                      return (
                        <Link 
                          key={index}
                          to={createPageUrl("Profile", `user_email=${email}`)}
                          onClick={(e) => e.stopPropagation()}
                          className="relative hover:z-10 transition-transform hover:scale-110 duration-200"
                        >
                          <Avatar className="w-6 h-6 md:w-7 md:h-7 border-2 border-white hover:border-blue-200">
                            <AvatarImage src={member?.avatar_url} />
                            <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                              {email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      );
                    })}
                    {ticket.assigned_to.length > 3 && (
                      <span className="text-xs text-slate-500 pl-2 md:pl-3">
                        +{ticket.assigned_to.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-slate-500 text-xs">
                    <User className="w-3 h-3 mr-1" />
                    Unassigned
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
