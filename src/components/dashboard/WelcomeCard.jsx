import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Users } from "lucide-react";

export default function WelcomeCard({ user }) {
  return (
    <Card className="border-none shadow-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold">Welcome to TicketFlow!</CardTitle>
        <p className="text-blue-100">Get started by creating or joining an organization</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <Building2 className="w-12 h-12 mb-4 text-blue-200" />
            <h3 className="text-xl font-semibold mb-2">Create Organization</h3>
            <p className="text-blue-100 text-sm mb-4">Start your team's ticketing journey by creating a new organization</p>
            <Link to={createPageUrl("Organization", "action=create")}>
              <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                <Plus className="w-4 h-4 mr-2" />
                Create Now
              </Button>
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <Users className="w-12 h-12 mb-4 text-blue-200" />
            <h3 className="text-xl font-semibold mb-2">Join Organization</h3>
            <p className="text-blue-100 text-sm mb-4">Join an existing team using their organization ID</p>
            <Link to={createPageUrl("Organization", "action=join")}>
              <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                <Users className="w-4 h-4 mr-2" />
                Join Now
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}