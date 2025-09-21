import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette, 
  Save 
} from "lucide-react";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    mentions: true,
    assignments: true,
    comments: true,
    status_changes: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      if (currentUser.notification_preferences) {
        setSettings(currentUser.notification_preferences);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await User.updateMyUserData({
        notification_preferences: settings
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    }
    setIsSaving(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="notifications">
        <TabsList className="bg-white border border-slate-200 shadow-sm">
          <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Shield className="w-4 h-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <p className="text-slate-600">Choose when and how you want to be notified</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-slate-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(value) => handleSettingChange('email_notifications', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-slate-500">Receive browser push notifications</p>
                  </div>
                  <Switch
                    checked={settings.push_notifications}
                    onCheckedChange={(value) => handleSettingChange('push_notifications', value)}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 mb-4">Notification Types</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mentions</Label>
                        <p className="text-sm text-slate-500">When someone mentions you</p>
                      </div>
                      <Switch
                        checked={settings.mentions}
                        onCheckedChange={(value) => handleSettingChange('mentions', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Assignments</Label>
                        <p className="text-sm text-slate-500">When tickets are assigned to you</p>
                      </div>
                      <Switch
                        checked={settings.assignments}
                        onCheckedChange={(value) => handleSettingChange('assignments', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Comments</Label>
                        <p className="text-sm text-slate-500">New comments on your tickets</p>
                      </div>
                      <Switch
                        checked={settings.comments}
                        onCheckedChange={(value) => handleSettingChange('comments', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Status Changes</Label>
                        <p className="text-sm text-slate-500">When ticket status changes</p>
                      </div>
                      <Switch
                        checked={settings.status_changes}
                        onCheckedChange={(value) => handleSettingChange('status_changes', value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-green-600 to-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <p className="text-slate-600">Control your privacy and data sharing</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Privacy Settings</h3>
                <p className="text-slate-600">Privacy controls will be available soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <p className="text-slate-600">Customize how the app looks and feels</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Palette className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Theme Options</h3>
                <p className="text-slate-600">Dark mode and theme customization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}