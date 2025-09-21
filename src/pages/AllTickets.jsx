import React, { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Ticket } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Filter,
  Search,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  BarChart3,
  Zap,
  Target,
  Activity,
  Star,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Eye,
  MessageSquare,
  FileText,
  Timer,
  Archive,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import TicketList from "../components/tickets/TicketList";
import TicketView from "../components/tickets/TicketView";
import CreateTicketForm from "../components/tickets/CreateTicketForm";
import TicketFilters from "../components/tickets/TicketFilters";

export default function AllTickets() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [allOrgTickets, setAllOrgTickets] = useState([]);
  const [visibleTickets, setVisibleTickets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({});
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInsights, setShowInsights] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // Enterprise standard: 20 items per page
  const loadingRef = useRef(false);
  const lastLoadTime = useRef(0);

  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get("action");
  const ticketId = urlParams.get("ticket");

  const populateMemberProfiles = useCallback(async (org) => {
    if (!org) return [];

    const allMemberEmails = [
      ...new Set([org.owner_email, ...(org.members || [])]),
    ];

    if (
      org.member_profiles &&
      org.member_profiles.length >= allMemberEmails.length
    ) {
      const profileEmails = new Set(org.member_profiles.map((p) => p.email));
      if (allMemberEmails.every((email) => profileEmails.has(email))) {
        return org.member_profiles;
      }
    }

    const existingProfiles = org.member_profiles || [];
    const existingEmails = new Set(existingProfiles.map((p) => p.email));
    const missingEmails = allMemberEmails.filter(
      (email) => !existingEmails.has(email)
    );

    if (missingEmails.length === 0) {
      return existingProfiles;
    }

    const newProfiles = [];
    for (const email of missingEmails) {
      try {
        let userProfile = {
          email,
          full_name: email.split("@")[0],
          position: email === org.owner_email ? "Owner" : "Team Member",
          avatar_url: null,
          bio: null,
          phone: null,
        };

        const userList = await User.filter({ email });
        if (userList.length > 0) {
          const u = userList[0];
          userProfile.full_name = u.full_name || email.split("@")[0];
          userProfile.position =
            u.position || (email === org.owner_email ? "Owner" : "Team Member");
          userProfile.avatar_url = u.avatar_url;
          userProfile.bio = u.bio;
          userProfile.phone = u.phone;
        }
        newProfiles.push(userProfile);
      } catch (e) {
        console.error(`Failed to fetch profile for ${email}`, e);
      }
    }

    const mergedProfiles = [...existingProfiles, ...newProfiles];

    if (newProfiles.length > 0) {
      try {
        await Organization.update(org.id, { member_profiles: mergedProfiles });
      } catch (error) {
        console.error(
          "Error updating organization with member profiles:",
          error
        );
      }
    }

    return mergedProfiles;
  }, []);

  const loadData = useCallback(async () => {
    const now = Date.now();
    if (now - lastLoadTime.current < 2000) {
      return;
    }

    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsDataLoading(true);
    lastLoadTime.current = now;

    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.active_organization_id) {
        const [org, orgTickets] = await Promise.all([
          Organization.filter({ id: currentUser.active_organization_id }).then(
            (orgs) => orgs[0]
          ),
          Ticket.filter(
            { organization_id: currentUser.active_organization_id },
            "-created_date"
          ),
        ]);

        if (org) {
          setOrganization(org);
          const profiles = await populateMemberProfiles(org);
          setTeamMembers(profiles);
        }

        setAllOrgTickets(orgTickets);
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setIsDataLoading(false);
      loadingRef.current = false;
    }
  }, [populateMemberProfiles]);

  const loadTicketDetails = useCallback(async (id) => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsDataLoading(true);

    try {
      const ticket = await Ticket.filter({ id }).then((tickets) => tickets[0]);
      if (ticket) {
        setSelectedTicket(ticket);
      }
    } catch (error) {
      console.error("Error loading ticket details:", error);
    } finally {
      setIsDataLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);

    try {
      const currentUser = user || (await User.me());
      if (currentUser.active_organization_id) {
        const org = await Organization.filter({
          id: currentUser.active_organization_id,
        }).then((orgs) => orgs[0]);
        if (org) {
          const freshProfiles = await populateMemberProfiles(org);
          setTeamMembers(freshProfiles);
          setOrganization(org);
        }
      }
    } catch (error) {
      console.error("Error refreshing team members on ticket select:", error);
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      if (action === "create") {
        await loadData();
        setIsCreating(true);
        setSelectedTicket(null);
      } else if (ticketId) {
        await loadData();
        await loadTicketDetails(ticketId);
      } else {
        loadData();
      }
    };

    loadPage();
  }, [action, ticketId, loadData, loadTicketDetails]);

  useEffect(() => {
    if (!user || !allOrgTickets.length) {
      setVisibleTickets([]);
      return;
    }

    const baseVisible = allOrgTickets.filter((ticket) => {
      const isCreator = ticket.reporter_email === user.email;
      const isAssigned = ticket.assigned_to?.includes(user.email);
      const isGeneral = !ticket.department_id;
      const isInDepartment =
        user.department_id && ticket.department_id === user.department_id;
      const isEmailGenerated =
        ticket.source === "email" || ticket.tags?.includes("email-generated");

      // Email-generated tickets should be visible to all organization members
      return (
        isCreator ||
        isAssigned ||
        isGeneral ||
        isInDepartment ||
        isEmailGenerated
      );
    });

    setVisibleTickets(baseVisible);
  }, [allOrgTickets, user]);

  const handleTicketUpdate = useCallback(async () => {
    await loadData();
    if (selectedTicket?.id) {
      await loadTicketDetails(selectedTicket.id);
    }
  }, [selectedTicket?.id, loadData, loadTicketDetails]);

  // Check if a ticket should be archived (resolved/closed for 7+ days)
  const isTicketArchived = useCallback((ticket) => {
    if (!["resolved", "closed"].includes(ticket.status)) {
      return false;
    }

    // Check if ticket has been resolved/closed for 7+ days
    const statusChangeDate =
      ticket.resolved_date || ticket.closed_date || ticket.updated_at;
    if (!statusChangeDate) {
      return false;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return new Date(statusChangeDate) < sevenDaysAgo;
  }, []);

  // Separate tickets into active and archived
  const separateTicketsByArchiveStatus = useCallback(
    (tickets) => {
      const active = [];
      const archived = [];

      tickets.forEach((ticket) => {
        if (isTicketArchived(ticket)) {
          archived.push(ticket);
        } else {
          active.push(ticket);
        }
      });

      return { active, archived };
    },
    [isTicketArchived]
  );

  // Enterprise-standard ticket sorting function
  const sortTicketsEnterpriseStandard = useCallback((tickets) => {
    return [...tickets].sort((a, b) => {
      // Priority weights for sorting (higher number = higher priority)
      const priorityWeights = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
        normal: 2, // fallback for 'normal' priority
      };

      // Status weights (higher number = more active/important)
      const statusWeights = {
        open: 6,
        assigned: 5,
        in_progress: 7, // In progress should be highly visible
        pending: 4,
        resolved: 2,
        closed: 1,
      };

      // Get current date for overdue calculation
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if tickets are overdue
      const aOverdue =
        a.due_date &&
        new Date(a.due_date) < today &&
        !["resolved", "closed"].includes(a.status);
      const bOverdue =
        b.due_date &&
        new Date(b.due_date) < today &&
        !["resolved", "closed"].includes(b.status);

      // 1. Overdue tickets always come first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // 2. Sort by priority (urgent first)
      const aPriority = priorityWeights[a.priority] || 2;
      const bPriority = priorityWeights[b.priority] || 2;
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // 3. Sort by status (active statuses first)
      const aStatus = statusWeights[a.status] || 3;
      const bStatus = statusWeights[b.status] || 3;
      if (aStatus !== bStatus) {
        return bStatus - aStatus; // Higher status weight first
      }

      // 4. If same priority and status, sort by due date (earliest first)
      if (a.due_date && b.due_date) {
        const aDue = new Date(a.due_date);
        const bDue = new Date(b.due_date);
        if (aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue; // Earlier due date first
        }
      }

      // 5. Tickets with due dates come before those without
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;

      // 6. Finally, sort by creation date (newest first)
      const aCreated = new Date(a.created_date);
      const bCreated = new Date(b.created_date);
      return bCreated - aCreated; // Newer tickets first
    });
  }, []);

  const applyFilters = useCallback(
    (filterCriteria) => {
      let filtered = [...visibleTickets];

      // Separate tickets by archive status first
      const { active, archived } = separateTicketsByArchiveStatus(filtered);

      // Choose the appropriate ticket set based on active tab
      if (activeTab === "archive") {
        filtered = archived;
      } else {
        // For all other tabs, use active tickets only
        filtered = active;
      }

      // Apply search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (ticket) =>
            ticket.title.toLowerCase().includes(query) ||
            ticket.description?.toLowerCase().includes(query) ||
            ticket.id.toLowerCase().includes(query)
        );
      }

      if (activeTab === "assigned") {
        filtered = filtered.filter((ticket) => {
          const assignedTo = ticket.assigned_to;
          if (Array.isArray(assignedTo)) {
            return assignedTo.includes(user?.email);
          } else if (typeof assignedTo === "string") {
            return assignedTo === user?.email;
          }
          return false;
        });
      } else if (activeTab === "created") {
        filtered = filtered.filter(
          (ticket) => ticket.reporter_email === user?.email
        );
      } else if (activeTab === "overdue") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter((ticket) => {
          if (!ticket.due_date) return false;
          const dueDate = new Date(ticket.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return (
            dueDate < today && !["resolved", "closed"].includes(ticket.status)
          );
        });
      }

      if (filterCriteria.status && filterCriteria.status !== "all") {
        filtered = filtered.filter(
          (ticket) => ticket.status === filterCriteria.status
        );
      }
      if (filterCriteria.priority && filterCriteria.priority !== "all") {
        filtered = filtered.filter(
          (ticket) => ticket.priority === filterCriteria.priority
        );
      }

      // Apply enterprise-standard sorting
      const sorted = sortTicketsEnterpriseStandard(filtered);
      setFilteredTickets(sorted);
    },
    [
      visibleTickets,
      activeTab,
      user,
      searchQuery,
      sortTicketsEnterpriseStandard,
      separateTicketsByArchiveStatus,
    ]
  );

  // Enterprise-standard pagination logic
  const getPaginatedTickets = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, itemsPerPage]);

  const getTotalPages = useCallback(() => {
    return Math.ceil(filteredTickets.length / itemsPerPage);
  }, [filteredTickets.length, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of ticket list for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filters]);

  const paginatedTickets = getPaginatedTickets();
  const totalPages = getTotalPages();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  useEffect(() => {
    applyFilters(filters);
  }, [applyFilters, filters]);

  // Apply filters when search query changes
  useEffect(() => {
    applyFilters(filters);
  }, [searchQuery, applyFilters, filters]);

  // Calculate insights and statistics
  const getInsights = () => {
    if (!visibleTickets.length) {
      return {
        totalTickets: 0,
        openTickets: 0,
        resolvedTickets: 0,
        overdueTickets: 0,
        highPriorityTickets: 0,
        avgResolutionTime: 0,
        completionRate: 0,
        trendDirection: "stable",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openTickets = visibleTickets.filter(
      (t) => !["resolved", "closed"].includes(t.status)
    );
    const resolvedTickets = visibleTickets.filter((t) =>
      ["resolved", "closed"].includes(t.status)
    );
    const overdueTickets = visibleTickets.filter((ticket) => {
      if (!ticket.due_date) return false;
      const dueDate = new Date(ticket.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && !["resolved", "closed"].includes(ticket.status);
    });
    const highPriorityTickets = visibleTickets.filter(
      (t) => t.priority === "high"
    );

    const completionRate =
      visibleTickets.length > 0
        ? Math.round((resolvedTickets.length / visibleTickets.length) * 100)
        : 0;

    // Calculate trend (simplified - comparing recent vs older tickets)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentTickets = visibleTickets.filter(
      (t) => new Date(t.created_date) > oneWeekAgo
    );
    const trendDirection =
      recentTickets.length > visibleTickets.length / 2
        ? "up"
        : recentTickets.length < visibleTickets.length / 4
        ? "down"
        : "stable";

    return {
      totalTickets: visibleTickets.length,
      openTickets: openTickets.length,
      resolvedTickets: resolvedTickets.length,
      overdueTickets: overdueTickets.length,
      highPriorityTickets: highPriorityTickets.length,
      completionRate,
      trendDirection,
    };
  };

  const insights = getInsights();

  // Calculate counts for tabs
  const getTabCounts = () => {
    if (!user || !visibleTickets.length) {
      return { all: 0, assigned: 0, created: 0, overdue: 0, archive: 0 };
    }

    // Separate tickets by archive status
    const { active, archived } = separateTicketsByArchiveStatus(visibleTickets);

    const assignedTickets = active.filter((ticket) => {
      const assignedTo = ticket.assigned_to;
      if (Array.isArray(assignedTo)) {
        return assignedTo.includes(user.email);
      } else if (typeof assignedTo === "string") {
        return assignedTo === user.email;
      }
      return false;
    });

    const createdTickets = active.filter(
      (ticket) => ticket.reporter_email === user.email
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueTickets = active.filter((ticket) => {
      if (!ticket.due_date) return false;
      const dueDate = new Date(ticket.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && !["resolved", "closed"].includes(ticket.status);
    });

    return {
      all: active.length, // Only count active tickets for "All" tab
      assigned: assignedTickets.length,
      created: createdTickets.length,
      overdue: overdueTickets.length,
      archive: archived.length,
    };
  };

  const tabCounts = getTabCounts();

  const handleBackFromDetail = () => {
    setSelectedTicket(null);
    const newUrl = createPageUrl("AllTickets");
    window.history.pushState({}, "", newUrl);
  };

  const handleCreationSuccess = () => {
    setIsCreating(false);
    const newUrl = createPageUrl("AllTickets");
    window.history.pushState({}, "", newUrl);
    loadData();
  };

  const handleCreationCancel = () => {
    setIsCreating(false);
    const newUrl = createPageUrl("AllTickets");
    window.history.pushState({}, "", newUrl);
  };

  const handleCreateTicket = async () => {
    if (!teamMembers.length && user?.active_organization_id) {
      try {
        const org = await Organization.filter({
          id: user.active_organization_id,
        }).then((orgs) => orgs[0]);
        if (org) {
          const profiles = await populateMemberProfiles(org);
          setTeamMembers(profiles);
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading team members for ticket creation:", error);
      }
    }
    setIsCreating(true);
  };

  if (isDataLoading && !selectedTicket && !isCreating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="p-6 space-y-8">
          {/* Enhanced Loading Animation */}
          <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-64"></div>
                <div className="h-4 bg-slate-200 rounded-lg w-48"></div>
              </div>
              <div className="h-12 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl w-40"></div>
            </div>

            {/* Insights Cards Loading */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-8 w-8 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl"></div>
                    <div className="h-4 w-4 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-8 bg-slate-200 rounded-lg w-16 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                </div>
              ))}
            </div>

            {/* Tabs Loading */}
            <div className="bg-white rounded-2xl p-2 shadow-lg border border-slate-100">
              <div className="flex space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-slate-200 rounded-xl flex-1"
                  ></div>
                ))}
              </div>
            </div>

            {/* Tickets Loading */}
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-2 flex-1">
                      <div className="h-6 bg-slate-200 rounded-lg w-3/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
                      <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <TicketView
        ticket={selectedTicket}
        teamMembers={teamMembers}
        user={user}
        onBack={handleBackFromDetail}
        onUpdate={handleTicketUpdate}
      />
    );
  }

  if (isCreating) {
    return (
      <CreateTicketForm
        teamMembers={teamMembers}
        onCancel={handleCreationCancel}
        onSuccess={handleCreationSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-6 space-y-8">
        {/* Hero Header with Professional Enterprise Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-8 shadow-xl border border-slate-200">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-700/95 to-slate-800/95"></div>
          <div className="absolute inset-0 opacity-20">
            <div
              className="w-full h-full bg-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            ></div>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    Ticket Management
                  </h1>
                  <p className="text-blue-100 text-lg mt-2">
                    Your team's productivity command center
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-white/90">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">
                    {teamMembers.length} Team Members
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span className="font-medium">
                    {insights.totalTickets} Total Tickets
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleCreateTicket}
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-semibold px-8 py-4 rounded-2xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Ticket
              </Button>
            </div>
          </div>
        </div>

        {/* Professional Enterprise Insights Dashboard */}
        {showInsights && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white border border-slate-300 shadow-lg hover:shadow-xl transform hover:scale-102 transition-all duration-300 rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/15 backdrop-blur-sm rounded-lg">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {insights.trendDirection === "up" && (
                      <ArrowUp className="w-4 h-4 text-emerald-300" />
                    )}
                    {insights.trendDirection === "down" && (
                      <ArrowDown className="w-4 h-4 text-red-300" />
                    )}
                    <BarChart3 className="w-4 h-4 opacity-60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{insights.totalTickets}</p>
                  <p className="text-slate-200 font-medium">Total Tickets</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border border-emerald-300 shadow-lg hover:shadow-xl transform hover:scale-102 transition-all duration-300 rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/15 backdrop-blur-sm rounded-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <Badge className="bg-white/20 text-white border-0 font-semibold text-sm">
                      {insights.completionRate}%
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">
                    {insights.resolvedTickets}
                  </p>
                  <p className="text-emerald-100 font-medium">Resolved</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-600 to-red-600 text-white border border-amber-300 shadow-lg hover:shadow-xl transform hover:scale-102 transition-all duration-300 rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/15 backdrop-blur-sm rounded-lg">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  {insights.overdueTickets > 0 && (
                    <div
                      className="animate-pulse"
                      style={{ animationDuration: "3s" }}
                    >
                      <Badge className="bg-white/25 text-white border-0 font-semibold text-sm">
                        URGENT
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">
                    {insights.overdueTickets}
                  </p>
                  <p className="text-amber-100 font-medium">Overdue</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border border-blue-300 shadow-lg hover:shadow-xl transform hover:scale-102 transition-all duration-300 rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/15 backdrop-blur-sm rounded-lg">
                    <Zap className="w-6 h-6" />
                  </div>
                  <Star className="w-5 h-5 text-amber-300" />
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">
                    {insights.highPriorityTickets}
                  </p>
                  <p className="text-blue-100 font-medium">High Priority</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-6">
          {/* Search Input */}
          <div className="w-full">
            <label
              htmlFor="ticket-search"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Search Tickets
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="ticket-search"
                name="ticket-search"
                type="text"
                placeholder="Search by title, description, or ticket ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg leading-5 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                autoComplete="off"
                style={{ color: "#111827" }}
              />
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-slate-600">
                Searching for:{" "}
                <span className="font-medium text-slate-900">
                  "{searchQuery}"
                </span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="border-t border-slate-200 pt-4">
            <TicketFilters onFilterChange={handleFilterChange} />
          </div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-xl border-0">
            <TabsList className="bg-transparent w-full grid grid-cols-5 gap-2">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-slate-700 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-3 px-4 font-medium transition-all duration-200 hover:bg-slate-50"
              >
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">All</span>
                  <Badge className="bg-slate-200 text-slate-700 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">
                    {tabCounts.all}
                  </Badge>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="assigned"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-3 px-4 font-medium transition-all duration-200 hover:bg-slate-50"
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Mine</span>
                  <Badge className="bg-slate-200 text-slate-700 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">
                    {tabCounts.assigned}
                  </Badge>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="created"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-3 px-4 font-medium transition-all duration-200 hover:bg-slate-50"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Created</span>
                  <Badge className="bg-slate-200 text-slate-700 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">
                    {tabCounts.created}
                  </Badge>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="overdue"
                className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-3 px-4 font-medium transition-all duration-200 hover:bg-slate-50 ${
                  tabCounts.overdue > 0 ? "animate-pulse" : ""
                }`}
                style={{
                  animationDuration: tabCounts.overdue > 0 ? "3s" : undefined,
                }}
              >
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4" />
                  <span className="hidden sm:inline">Overdue</span>
                  <Badge
                    className={`text-xs ${
                      tabCounts.overdue > 0
                        ? "bg-red-600 text-white data-[state=active]:bg-white/25"
                        : "bg-slate-200 text-slate-700 data-[state=active]:bg-white/20 data-[state=active]:text-white"
                    }`}
                  >
                    {tabCounts.overdue}
                  </Badge>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="archive"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-700 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-3 px-4 font-medium transition-all duration-200 hover:bg-slate-50"
              >
                <div className="flex items-center space-x-2">
                  <Archive className="w-4 h-4" />
                  <span className="hidden sm:inline">Archive</span>
                  <Badge className="bg-slate-200 text-slate-700 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">
                    {tabCounts.archive}
                  </Badge>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {/* Clean Enterprise Pagination Header */}
            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                {/* Left: Ticket Count */}
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {activeTab === "all" && "All Tickets"}
                    {activeTab === "assigned" && "My Tickets"}
                    {activeTab === "created" && "Created Tickets"}
                    {activeTab === "overdue" && "Overdue Tickets"}
                    {activeTab === "archive" && "Archived Tickets"}
                  </h2>
                  <Badge className="bg-slate-100 text-slate-700 font-medium px-3 py-1">
                    {filteredTickets.length}
                  </Badge>
                </div>

                {/* Right: Clean Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 h-8 text-slate-600 hover:text-slate-900"
                    >
                      &lt;
                    </Button>

                    {/* Smart page number display */}
                    {(() => {
                      const pages = [];
                      const showEllipsis = totalPages > 7;

                      if (!showEllipsis) {
                        // Show all pages if 7 or fewer
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Smart pagination with ellipsis
                        if (currentPage <= 4) {
                          // Show first 5 pages + ellipsis + last page
                          pages.push(1, 2, 3, 4, 5, "...", totalPages);
                        } else if (currentPage >= totalPages - 3) {
                          // Show first page + ellipsis + last 5 pages
                          pages.push(
                            1,
                            "...",
                            totalPages - 4,
                            totalPages - 3,
                            totalPages - 2,
                            totalPages - 1,
                            totalPages
                          );
                        } else {
                          // Show first + ellipsis + current-1, current, current+1 + ellipsis + last
                          pages.push(
                            1,
                            "...",
                            currentPage - 1,
                            currentPage,
                            currentPage + 1,
                            "...",
                            totalPages
                          );
                        }
                      }

                      return pages.map((page, index) => {
                        if (page === "...") {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              className="px-2 py-1 text-slate-400"
                            >
                              ...
                            </span>
                          );
                        }

                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 h-8 min-w-[32px] ${
                              currentPage === page
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      });
                    })()}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 h-8 text-slate-600 hover:text-slate-900"
                    >
                      &gt;
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Paginated Ticket List */}
            <TicketList
              tickets={paginatedTickets}
              teamMembers={teamMembers}
              onTicketSelect={handleSelectTicket}
            />

            {/* Bottom Pagination (for long lists) */}
            {totalPages > 1 && paginatedTickets.length > 10 && (
              <div className="mt-8 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="px-4 py-2 text-sm text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
