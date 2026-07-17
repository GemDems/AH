import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users, Gift, Copy, Check, Trophy, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import UsernameModal from "./username-modal";

// Generate persistent device ID
const getDeviceId = () => {
  let deviceId = localStorage.getItem('elite_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('elite_device_id', deviceId);
  }
  return deviceId;
};

export default function ReferralSystem() {
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [username, setUsername] = useState("");
  const [lastName, setLastName] = useState("");
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const { toast } = useToast();
  const deviceId = getDeviceId();

  // Get or generate user referral status - refresh every 5 seconds for live updates
  const { data: referralStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/referral/status", deviceId],
    queryFn: async () => {
      const response = await fetch(`/api/referral/status?userId=${deviceId}&t=${Date.now()}`);
      return response.json();
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds for live updates
    staleTime: 0 // Always consider data stale to force fresh fetches
  });

  // Format username properly: "John W" format - only first letters capitalized
  const formatUsername = (firstName: string, lastInitial: string) => {
    const formattedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const formattedLast = lastInitial.charAt(0).toUpperCase();
    return `${formattedFirst} ${formattedLast}`;
  };

  // Generate referral code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/referral/generate", { userId: deviceId });
      return response.json();
    },
    onSuccess: () => {
      refetchStatus();
      toast({
        title: "Success!",
        description: "Your exclusive referral code has been generated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate referral code.",
        variant: "destructive",
      });
    }
  });

  // Use referral code mutation
  const useCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/referral/use", { 
        code: code.toUpperCase(), 
        deviceId 
      });
      return response.json();
    },
    onSuccess: (data) => {
      refetchStatus();
      if (data.vipUnlocked) {
        setShowUsernameModal(true);
      } else {
        toast({
          title: "Code Applied!",
          description: `Code used successfully. ${3 - data.usedCount} more uses needed for VIP.`,
        });
      }
      setInputCode("");
    },
    onError: (error: any) => {
      const isDeviceUsed = error.message?.includes("already used a referral code");
      toast({
        title: isDeviceUsed ? "Device Already Used" : "Invalid Code",
        description: isDeviceUsed 
          ? "This device has already used a referral code. Each device can only use one code." 
          : error.message || "This code is invalid.",
        variant: "destructive",
      });
    }
  });

  // Save username mutation
  const saveUsernameMutation = useMutation({
    mutationFn: async () => {
      if (!username.trim() || !lastName.trim()) {
        throw new Error("Please enter both first name and last initial");
      }
      const formattedUsername = formatUsername(username.trim(), lastName.trim());
      const response = await apiRequest("POST", "/api/user/username", { 
        userId: deviceId, 
        username: formattedUsername 
      });
      return response.json();
    },
    onSuccess: () => {
      refetchStatus();
      setShowUsernameForm(false);
      setUsername("");
      setLastName("");
      toast({
        title: "Username Saved!",
        description: "You're now eligible for the VIP leaderboard.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save username.",
        variant: "destructive",
      });
    }
  });

  const handleCopyCode = () => {
    if (referralStatus?.myCode) {
      navigator.clipboard.writeText(referralStatus.myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Share this code to get VIP access.",
      });
    }
  };

  const handleUseCode = () => {
    if (inputCode.trim()) {
      useCodeMutation.mutate(inputCode.trim());
    }
  };

  const handleGenerateCode = () => {
    generateCodeMutation.mutate();
  };

  const handleSaveUsername = () => {
    saveUsernameMutation.mutate();
  };

  // Calculate invite progress
  const inviteCount = referralStatus?.usedCount || 0;
  const isVipEligible = inviteCount >= 3;
  const hasUsername = referralStatus?.username;
  const invitesNeeded = Math.max(0, 3 - inviteCount);

  return (
    <>
      <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center text-lg font-bold text-gray-800">
          <Crown className={`w-5 h-5 mr-2 ${referralStatus?.isVip ? 'text-yellow-500' : 'text-gray-400'}`} />
          {referralStatus?.isVip ? 'VIP MEMBER' : 'Join Elite Club'}
        </CardTitle>
        {referralStatus?.isVip && (
          <p className="text-xs text-yellow-600 font-medium">
            ✨ Elite status active • Leaderboard eligible
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* My Referral Code Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            My Invite Code
          </label>
          {referralStatus?.myCode ? (
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 font-mono text-sm font-bold text-center">
                {referralStatus.myCode}
              </div>
              <Button
                onClick={handleCopyCode}
                size="sm"
                variant="outline"
                className="px-3"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleGenerateCode}
              disabled={generateCodeMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {generateCodeMutation.isPending ? "Generating..." : "Get My Code"}
            </Button>
          )}
          {referralStatus?.myCode && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">
                Uses: {referralStatus.usedCount}/3 for VIP
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-2">
                <p className="text-sm font-bold text-blue-700 text-center">
                  🏆 Leaderboard Invites Used: {referralStatus.invitesUsedCount || 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Use Code Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Use Invite Code
          </label>
          <div className="flex items-center space-x-2">
            <Input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="flex-1 text-center font-mono text-sm"
              maxLength={10}
            />
            <Button
              onClick={handleUseCode}
              disabled={!inputCode.trim() || useCodeMutation.isPending}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white px-4"
            >
              {useCodeMutation.isPending ? "..." : "Apply"}
            </Button>
          </div>
        </div>

        {/* Invite Progress Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-bold text-sm text-gray-800">Invite Progress</span>
            </div>
            
            <div className="text-2xl font-bold text-blue-600">
              {inviteCount}/3 
              <span className="text-sm font-normal text-gray-600 ml-2">invites</span>
            </div>
            
            {invitesNeeded > 0 ? (
              <p className="text-xs text-gray-600">
                {invitesNeeded} more invite{invitesNeeded > 1 ? 's' : ''} needed for VIP leaderboard access
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-green-600 font-medium">
                  ✅ VIP Leaderboard Qualified!
                </p>
                {!hasUsername && (
                  <Button 
                    onClick={() => setShowUsernameForm(true)}
                    size="sm"
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Set Leaderboard Name
                  </Button>
                )}
                {hasUsername && (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-blue-900">
                      {referralStatus.username}
                    </p>
                    <p className="text-xs text-gray-600">
                      Leaderboard Invites Used: {referralStatus.invitesUsedCount || 0}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Username Form */}
        {showUsernameForm && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <div className="text-center">
              <h4 className="font-bold text-sm text-gray-800 mb-2">Set Your Leaderboard Name</h4>
              <p className="text-xs text-gray-600 mb-3">Format: "John W" (First name + Last initial)</p>
            </div>
            
            <div className="space-y-2">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="First Name"
                className="text-center"
                maxLength={15}
              />
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Initial"
                className="text-center"
                maxLength={1}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleSaveUsername}
                disabled={!username.trim() || !lastName.trim() || saveUsernameMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {saveUsernameMutation.isPending ? "Saving..." : "Save Name"}
              </Button>
              <Button
                onClick={() => setShowUsernameForm(false)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Reward Codes Display */}
        {referralStatus?.rewardCodes && referralStatus.rewardCodes.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <div className="text-center">
              <h4 className="font-bold text-sm text-yellow-800 mb-2">🎉 $1,000 Bonus Invite Codes Unlocked!</h4>
              <p className="text-xs text-yellow-600">Share these bonus invite codes with friends</p>
            </div>
            
            <div className="space-y-2">
              {referralStatus.rewardCodes.map((code: any, index: number) => (
                <div key={code.id} className="bg-white rounded-lg p-3 border border-yellow-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm font-bold text-gray-800">{code.code}</div>
                      <div className="text-xs text-gray-600">
                        {code.codeType === "bonus_2x" && "Invite Code 1 (2x Bonus)"}
                        {code.codeType === "bonus_regular" && "Invite Code 2 (Regular)"}
                        {code.codeType === "seinfeld" && "Invite Code 1 (2x Bonus)"}
                        {code.codeType === "double_points" && "Invite Code 2 (Regular)"}
                        {!code.codeType && "Bonus Invite Code"}
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(code.code);
                        toast({ title: "Copied!", description: "Bonus invite code copied to clipboard." });
                      }}
                      size="sm"
                      variant="outline"
                      className="px-2"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Live Usage Tracking */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-700 font-medium">
                        Times Shared: {code.usedCount || 0}
                      </span>
                      <span className="text-blue-700 font-medium">
                        You Earned: +{(code.usedCount || 0) * (code.isDoublePoints ? 2 : 1)} invites
                      </span>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1 text-blue-500" />
              <span className="text-gray-600">Invite 3 friends</span>
            </div>
            <div className="flex items-center">
              <Trophy className="w-3 h-3 mr-1 text-yellow-500" />
              <span className="text-gray-600">Join leaderboard</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <UsernameModal
      isOpen={showUsernameModal}
      onClose={() => setShowUsernameModal(false)}
      userId={deviceId}
      onSuccess={() => refetchStatus()}
    />
    </>
  );
}