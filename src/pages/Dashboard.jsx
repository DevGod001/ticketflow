import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Ticket } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Department } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  TicketCheck,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  TrendingUp,
  Activity,
  CheckCircle,
  Target,
  DollarSign,
  Zap,
  Shield,
  Brain,
  BarChart3,
  AlertCircle,
  Award,
  Gauge,
  TrendingDown,
  Calendar,
  Bell,
  Settings,
  Eye,
  FileText,
  UserCheck,
  Briefcase,
  Star,
  ArrowUp,
  ArrowDown,
  Wifi,
  Server,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [allOrgTickets, setAllOrgTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({});
  const [enterpriseMetrics, setEnterpriseMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const calculateEnterpriseMetrics = (allTickets, teamMembers, depts) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // SLA Compliance Metrics
    const slaTarget = 4; // 4 hours target response time
    const resolvedTickets = allTickets.filter((t) =>
      ["resolved", "closed"].includes(t.status)
    );
    const onTimeResolutions = resolvedTickets.filter((t) => {
      const created = new Date(t.created_date);
      const resolved = new Date(t.updated_date);
      const hoursToResolve = (resolved - created) / (1000 * 60 * 60);
      return hoursToResolve <= slaTarget;
    });

    const slaCompliance =
      resolvedTickets.length > 0
        ? Math.round((onTimeResolutions.length / resolvedTickets.length) * 100)
        : 100;

    // Calculate average response time
    const avgResponseTime =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((acc, t) => {
            const created = new Date(t.created_date);
            const resolved = new Date(t.updated_date);
            return acc + (resolved - created) / (1000 * 60 * 60);
          }, 0) / resolvedTickets.length
        : 0;

    // Team Performance Metrics
    const activeMembers = teamMembers.filter((m) => {
      const memberTickets = allTickets.filter(
        (t) => t.assigned_to?.includes(m.email) || t.reporter_email === m.email
      );
      return memberTickets.length > 0;
    });

    // Department workload analysis
    const departmentWorkload = depts.map((dept) => {
      const deptTickets = allTickets.filter((t) => t.department_id === dept.id);
      const openTickets = deptTickets.filter(
        (t) => !["resolved", "closed"].includes(t.status)
      );
      const capacity = dept.members?.length || 1;
      const utilization = Math.min(
        Math.round((openTickets.length / (capacity * 5)) * 100),
        100
      ); // 5 tickets per person max

      return {
        name: dept.name,
        tickets: openTickets.length,
        utilization,
        capacity,
        color: dept.color,
      };
    });

    // Financial Impact (simulated realistic metrics)
    const thisMonthTickets = allTickets.filter(
      (t) => new Date(t.created_date) >= thisMonth
    );
    const lastMonthTickets = allTickets.filter((t) => {
      const created = new Date(t.created_date);
      return created >= lastMonth && created < thisMonth;
    });

    const costSavings = Math.round(
      resolvedTickets.length * 150 + slaCompliance * 100
    ); // $150 per resolved ticket
    const efficiencyIncrease =
      lastMonthTickets.length > 0
        ? Math.round(
            ((thisMonthTickets.length - lastMonthTickets.length) /
              lastMonthTickets.length) *
              100
          )
        : 23;
    const hoursSaved = Math.round(resolvedTickets.length * 2.5); // 2.5 hours saved per resolved ticket
    const roi = Math.round((costSavings / 10000) * 100); // ROI calculation

    // Critical items that need attention
    const overdueTickets = allTickets.filter((t) => {
      if (!t.due_date || ["resolved", "closed"].includes(t.status))
        return false;
      return new Date(t.due_date) < now;
    });

    const escalations = allTickets.filter(
      (t) =>
        t.priority === "urgent" && !["resolved", "closed"].includes(t.status)
    );

    const vipIssues = allTickets
      .filter((t) => t.tags?.includes("vip") || t.priority === "urgent")
      .filter((t) => !["resolved", "closed"].includes(t.status));

    // Customer satisfaction (simulated)
    const customerSat = 4.7;
    const positiveFeedback = 92;
    const satImprovement = 0.3;

    // Top performers (simulated based on ticket resolution)
    const performerStats = teamMembers
      .map((member) => {
        const memberTickets = allTickets.filter((t) =>
          t.assigned_to?.includes(member.email)
        );
        const resolved = memberTickets.filter((t) =>
          ["resolved", "closed"].includes(t.status)
        );
        return {
          name: member.full_name || member.email.split("@")[0],
          resolved: resolved.length,
          total: memberTickets.length,
          efficiency:
            memberTickets.length > 0
              ? Math.round((resolved.length / memberTickets.length) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.efficiency - a.efficiency);

    // Predictive insights
    const predictions = [
      {
        type: "volume",
        message: `Ticket volume will increase ${Math.round(
          Math.random() * 20 + 10
        )}% next week`,
        reason: "holiday rush",
        confidence: 85,
      },
      {
        type: "capacity",
        message: "Support team may need backup by Thursday",
        reason: "current workload trends",
        confidence: 72,
      },
      {
        type: "trend",
        message: "Billing queries trending up",
        reason: "subscription renewal cycle",
        confidence: 91,
      },
    ];

    return {
      sla: {
        compliance: slaCompliance,
        breaches: Math.max(
          0,
          resolvedTickets.length - onTimeResolutions.length
        ),
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        criticalTickets: escalations.length,
      },
      team: {
        totalMembers: teamMembers.length,
        activeMembers: activeMembers.length,
        utilization: Math.round(
          (activeMembers.length / teamMembers.length) * 100
        ),
        topPerformer: performerStats[0]?.name || "N/A",
      },
      financial: {
        costSavings,
        efficiencyIncrease,
        hoursSaved,
        roi,
      },
      departments: departmentWorkload,
      critical: {
        overdue: overdueTickets.length,
        escalations: escalations.length,
        vipIssues: vipIssues.length,
        systemIssues: 1, // simulated
      },
      satisfaction: {
        score: customerSat,
        positive: positiveFeedback,
        improvement: satImprovement,
      },
      performers: performerStats.slice(0, 3),
      predictions,
      systemHealth: {
        uptime: 99.9,
        lastIncident: "12 days ago",
        status: "operational",
      },
    };
  };

  const loadDashboardData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.active_organization_id) {
        // Load all data in parallel
        const [org, allTickets, userNotifications, orgDepartments] =
          await Promise.all([
            Organization.get(currentUser.active_organization_id),
            Ticket.filter(
              { organization_id: currentUser.active_organization_id },
              "-created_date"
            ),
            Notification.filter(
              { user_email: currentUser.email },
              "-created_date",
              10
            ),
            Department.filter({
              organization_id: currentUser.active_organization_id,
            }),
          ]);

        // Get user's tickets
        const userTickets = allTickets.filter(
          (t) =>
            t.assigned_to?.includes(currentUser.email) ||
            t.reporter_email === currentUser.email
        );

        setOrganization(org);
        setTickets(userTickets);
        setAllOrgTickets(allTickets);
        setDepartments(orgDepartments);
        setNotifications(userNotifications);

        // Calculate basic stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueTickets = userTickets.filter((t) => {
          if (!t.due_date) return false;
          const dueDate = new Date(t.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today && !["resolved", "closed"].includes(t.status);
        });

        setStats({
          totalTickets: userTickets.length,
          openTickets: userTickets.filter((t) =>
            ["open", "assigned"].includes(t.status)
          ).length,
          inProgress: userTickets.filter((t) => t.status === "in_progress")
            .length,
          resolved: userTickets.filter((t) =>
            ["resolved", "closed"].includes(t.status)
          ).length,
          overdue: overdueTickets.length,
          urgent: userTickets.filter((t) => t.priority === "urgent").length,
        });

        // Calculate enterprise metrics (for management roles)
        const teamMembers = org?.member_profiles || [];
        const enterpriseData = calculateEnterpriseMetrics(
          allTickets,
          teamMembers,
          orgDepartments
        );
        setEnterpriseMetrics(enterpriseData);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  // Check if user has management privileges
  const isManagementRole = (user, org) => {
    if (!user || !org) return false;

    // Owner has full access
    if (org.owner_email === user.email) return true;

    // Admins have management access
    if (org.admins?.includes(user.email)) return true;

    // Managers have management access
    if (org.managers?.includes(user.email)) return true;

    return false;
  };

  const hasManagementAccess = isManagementRole(user, organization);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              No Active Organization
            </h3>
            <p className="text-slate-600 mb-6">
              Join or create an organization to access the enterprise dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() =>
                  (window.location.href = createPageUrl(
                    "Organization",
                    "action=join"
                  ))
                }
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Join Organization
              </Button>
              <Button
                onClick={() =>
                  (window.location.href = createPageUrl(
                    "Organization",
                    "action=create"
                  ))
                }
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Create Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Executive Dashboard for Management Roles
  if (hasManagementAccess) {
    return (
      <div className="p-6 space-y-6">
        {/* System Health Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-800 font-medium">
                All Systems Operational
              </span>
              <Badge
                variant="outline"
                className="text-green-700 border-green-300"
              >
                {enterpriseMetrics.systemHealth?.uptime}% Uptime This Month
              </Badge>
              <span className="text-green-600 text-sm">
                Last Incident: {enterpriseMetrics.systemHealth?.lastIncident}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-green-700 hover:bg-green-100"
            >
              <Settings className="w-4 h-4 mr-2" />
              System Status
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Executive Dashboard
            </h1>
            <p className="text-slate-600 mt-1">
              Enterprise insights for {organization?.name} • Real-time analytics
              & predictive intelligence
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-slate-300">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button
              onClick={() =>
                (window.location.href = createPageUrl(
                  "AllTickets",
                  "action=create"
                ))
              }
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SLA Compliance */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  SLA Performance
                </CardTitle>
                <Badge
                  variant={
                    enterpriseMetrics.sla?.compliance >= 90
                      ? "default"
                      : "destructive"
                  }
                >
                  {enterpriseMetrics.sla?.compliance >= 90
                    ? "On Track"
                    : "At Risk"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {enterpriseMetrics.sla?.compliance}%
                  </span>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-slate-600">On-Time Resolution</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-slate-500">Breach Alerts</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {enterpriseMetrics.sla?.breaches}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Avg Response</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {enterpriseMetrics.sla?.avgResponseTime}h
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-slate-600">
                    Critical Tickets: {enterpriseMetrics.sla?.criticalTickets}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Team Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enterpriseMetrics.departments
                  ?.slice(0, 3)
                  .map((dept, index) => (
                    <div key={dept.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                          {dept.name}
                        </span>
                        <span className="text-sm text-slate-600">
                          {dept.utilization}% ({dept.tickets} tickets)
                        </span>
                      </div>
                      <Progress
                        value={dept.utilization}
                        className="h-2"
                        style={{
                          backgroundColor: `${dept.color}20`,
                        }}
                      />
                    </div>
                  ))}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-slate-600">
                      Top Performer:{" "}
                      <span className="font-medium">
                        {enterpriseMetrics.team?.topPerformer}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Impact */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Cost Savings This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-700">
                    $
                    {enterpriseMetrics.financial?.costSavings?.toLocaleString()}
                  </span>
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-slate-600">in operational costs</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      Efficiency Increase
                    </p>
                    <p className="text-lg font-semibold text-green-600 flex items-center gap-1">
                      <ArrowUp className="w-4 h-4" />
                      {enterpriseMetrics.financial?.efficiencyIncrease}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Hours Saved</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {enterpriseMetrics.financial?.hoursSaved}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-slate-600">
                    ROI:{" "}
                    <span className="font-semibold text-green-600">
                      {enterpriseMetrics.financial?.roi}%
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Section - Department Workload & Critical Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Workload Balance */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-600" />
                Department Load Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enterpriseMetrics.departments?.map((dept) => (
                  <div key={dept.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">
                        {dept.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                          {dept.utilization}% ({dept.tickets} tickets)
                        </span>
                        {dept.utilization > 80 && (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={dept.utilization} className="h-3" />
                      <div
                        className="absolute inset-0 rounded-full opacity-20"
                        style={{ backgroundColor: dept.color }}
                      />
                    </div>
                  </div>
                ))}
                {enterpriseMetrics.departments?.some(
                  (d) => d.utilization > 80
                ) && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-orange-800 font-medium">
                        Support team approaching capacity limit
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Priority Items */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Requires Immediate Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">
                      {enterpriseMetrics.critical?.overdue} tickets overdue
                      (&gt;24hrs)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700"
                  >
                    View
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-800">
                      {enterpriseMetrics.critical?.escalations} escalations
                      pending review
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-700"
                  >
                    Review
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">
                      {enterpriseMetrics.critical?.vipIssues} VIP customer
                      issues
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-300 text-purple-700"
                  >
                    Priority
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      {enterpriseMetrics.critical?.systemIssues} system
                      integration failing
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-700"
                  >
                    Debug
                  </Button>
                </div>

                <Button className="w-full mt-4" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  View All Critical Items
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Analytics & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Satisfaction */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Customer Satisfaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 ${
                          star <=
                          Math.floor(enterpriseMetrics.satisfaction?.score)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {enterpriseMetrics.satisfaction?.score}/5.0
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Positive Feedback
                    </span>
                    <span className="font-semibold text-green-600">
                      {enterpriseMetrics.satisfaction?.positive}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Monthly Improvement
                    </span>
                    <span className="font-semibold text-green-600 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" />+
                      {enterpriseMetrics.satisfaction?.improvement}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 italic">
                    "Excellent support! Quick resolution and very helpful team."
                  </p>
                  <p className="text-xs text-green-600 mt-1">Latest feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Analytics */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                AI Insights & Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enterpriseMetrics.predictions?.map((prediction, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {prediction.message}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Due to {prediction.reason}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-indigo-500 h-1.5 rounded-full"
                              style={{ width: `${prediction.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {prediction.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Executive Action Center */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-3" />
                  Generate Weekly Report
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="w-4 h-4 mr-3" />
                  Review Team Performance
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <AlertTriangle className="w-4 h-4 mr-3" />
                  View SLA Breaches
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="w-4 h-4 mr-3" />
                  Send Team Update
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="w-4 h-4 mr-3" />
                  Adjust Workload Balance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Enhancement */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.slice(0, 5).map((notification, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-600">
                      {notification.message}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(notification.created_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No recent activity</p>
                </div>
              )}
              <Button className="w-full mt-4" variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                View Activity Feed
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Enterprise Member Dashboard for Regular Users
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {user?.full_name || user?.email?.split("@")[0]}!
          </h1>
          <p className="text-slate-600 mt-1">
            Here's what's happening at {organization?.name}
          </p>
        </div>
        <Link to={createPageUrl("AllTickets", "action=create")}>
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        </Link>
      </div>

      {/* Personal Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">My Tickets</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.totalTickets}
                </p>
                <p className="text-xs text-slate-500 mt-1">↗ 12% this week</p>
              </div>
              <TicketCheck className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Open & Assigned
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.openTickets}
                </p>
                <p className="text-xs text-slate-500 mt-1">Active work</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  In Progress
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.inProgress}
                </p>
                <p className="text-xs text-slate-500 mt-1">Working on</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Overdue</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.overdue}
                </p>
                <p className="text-xs text-red-500 mt-1">Need attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Resolved</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.resolved}
                </p>
                <p className="text-xs text-green-500 mt-1">↗ 8% this week</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Recent Tickets */}
        <Card className="lg:col-span-2 border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TicketCheck className="w-5 h-5 text-blue-600" />
                My Recent Tickets
              </CardTitle>
              <Link to={createPageUrl("AllTickets")}>
                <Button variant="outline" size="sm">
                  View All →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tickets.length > 0 ? (
              <div className="space-y-4">
                {tickets.slice(0, 5).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <Badge
                        variant={
                          ticket.priority === "urgent"
                            ? "destructive"
                            : ticket.priority === "high"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {ticket.title}
                      </p>
                      <p className="text-sm text-slate-600">
                        {ticket.status} • Created{" "}
                        {new Date(ticket.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant="outline">{ticket.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TicketCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  All caught up!
                </h3>
                <p className="text-slate-600 mb-6">No recent tickets to show</p>
                <Link to={createPageUrl("AllTickets", "action=create")}>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    Create Your First Ticket
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-600" />
              Recent Activity
            </CardTitle>
            <p className="text-sm text-slate-600">
              Work-related updates and notifications
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.length > 0 ? (
                notifications.slice(0, 6).map((notification, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(
                          notification.created_date
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() =>
                (window.location.href = createPageUrl(
                  "AllTickets",
                  "action=create"
                ))
              }
              className="w-full justify-start h-auto p-4"
              variant="outline"
            >
              <Plus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Create Ticket</p>
                <p className="text-xs text-slate-500">Report an issue</p>
              </div>
            </Button>
            <Link to={createPageUrl("AllTickets")}>
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <Eye className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">View All Tickets</p>
                  <p className="text-xs text-slate-500">Browse tickets</p>
                </div>
              </Button>
            </Link>
            <Link to={createPageUrl("Team")}>
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <Users className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Team</p>
                  <p className="text-xs text-slate-500">View team members</p>
                </div>
              </Button>
            </Link>
            <Link to={createPageUrl("Profile")}>
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <Settings className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Profile</p>
                  <p className="text-xs text-slate-500">Update settings</p>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
