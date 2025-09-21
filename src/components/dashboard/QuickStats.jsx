import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TicketCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  AlertCircle
} from "lucide-react";

const StatCard = ({ title, value, icon: Icon, color, trend, isUrgent = false }) => (
  <Card className={`border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white ${isUrgent ? 'ring-2 ring-red-500/50' : ''}`}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-slate-600'}`}>{title}</p>
          <p className={`text-3xl font-bold mt-2 ${isUrgent ? 'text-red-700' : 'text-slate-900'}`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600 font-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} ${isUrgent ? 'bg-red-100' : 'bg-opacity-20'}`}>
          <Icon className={`w-6 h-6 ${isUrgent ? 'text-red-600' : color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function QuickStats({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        title="My Tickets"
        value={stats.totalTickets || 0}
        icon={TicketCheck}
        color="bg-blue-500"
        trend="12% this week"
      />
      <StatCard
        title="Open & Assigned"
        value={stats.openTickets || 0}
        icon={Clock}
        color="bg-orange-500"
      />
      <StatCard
        title="In Progress"
        value={stats.inProgress || 0}
        icon={AlertTriangle}
        color="bg-yellow-500"
      />
      <StatCard
        title="Overdue"
        value={stats.overdue || 0}
        icon={AlertCircle}
        color="bg-red-500"
        isUrgent={stats.overdue > 0}
      />
      <StatCard
        title="Resolved"
        value={stats.resolved || 0}
        icon={CheckCircle}
        color="bg-green-500"
        trend="8% this week"
      />
    </div>
  );
}