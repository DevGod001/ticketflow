import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { JoinRequest } from "@/api/entities";
import { Department } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Plus,
  Users,
  UserPlus,
  CheckCircle,
  Crown,
} from "lucide-react";

import CreateOrgForm from "../components/organization/CreateOrgForm";
import JoinOrgForm from "../components/organization/JoinOrgForm";
import OrgManagement from "../components/organization/OrgManagement";
import JoinRequests from "../components/organization/JoinRequests";

export default function OrganizationPage() {
  const [user, setUser] = useState(null);
  const [userOrgs, setUserOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [canManageRequests, setCanManageRequests] = useState(false);

  // Check URL params for actions
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get("action");

  useEffect(() => {
    const currentUrlParams = new URLSearchParams(window.location.search);
    const currentAction = currentUrlParams.get("action");
    const currentTab = currentUrlParams.get("tab");

    if (currentAction === "create") {
      setActiveTab("create");
    } else if (currentAction === "join") {
      setActiveTab("join");
    }

    if (currentTab === "requests") {
      setActiveTab("requests");
    }

    loadOrganizationData();
  }, [action]);

  const loadOrganizationData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setCanManageRequests(false);

      // Ensure user has required fields
      if (!currentUser.verified_organizations) {
        currentUser.verified_organizations = [];
      }

      if (currentUser.verified_organizations?.length > 0) {
        try {
          const orgs = await Organization.filter({
            id: { $in: currentUser.verified_organizations },
          });
          setUserOrgs(orgs || []);

          if (currentUser.active_organization_id) {
            const active = orgs?.find(
              (org) => org.id === currentUser.active_organization_id
            );
            setActiveOrg(active || null);

            const canManage =
              active &&
              (active.owner_email === currentUser.email ||
                active.admins?.includes(currentUser.email));
            setCanManageRequests(canManage);

            if (canManage) {
              try {
                const requests = await JoinRequest.filter(
                  {
                    organization_id: active.organization_id,
                    status: "pending",
                  },
                  "-created_date"
                );
                setJoinRequests(requests || []);
              } catch (requestError) {
                console.error("Error loading join requests:", requestError);
                setJoinRequests([]);
              }
            } else {
              setJoinRequests([]);
            }
          } else {
            setActiveOrg(null);
            setJoinRequests([]);
          }
        } catch (orgError) {
          console.error("Error loading organizations:", orgError);
          setUserOrgs([]);
          setActiveOrg(null);
          setJoinRequests([]);
        }
      } else {
        setUserOrgs([]);
        setActiveOrg(null);
        setJoinRequests([]);
      }
    } catch (error) {
      console.error("Error loading organization data:", error);
      // Set default values to prevent crashes
      setUser(null);
      setUserOrgs([]);
      setActiveOrg(null);
      setJoinRequests([]);
      setCanManageRequests(false);
    }
    setIsLoading(false);
  };

  const handleOrgCreated = async (newOrg) => {
    await loadOrganizationData();
    setActiveTab("overview");
  };

  const handleJoinSuccess = async () => {
    await loadOrganizationData();
    setActiveTab("overview");
  };

  const switchActiveOrg = async (orgId) => {
    try {
      await User.updateMyUserData({ active_organization_id: orgId });
      await loadOrganizationData();
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Organizations
            </h1>
            <p className="text-sm text-slate-600 mt-1 md:hidden">
              Manage your organizations
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setActiveTab("join")}
            className="border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Join Organization
          </Button>
          <Button
            onClick={() => setActiveTab("create")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Organization
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="bg-white border border-slate-200 shadow-sm w-full min-w-max">
            {userOrgs.length > 0 && (
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs md:text-sm whitespace-nowrap"
              >
                Overview
              </TabsTrigger>
            )}
            {activeOrg && canManageRequests && (
              <TabsTrigger
                value="manage"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs md:text-sm whitespace-nowrap"
              >
                Manage
              </TabsTrigger>
            )}
            {canManageRequests && (
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs md:text-sm whitespace-nowrap"
              >
                Join Requests{" "}
                {joinRequests.length > 0 && `(${joinRequests.length})`}
              </TabsTrigger>
            )}
            <TabsTrigger
              value="create"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs md:text-sm whitespace-nowrap"
            >
              Create New
            </TabsTrigger>
            <TabsTrigger
              value="join"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs md:text-sm whitespace-nowrap"
            >
              Join Existing
            </TabsTrigger>
          </TabsList>
        </div>

        {userOrgs.length === 0 && activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto mt-8 md:mt-12">
            <Card
              className="border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("create")}
            >
              <CardContent className="p-6 md:p-8 text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Building2 className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2 md:mb-3">
                  Create Organization
                </h3>
                <p className="text-slate-600 mb-4 md:mb-6 text-sm md:text-base">
                  Start your team's journey by creating a new organization
                </p>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card
              className="border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("join")}
            >
              <CardContent className="p-6 md:p-8 text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2 md:mb-3">
                  Join Organization
                </h3>
                <p className="text-slate-600 mb-4 md:mb-6 text-sm md:text-base">
                  Join an existing team using their organization ID
                </p>
                <Button
                  variant="outline"
                  className="w-full border-green-200 text-green-600 hover:bg-green-50"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Now
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {userOrgs.length > 0 && (
          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {userOrgs.map((org) => (
                <Card
                  key={org.id}
                  className={`border-none shadow-lg hover:shadow-xl transition-all duration-300 ${
                    activeOrg?.id === org.id
                      ? "ring-2 ring-blue-500 bg-blue-50/30"
                      : ""
                  }`}
                >
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base md:text-lg truncate">
                            {org.name}
                          </CardTitle>
                          <p className="text-xs md:text-sm text-slate-500 truncate">
                            ID: {org.organization_id}
                          </p>
                        </div>
                      </div>
                      {org.owner_email === user.email && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 text-xs flex-shrink-0"
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">Owner</span>
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <p className="text-slate-600 mb-4 text-sm md:text-base line-clamp-2">
                      {org.description}
                    </p>
                    <div className="flex gap-2">
                      {activeOrg?.id === org.id ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => switchActiveOrg(org.id)}
                          className="text-xs"
                        >
                          Make Active
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {activeOrg && canManageRequests && (
          <TabsContent value="manage">
            <OrgManagement
              organization={activeOrg}
              onUpdate={loadOrganizationData}
            />
          </TabsContent>
        )}

        {canManageRequests && (
          <TabsContent value="requests">
            <JoinRequests
              requests={joinRequests}
              organization={activeOrg}
              onUpdate={loadOrganizationData}
            />
          </TabsContent>
        )}

        <TabsContent value="create">
          <CreateOrgForm onSuccess={handleOrgCreated} />
        </TabsContent>

        <TabsContent value="join">
          <JoinOrgForm onSuccess={handleJoinSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
