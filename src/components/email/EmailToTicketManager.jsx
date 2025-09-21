import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Ticket,
  Users,
  Zap,
  Copy,
  TestTube,
} from "lucide-react";
import { EmailToTicketService } from "@/services/emailToTicketService";
import { Organization } from "@/api/entities";
import { User } from "@/api/entities";

export default function EmailToTicketManager() {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgEmail, setOrgEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [testEmail, setTestEmail] = useState({
    from: "customer@example.com",
    subject: "Help with billing issue",
    body: "I have a problem with my recent invoice. Can you please help me resolve this billing issue?",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First check if user is authenticated
      const currentUser = await User.me();
      setUser(currentUser);
      console.log("Current user:", currentUser);

      let orgs = [];

      // Try multiple approaches to load organizations
      try {
        // First try: Get all organizations
        orgs = await Organization.getAll();
        console.log("Organizations loaded via getAll():", orgs);
      } catch (orgError) {
        console.log(
          "getAll() failed, trying alternative approaches:",
          orgError
        );

        // Second try: If user has active organization, try to get it directly
        if (currentUser.active_organization_id) {
          try {
            const activeOrg = await Organization.get(
              currentUser.active_organization_id
            );
            if (activeOrg) {
              orgs = [activeOrg];
              console.log("Loaded active organization directly:", activeOrg);
            }
          } catch (activeOrgError) {
            console.log("Failed to load active organization:", activeOrgError);
          }
        }

        // Third try: Filter organizations by user membership
        if (orgs.length === 0) {
          try {
            const allOrgs = await Organization.filter({});
            orgs = allOrgs.filter(
              (org) =>
                org.members?.includes(currentUser.email) ||
                org.owner_email === currentUser.email ||
                org.admins?.includes(currentUser.email)
            );
            console.log("Organizations loaded via filter:", orgs);
          } catch (filterError) {
            console.log("Filter approach failed:", filterError);
          }
        }
      }

      setOrganizations(orgs);

      if (orgs.length > 0) {
        // If user has an active organization, select it
        if (currentUser.active_organization_id) {
          const activeOrg = orgs.find(
            (org) => org.id === currentUser.active_organization_id
          );
          if (activeOrg) {
            setSelectedOrg(activeOrg);
            const email = EmailToTicketService.generateOrgEmail(activeOrg.name);
            setOrgEmail(email);
            console.log(
              "Selected active organization:",
              activeOrg.name,
              "Email:",
              email
            );
          } else {
            // Active org not in list, select first available
            const firstOrg = orgs[0];
            setSelectedOrg(firstOrg);
            const email = EmailToTicketService.generateOrgEmail(firstOrg.name);
            setOrgEmail(email);
            console.log(
              "Active org not found, selected first organization:",
              firstOrg.name,
              "Email:",
              email
            );
          }
        } else {
          // If no active organization, select the first one
          const firstOrg = orgs[0];
          setSelectedOrg(firstOrg);
          const email = EmailToTicketService.generateOrgEmail(firstOrg.name);
          setOrgEmail(email);
          console.log(
            "Selected first organization:",
            firstOrg.name,
            "Email:",
            email
          );
        }
      } else {
        console.log("No organizations found for user, showing demo");
        // Only show demo if we truly have no organizations
        const demoOrg = {
          id: "demo-org-1",
          name: "Demo Organization",
          organization_id: "DEMO-ORG",
        };

        setOrganizations([demoOrg]);
        setSelectedOrg(demoOrg);
        const email = EmailToTicketService.generateOrgEmail(demoOrg.name);
        setOrgEmail(email);
        console.log(
          "Demo mode activated - no real organizations found:",
          demoOrg.name,
          "Email:",
          email
        );
      }
    } catch (err) {
      console.error("Critical error loading data:", err);

      // Check if it's an authentication error
      if (err.message && err.message.includes("not authenticated")) {
        setError("Please log in to access the Email-to-Ticket system.");
      } else {
        setError("Failed to load user data. Please try refreshing the page.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgChange = (org) => {
    setSelectedOrg(org);
    const email = EmailToTicketService.generateOrgEmail(org.name);
    setOrgEmail(email);
  };

  const processTestEmail = async () => {
    if (!selectedOrg) {
      alert("Please select an organization first");
      return;
    }

    setIsProcessing(true);
    try {
      const emailData = {
        to: orgEmail,
        from: testEmail.from,
        subject: testEmail.subject,
        body: testEmail.body,
        attachments: [],
        organization: selectedOrg, // Pass the organization directly
      };

      const result = await EmailToTicketService.processIncomingEmail(emailData);

      setResults((prev) => [
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          emailData,
          result,
          organization: selectedOrg.name,
        },
        ...prev,
      ]);
    } catch (error) {
      console.error("Error processing email:", error);
      setResults((prev) => [
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          emailData: {
            to: orgEmail,
            from: testEmail.from,
            subject: testEmail.subject,
          },
          result: { success: false, error: error.message },
          organization: selectedOrg.name,
        },
        ...prev,
      ]);
    }
    setIsProcessing(false);
  };

  const runBulkTest = async () => {
    if (!selectedOrg) {
      alert("Please select an organization first");
      return;
    }

    setIsProcessing(true);
    try {
      await EmailToTicketService.testEmailProcessing();
      // Reload results after bulk test
      setTimeout(() => {
        setIsProcessing(false);
        alert("Bulk test completed! Check the console for detailed results.");
      }, 2000);
    } catch (error) {
      console.error("Error running bulk test:", error);
      setIsProcessing(false);
    }
  };

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(orgEmail);
    alert("Email address copied to clipboard!");
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getStatusColor = (success) => {
    return success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          📧 Email-to-Ticket System
        </h1>
        <p className="text-slate-600">
          Automatically convert emails into organized tickets with smart
          department assignment
        </p>
      </div>

      {/* Organization Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organization Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Organization</Label>
              <div className="mt-2 space-y-2">
                {isLoading ? (
                  <div className="p-3 border rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span className="text-slate-600">
                        Loading organizations...
                      </span>
                    </div>
                  </div>
                ) : error ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : organizations.length === 0 ? (
                  <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-yellow-800">
                          No Organizations Found
                        </div>
                        <div className="text-sm text-yellow-700 mt-1">
                          You need to create or join an organization to use the
                          Email-to-Ticket system.
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                          onClick={() =>
                            (window.location.href = "/Organization")
                          }
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Go to Organizations
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  organizations.map((org) => (
                    <div
                      key={org.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrg?.id === org.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => handleOrgChange(org)}
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-slate-500">
                        {org.organization_id}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label>Generated Email Address</Label>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <Input value={orgEmail} readOnly className="bg-slate-50" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyEmailToClipboard}
                    title="Copy email address"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Customers can send emails to this address to create tickets
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Testing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Email Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Email Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="from">From Email</Label>
              <Input
                id="from"
                value={testEmail.from}
                onChange={(e) =>
                  setTestEmail((prev) => ({ ...prev, from: e.target.value }))
                }
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={testEmail.subject}
                onChange={(e) =>
                  setTestEmail((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="Help with billing issue"
              />
            </div>

            <div>
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={testEmail.body}
                onChange={(e) =>
                  setTestEmail((prev) => ({ ...prev, body: e.target.value }))
                }
                placeholder="Describe the issue..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={processTestEmail}
                disabled={isProcessing || !selectedOrg}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Process Email
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={runBulkTest}
                disabled={isProcessing || !selectedOrg}
              >
                <Zap className="w-4 h-4 mr-2" />
                Bulk Test
              </Button>
            </div>

            {/* Quick Test Templates */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Quick Templates:</Label>
              <div className="mt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() =>
                    setTestEmail({
                      from: "customer@company.com",
                      subject: "URGENT: Payment failed",
                      body: "My payment failed and I need immediate help with billing.",
                    })
                  }
                >
                  💳 Billing Issue (High Priority)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() =>
                    setTestEmail({
                      from: "user@business.com",
                      subject: "Login problem",
                      body: "I cannot access my account. Please help me fix this issue.",
                    })
                  }
                >
                  🔐 Support Request (Normal Priority)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() =>
                    setTestEmail({
                      from: "prospect@startup.com",
                      subject: "Sales inquiry for enterprise plan",
                      body: "I am interested in your enterprise solution. Can you provide pricing?",
                    })
                  }
                >
                  💼 Sales Inquiry (Medium Priority)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <div className="font-medium">Email Reception</div>
                  <div className="text-sm text-slate-600">
                    System receives email at organization address
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <div className="font-medium">Smart Analysis</div>
                  <div className="text-sm text-slate-600">
                    AI analyzes content for department and priority
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <div className="font-medium">Ticket Creation</div>
                  <div className="text-sm text-slate-600">
                    Automatically creates organized ticket
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <div className="font-medium">Team Notification</div>
                  <div className="text-sm text-slate-600">
                    Notifies relevant department team
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  5
                </div>
                <div>
                  <div className="font-medium">Confirmation</div>
                  <div className="text-sm text-slate-600">
                    Sends confirmation to customer
                  </div>
                </div>
              </div>
            </div>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Local Development:</strong> This system simulates email
                processing. In production, it would integrate with actual email
                servers.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Processing Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={getStatusColor(result.result.success)}
                        >
                          {result.result.success ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Success
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Failed
                            </>
                          )}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <Badge variant="outline">{result.organization}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Email Details:</div>
                        <div className="text-slate-600">
                          <div>From: {result.emailData.from}</div>
                          <div>Subject: {result.emailData.subject}</div>
                        </div>
                      </div>

                      <div>
                        {result.result.success ? (
                          <div>
                            <div className="font-medium">Ticket Created:</div>
                            <div className="text-slate-600">
                              <div>ID: {result.result.ticket?.ticket_id}</div>
                              <div className="flex items-center gap-2">
                                Priority:
                                <Badge
                                  className={getPriorityColor(
                                    result.result.ticket?.priority
                                  )}
                                >
                                  {result.result.ticket?.priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-red-600">
                              Error:
                            </div>
                            <div className="text-red-600 text-sm">
                              {result.result.error}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
