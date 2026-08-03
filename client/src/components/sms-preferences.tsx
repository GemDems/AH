import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Phone, Bell, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { UserSmsPreferences } from "@shared/schema";

interface SMSPreferencesProps {
  userId: string;
}

export default function SMSPreferences({ userId }: SMSPreferencesProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dealNotifications, setDealNotifications] = useState(true);
  const [priceDropAlerts, setPriceDropAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [isOptedIn, setIsOptedIn] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing SMS preferences
  const { data: preferences, isLoading } = useQuery<UserSmsPreferences | null>({
    queryKey: [`/api/sms/preferences/${userId}`],
    enabled: !!userId,
  });

  // Check SMS service status
  const { data: smsStatus } = useQuery<{ isConfigured: boolean }>({
    queryKey: ['/api/sms/status'],
  });

  // Update form state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setPhoneNumber(preferences.phoneNumber || "");
      setDealNotifications(!!preferences.dealNotifications);
      setPriceDropAlerts(!!preferences.priceDropAlerts);
      setWeeklyDigest(!!preferences.weeklyDigest);
      setIsOptedIn(!!preferences.isOptedIn);
    }
  }, [preferences]);

  // Create new SMS preferences
  const createPreferencesMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/sms/preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sms/preferences/${userId}`] });
      toast({ title: "SMS preferences saved successfully!" });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to save SMS preferences", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  // Update existing SMS preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PUT', `/api/sms/preferences/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sms/preferences/${userId}`] });
      toast({ title: "SMS preferences updated successfully!" });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update SMS preferences", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  // Opt out from SMS
  const optOutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/sms/opt-out/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sms/preferences/${userId}`] });
      toast({ title: "Successfully opted out from SMS messages" });
      setIsOptedIn(false);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to opt out", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const handleSave = () => {
    if (!phoneNumber.trim()) {
      toast({ 
        title: "Phone number required", 
        description: "Please enter a valid phone number",
        variant: "destructive" 
      });
      return;
    }

    const data = {
      userId,
      phoneNumber: phoneNumber.trim(),
      dealNotifications: dealNotifications ? 1 : 0,
      priceDropAlerts: priceDropAlerts ? 1 : 0,
      weeklyDigest: weeklyDigest ? 1 : 0,
    };

    if (preferences) {
      updatePreferencesMutation.mutate(data);
    } else {
      createPreferencesMutation.mutate(data);
    }
  };

  const handleOptOut = () => {
    if (window.confirm("Are you sure you want to opt out from all SMS messages? You can opt back in anytime.")) {
      optOutMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse">Loading SMS preferences...</div>
        </CardContent>
      </Card>
    );
  }

  const isServiceConfigured = smsStatus?.isConfigured;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          SMS Notifications
        </CardTitle>
        <CardDescription>
          Get notified about deals, price drops, and updates via SMS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isServiceConfigured && (
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-3">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              📱 SMS service is not configured. Contact support to enable SMS notifications.
            </p>
          </div>
        )}

        {!isOptedIn && preferences && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              You have opted out from SMS messages. Contact support to opt back in.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={!isEditing && !!preferences}
            />
          </div>
        </div>

        {isServiceConfigured && (isEditing || !preferences) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <Label htmlFor="deal-notifications">Deal Notifications</Label>
              </div>
              <Switch
                id="deal-notifications"
                checked={dealNotifications}
                onCheckedChange={setDealNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <Label htmlFor="price-alerts">Price Drop Alerts</Label>
              </div>
              <Switch
                id="price-alerts"
                checked={priceDropAlerts}
                onCheckedChange={setPriceDropAlerts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
              </div>
              <Switch
                id="weekly-digest"
                checked={weeklyDigest}
                onCheckedChange={setWeeklyDigest}
              />
            </div>
          </div>
        )}

        {isServiceConfigured && preferences && !isEditing && isOptedIn && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>📱 Phone: {preferences.phoneNumber}</p>
            <p>🔔 Deal notifications: {preferences.dealNotifications ? "On" : "Off"}</p>
            <p>💰 Price alerts: {preferences.priceDropAlerts ? "On" : "Off"}</p>
            <p>📧 Weekly digest: {preferences.weeklyDigest ? "On" : "Off"}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {isServiceConfigured && (!preferences || isEditing) && (
            <>
              <Button 
                onClick={handleSave} 
                disabled={createPreferencesMutation.isPending || updatePreferencesMutation.isPending}
                className="flex-1"
              >
                {createPreferencesMutation.isPending || updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
              {preferences && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </>
          )}

          {isServiceConfigured && preferences && !isEditing && isOptedIn && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="flex-1"
              >
                Edit
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleOptOut}
                disabled={optOutMutation.isPending}
                className="flex-1"
              >
                {optOutMutation.isPending ? "Opting out..." : "Opt Out"}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}