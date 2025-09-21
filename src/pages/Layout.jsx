import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Ticket } from "@/api/entities";
import { DirectMessage } from "@/api/entities";
import { JoinRequest } from "@/api/entities";
import { Organization } from "@/api/entities";
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  MessageCircle,
  Building2,
  Bell,
  Settings,
  User as UserIcon,
  LogOut,
  Users,
  Hash,
  Mail,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  { title: "Dashboard", url: "Dashboard", icon: LayoutDashboard },
  { title: "Tickets", url: "AllTickets", icon: TicketIcon },
  { title: "Email-to-Ticket", url: "email-to-ticket", icon: Mail },
  { title: "Messages", url: "Messages", icon: MessageCircle },
  { title: "Channels", url: "Channels", icon: Hash },
  { title: "Organization", url: "Organization", icon: Building2 },
  { title: "Team", url: "Team", icon: Users },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTicketsCount, setActiveTicketsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [joinRequestsCount, setJoinRequestsCount] = useState(0);

  const isLoadingData = useRef(false);
  const lastLoadTime = useRef(0);

  useEffect(() => {
    const checkLoginAndRedirect = async () => {
      try {
        await User.me(); // Check if user is authenticated

        const hasRedirected = sessionStorage.getItem("loginRedirectDone");

        if (!hasRedirected) {
          sessionStorage.setItem("loginRedirectDone", "true");

          const dashboardUrl = createPageUrl("Dashboard");
          // Use window.location.pathname to get the path without the domain
          if (window.location.pathname !== dashboardUrl) {
            navigate(dashboardUrl, { replace: true });
          }
        }
      } catch (error) {
        // User is not logged in, clear the flag for the next login
        sessionStorage.removeItem("loginRedirectDone");
      }
    };

    checkLoginAndRedirect();
  }, [navigate]);

  const loadData = useCallback(async () => {
    const now = Date.now();
    // Reasonable throttling - load every 30 seconds for responsive notifications
    if (isLoadingData.current || now - lastLoadTime.current < 30000) {
      return;
    }

    isLoadingData.current = true;
    lastLoadTime.current = now;

    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (!currentUser?.email) {
        setUnreadCount(0);
        setActiveTicketsCount(0);
        setUnreadMessagesCount(0);
        setJoinRequestsCount(0);
        isLoadingData.current = false;
        return;
      }

      // Load minimal data for sidebar badges only
      console.log("Loading notifications for user:", currentUser.email);

      // Check what notifications exist in storage
      const allStoredNotifications = JSON.parse(
        localStorage.getItem("ticketflow_notifications") || "{}"
      );
      console.log("All notifications in storage:", allStoredNotifications);

      const promises = [
        Notification.filter(
          { user_email: currentUser.email, read: false },
          "-created_date",
          10
        ),
        DirectMessage.filter(
          { to_email: currentUser.email, read: false },
          null,
          10
        ),
      ];

      let ticketPromise = Promise.resolve([]);
      let joinRequestPromise = Promise.resolve([]);

      if (currentUser.active_organization_id) {
        ticketPromise = Ticket.filter(
          { organization_id: currentUser.active_organization_id },
          null,
          100
        ).then((tickets) => {
          // Filter tickets assigned to current user that are not resolved
          return tickets.filter((ticket) => {
            const isAssigned = Array.isArray(ticket.assigned_to)
              ? ticket.assigned_to.includes(currentUser.email)
              : ticket.assigned_to === currentUser.email;
            const isActive = !["resolved", "closed"].includes(ticket.status);
            return isAssigned && isActive;
          });
        });

        joinRequestPromise = (async () => {
          try {
            const org = await Organization.get(
              currentUser.active_organization_id
            );
            if (org) {
              const canManageRequests =
                org.owner_email === currentUser.email ||
                org.admins?.includes(currentUser.email);
              if (canManageRequests) {
                return JoinRequest.filter({
                  organization_id: currentUser.active_organization_id,
                  status: "pending",
                });
              }
            }
          } catch (orgError) {
            console.warn(
              "Failed to load organization for join requests check:",
              orgError
            );
          }
          return [];
        })();
      }

      promises.push(ticketPromise);
      promises.push(joinRequestPromise);

      const results = await Promise.allSettled(promises);

      if (results[0].status === "fulfilled") {
        const userNotifications = results[0].value;
        console.log("Filtered notifications for user:", userNotifications);
        console.log("Notification count:", userNotifications.length);
        setNotifications(userNotifications);
        setUnreadCount(userNotifications.length);
      } else {
        console.log("Notifications not loaded:", results[0].reason);
        setNotifications([]);
        setUnreadCount(0);
      }

      if (results[1].status === "fulfilled") {
        setUnreadMessagesCount(results[1].value.length);
      } else {
        console.log("Unread messages not loaded:", results[1].reason);
        setUnreadMessagesCount(0);
      }

      if (results[2].status === "fulfilled") {
        setActiveTicketsCount(results[2].value.length);
      } else {
        console.log("Active tickets not loaded:", results[2].reason);
        setActiveTicketsCount(0);
      }

      if (results[3].status === "fulfilled") {
        setJoinRequestsCount(results[3].value.length);
      } else {
        console.log("Join requests not loaded:", results[3].reason);
        setJoinRequestsCount(0);
      }
    } catch (error) {
      console.error("Error loading layout data:", error);
      setUser(null);
      setUnreadCount(0);
      setActiveTicketsCount(0);
      setUnreadMessagesCount(0);
      setJoinRequestsCount(0);
    } finally {
      isLoadingData.current = false;
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 60000); // Check every minute for responsive notifications
    return () => clearInterval(interval);
  }, [loadData]);

  // Expose refresh function globally for other components to trigger
  useEffect(() => {
    window.refreshNotifications = () => {
      lastLoadTime.current = 0; // Reset throttle
      loadData();
    };

    return () => {
      delete window.refreshNotifications;
    };
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await User.logout();
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
      setActiveTicketsCount(0);
      setUnreadMessagesCount(0);
      setJoinRequestsCount(0);
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.reload();
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar className="border-r border-slate-200/80 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-slate-200/80 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <TicketIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900">TicketFlow</h2>
                <p className="text-xs text-slate-500">Enterprise Ticketing</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-3 py-2 text-slate-500">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`transition-all duration-200 rounded-xl mb-1 hover:bg-blue-50 hover:text-blue-700 ${
                          location.pathname === createPageUrl(item.url)
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border-l-4 border-blue-500"
                            : ""
                        }`}
                      >
                        <Link
                          to={createPageUrl(item.url)}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                          {item.title === "Tickets" &&
                            activeTicketsCount > 0 && (
                              <Badge className="ml-auto bg-red-500/90 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                                {activeTicketsCount}
                              </Badge>
                            )}
                          {item.title === "Messages" &&
                            unreadMessagesCount > 0 && (
                              <Badge className="ml-auto bg-blue-500/90 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                                {unreadMessagesCount > 9
                                  ? "9+"
                                  : unreadMessagesCount}
                              </Badge>
                            )}
                          {item.title === "Organization" &&
                            joinRequestsCount > 0 && (
                              <Badge className="ml-auto bg-orange-500/90 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                                {joinRequestsCount}
                              </Badge>
                            )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* COMPLETELY EMPTY FOOTER - No profile content */}
          <SidebarFooter className="border-t border-slate-200/80 h-[76px]">
            {/* Intentionally empty - all user actions moved to header */}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-slate-200/80 h-[76px]">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden p-2 rounded-lg hover:bg-slate-100" />
              <h1 className="text-2xl font-bold hidden md:block text-slate-900">
                {currentPageName}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Notifications")}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full hover:bg-slate-100"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500/90 text-white text-xs">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="w-9 h-9 cursor-pointer hover:ring-2 hover:ring-blue-500 ring-offset-2 transition-all duration-200">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">
                        {user.full_name?.charAt(0) || user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-2 py-2">
                      <p className="font-semibold text-sm truncate text-slate-900">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs truncate text-slate-500">
                        {user.position || "Team Member"}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl("Profile")}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl("Settings")}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-500 focus:text-red-500 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
