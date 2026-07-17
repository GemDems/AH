import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export default function UsernameModal({ isOpen, onClose, userId, onSuccess }: UsernameModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { toast } = useToast();

  const submitUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest("POST", "/api/user/username", { userId, username });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "🎉 VIP STATUS ACTIVATED!",
        description: "You're now eligible for the Elite Leaderboard!",
        className: "bg-yellow-50 border-yellow-200",
      });
      onSuccess();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update username.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both first and last name.",
        variant: "destructive",
      });
      return;
    }

    // Format as "FirstName/L" (Name/First Letter of Last Name)
    const username = `${firstName.trim()}/${lastName.trim()[0].toUpperCase()}`;
    submitUsernameMutation.mutate(username);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl font-bold text-center">
            <Crown className="w-6 h-6 text-yellow-500 mr-2" />
            VIP STATUS UNLOCKED!
            <Star className="w-6 h-6 text-yellow-500 ml-2" />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-6">
          <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium">
              🏆 Congratulations! You've reached 3 referrals and unlocked Elite VIP status.
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              Enter your name to appear on the Elite Leaderboard and compete with other VIPs!
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="mt-1"
              />
            </div>

            <div className="bg-gray-50 border rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-2">Your leaderboard display name will be:</p>
              <p className="font-mono text-sm font-bold text-center">
                {firstName.trim() && lastName.trim() 
                  ? `${firstName.trim()}/${lastName.trim()[0].toUpperCase()}`
                  : "FirstName/L"
                }
              </p>
              <p className="text-xs text-gray-500 mt-1 text-center">
                (Example: Sarah/K, Michael/R, David/L)
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!firstName.trim() || !lastName.trim() || submitUsernameMutation.isPending}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {submitUsernameMutation.isPending ? "Saving..." : "Join Leaderboard"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}