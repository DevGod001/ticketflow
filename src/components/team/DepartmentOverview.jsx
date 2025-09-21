import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Users, Plus, Settings, User } from "lucide-react";

import CreateDepartmentModal from "./CreateDepartmentModal";
import EditDepartmentModal from "./EditDepartmentModal";

export default function DepartmentOverview({
  departments,
  allMembers,
  organization,
  currentUser,
  onUpdate,
}) {
  const [selectedDept, setSelectedDept] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const getDepartmentMembers = (department) => {
    return allMembers.filter((member) =>
      department.members?.includes(member.email)
    );
  };

  const getDepartmentHead = (department) => {
    return allMembers.find((member) => member.email === department.head_email);
  };

  if (departments.length === 0) {
    return (
      <>
        <Card className="border-none shadow-lg">
          <CardContent className="p-8 md:p-12 text-center">
            <Building2 className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4 md:mb-6" />
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2 md:mb-3">
              No Departments Yet
            </h3>
            <p className="text-slate-600 mb-6 text-sm md:text-base">
              Create departments to organize your team structure
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Department
            </Button>
          </CardContent>
        </Card>

        <CreateDepartmentModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            onUpdate();
          }}
          teamMembers={allMembers}
          user={currentUser}
          organizationId={organization?.id}
        />
      </>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg md:text-xl font-semibold text-slate-900">
          Department Overview
        </h2>
        <Button
          variant="outline"
          className="border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {departments.map((department) => {
          const members = getDepartmentMembers(department);
          const head = getDepartmentHead(department);

          return (
            <Card
              key={department.id}
              className="border-none shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <CardHeader
                className="cursor-pointer p-4 md:p-6"
                onClick={() =>
                  setSelectedDept(
                    selectedDept === department.id ? null : department.id
                  )
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${department.color}20` }}
                    >
                      <Building2
                        className="w-5 h-5"
                        style={{ color: department.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg">
                        {department.name}
                      </CardTitle>
                      <p className="text-sm text-slate-500">
                        {members.length} members
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDepartment(department);
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-grow p-4 md:p-6 pt-0">
                <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                  {department.description}
                </p>

                {head && (
                  <div className="flex items-center gap-2 mb-4 p-2 md:p-3 bg-slate-50 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={head.avatar_url} />
                      <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {head.full_name?.charAt(0) || head.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {head.full_name || head.email}
                      </p>
                      <p className="text-xs text-slate-500">Department Head</p>
                    </div>
                  </div>
                )}

                {selectedDept === department.id && (
                  <div className="space-y-3 border-t pt-4 mt-4">
                    <h4 className="font-medium text-slate-900 text-sm">
                      Members
                    </h4>
                    {members.length > 0 ? (
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                {member.full_name?.charAt(0) ||
                                  member.email.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-700 truncate">
                              {member.full_name || member.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No members assigned
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto pt-4">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: department.color,
                      color: department.color,
                    }}
                    className="text-xs"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {members.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreateDepartmentModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          onUpdate();
        }}
        teamMembers={allMembers}
        user={currentUser}
        organizationId={organization?.id}
      />

      {editingDepartment && (
        <EditDepartmentModal
          department={editingDepartment}
          teamMembers={allMembers}
          onClose={() => setEditingDepartment(null)}
          onSuccess={() => {
            setEditingDepartment(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
