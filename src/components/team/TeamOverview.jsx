import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, Star } from "lucide-react";
import CreateTeamModal from "./CreateTeamModal";

export default function TeamOverview({ teams, allMembers, organization, onUpdate }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const getTeamMembers = (team) => {
    return allMembers.filter(member => team.members?.includes(member.email));
  };

  const getTeamLead = (team) => {
    return allMembers.find(member => member.email === team.lead_email);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Teams</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2"/>
          Create Team
        </Button>
      </div>
      
      {teams.length === 0 ? (
        <Card className="text-center p-12">
          <Users className="mx-auto w-12 h-12 text-slate-300 mb-4"/>
          <h3 className="text-lg font-semibold">No Teams Yet</h3>
          <p className="text-slate-500 mb-4">Create teams to group your members.</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>Create Your First Team</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => {
            const members = getTeamMembers(team);
            const lead = getTeamLead(team);
            return (
              <Card key={team.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <p className="text-sm text-slate-500">{team.description}</p>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  {lead && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Star className="w-4 h-4 text-amber-500"/>
                      <Avatar className="w-8 h-8"><AvatarImage src={lead.avatar_url}/><AvatarFallback>{lead.full_name?.charAt(0) || 'L'}</AvatarFallback></Avatar>
                      <div>
                        <p className="text-sm font-medium">{lead.full_name}</p>
                        <p className="text-xs text-slate-500">Team Lead</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Members ({members.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {members.slice(0, 5).map(member => (
                        <Avatar key={member.id} className="w-8 h-8"><AvatarImage src={member.avatar_url}/><AvatarFallback>{member.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                      ))}
                      {members.length > 5 && <Avatar><AvatarFallback>+{members.length - 5}</AvatarFallback></Avatar>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateTeamModal 
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          onUpdate();
        }}
        allMembers={allMembers}
        organizationId={organization?.id}
      />
    </div>
  );
}