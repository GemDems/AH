import { useState, useEffect } from "react";
import { Trophy, Star, Crown, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import SavingsProgress from "./savings-progress";

// Realistic static leaderboard data that persists
const STATIC_LEADERBOARD_DATA = {
  topSavers: [
    { name: "Milo",    savings: 2857, location: "California", isVip: true },
    { name: "Trevor",  savings: 2652, location: "Texas",      isVip: true },
    { name: "Kaia",    savings: 2309, location: "New York",   isVip: true },
    { name: "Jenna",   savings: 2171, location: "Florida",    isVip: false },
    { name: "Andrew",  savings: 2107, location: "Illinois",   isVip: true },
    { name: "Nina",    savings: 1979, location: "",           isVip: false },
    { name: "Omar",    savings: 1843, location: "Ohio",       isVip: true },
    { name: "Carter",  savings: 1728, location: "",           isVip: false },
    { name: "Lexi",    savings: 1651, location: "Michigan",   isVip: false },
    { name: "Marco",   savings: 1605, location: "Nevada",     isVip: true }
  ],
  topReferrers: [
    { name: "Trevor",  referrals: 47, earnings: 1420, location: "Texas" },
    { name: "Milo",    referrals: 43, earnings: 1290, location: "California" },
    { name: "Kaia",    referrals: 39, earnings: 1170, location: "" },
    { name: "Andrew",  referrals: 36, earnings: 1080, location: "Illinois" },
    { name: "Omar",    referrals: 31, earnings: 930,  location: "" },
    { name: "Marco",   referrals: 28, earnings: 840,  location: "Nevada" },
    { name: "Brianna", referrals: 24, earnings: 720,  location: "Colorado" },
    { name: "Ryan",    referrals: 21, earnings: 630,  location: "" },
    { name: "Priya",   referrals: 19, earnings: 570,  location: "Oregon" },
    { name: "Bradley", referrals: 17, earnings: 510,  location: "Tennessee" }
  ]
};

export default function Leaderboard() {
  const [topSavers, setTopSavers] = useState(STATIC_LEADERBOARD_DATA.topSavers);
  const [topReferrers, setTopReferrers] = useState(STATIC_LEADERBOARD_DATA.topReferrers);

  // Fetch real VIP users with 3+ invites and usernames
  const { data: realVipUsers } = useQuery({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 10000, // Check every 10 seconds for new VIP members
  });

  // Random states for VIP users
  const vipStates = ["California", "Texas", "Florida", "New York", "Illinois", "Arizona", "Ohio", "Georgia", "Michigan", "Nevada"];

  // Merge real VIP users into static leaderboard when they qualify
  useEffect(() => {
    if (realVipUsers?.topReferrers) {
      setTopReferrers(prev => {
        // Get the minimum invite count from current leaderboard (17 is the lowest)
        const minInvites = Math.min(...prev.map(r => r.referrals));
        
        // Filter real users who qualify (more than minimum invites)
        const qualifyingUsers = realVipUsers.topReferrers.filter(user => 
          user.referralCount > minInvites && user.username
        );

        if (qualifyingUsers.length === 0) return prev;

        // Create updated leaderboard
        let updatedBoard = [...prev];
        
        qualifyingUsers.forEach(realUser => {
          // Check if user already exists in leaderboard
          const existingIndex = updatedBoard.findIndex(member => 
            member.name === realUser.username
          );
          
          if (existingIndex >= 0) {
            // Update existing user's invite count
            updatedBoard[existingIndex] = {
              ...updatedBoard[existingIndex],
              referrals: realUser.referralCount
            };
          } else {
            // Add new qualifying user, replace lowest member
            const randomState = vipStates[Math.floor(Math.random() * vipStates.length)];
            const newMember = {
              name: realUser.username,
              referrals: realUser.referralCount,
              earnings: realUser.referralCount * 30, // $30 per referral
              location: randomState
            };
            
            // Find the member with lowest invites and replace them
            const lowestIndex = updatedBoard.findIndex(member => 
              member.referrals === Math.min(...updatedBoard.map(r => r.referrals))
            );
            
            if (lowestIndex >= 0) {
              updatedBoard[lowestIndex] = newMember;
            }
          }
        });

        // Sort by referral count (highest first)
        return updatedBoard.sort((a, b) => b.referrals - a.referrals);
      });
    }
  }, [realVipUsers]);

  // Simulate realistic updates every 2-3 minutes for static members only
  useEffect(() => {
    const interval = setInterval(() => {
      // Small realistic increases to existing data
      setTopSavers(prev => prev.map(saver => ({
        ...saver,
        savings: saver.savings + Math.floor(Math.random() * 15) + 5 // $5-20 increase
      })));

      setTopReferrers(prev => prev.map(referrer => {
        // Only update static members (those with known static locations)
        const staticLocations = ["Texas", "California", "New York", "Illinois", "Ohio", "Nevada", "Colorado", "Washington", "Oregon", "Tennessee"];
        if (!staticLocations.includes(referrer.location)) return referrer;
        
        const newReferrals = Math.random() < 0.3 ? 1 : 0; // 30% chance of +1 referral
        return {
          ...referrer,
          referrals: referrer.referrals + newReferrals,
          earnings: referrer.earnings + (newReferrals * 30) // $30 per referral
        };
      }));
    }, 150000); // Update every 2.5 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-leaderboard>
      <div className="text-center mb-3">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-2">
          Elite Performance Leaderboard
        </h2>
        <p className="text-gray-600 text-lg">
          Top performers this month • Updates live every few minutes
        </p>
      </div>
      <div className="grid md:grid-cols-1 gap-8 max-w-2xl mx-auto px-4 mt-2 pl-[0px] pr-[0px]">
        {/* Top Savers */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 mr-3" />
              <div>
                <h3 className="text-2xl font-bold">Top 10 Savers This Month</h3>
                <p className="text-green-100">Verified elite deal hunters</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {topSavers.map((saver, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <div className="flex items-center mr-4">
                    {index === 0 && <Crown className="w-6 h-6 text-yellow-500 mr-2" />}
                    {index === 1 && <Trophy className="w-6 h-6 text-gray-400 mr-2" />}
                    {index === 2 && <Trophy className="w-6 h-6 text-amber-600 mr-2" />}
                    {index > 2 && <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 mr-2">{index + 1}</span>}
                  </div>
                  
                  <div>
                    <div className="flex items-center">
                      <span className="font-bold text-blue-900">{saver.name}</span>
                      {saver.isVip && <Crown className="w-4 h-4 text-yellow-500 ml-2" />}
                    </div>
                    {saver.location ? <div className="text-sm text-gray-500">{saver.location}</div> : null}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    ${saver.savings.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">saved</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Money Saved Tracker - Minimal Design */}
      <div className="max-w-md mx-auto px-4 py-2">
        <SavingsProgress />
      </div>
      <div className="grid md:grid-cols-1 gap-8 max-w-3xl mx-auto px-4 pl-[6px] pr-[6px]">
        {/* Top VIP Referrers */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6">
            <div className="flex items-center">
              <Star className="w-8 h-8 mr-3" />
              <div>
                <h3 className="text-2xl font-bold">Top VIP Referrers</h3>
                <p className="text-purple-100">Elite club members only</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {topReferrers.map((referrer, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <div className="flex items-center mr-4">
                    {index === 0 && <Crown className="w-6 h-6 text-yellow-500 mr-2" />}
                    {index === 1 && <Trophy className="w-6 h-6 text-gray-400 mr-2" />}
                    {index === 2 && <Trophy className="w-6 h-6 text-amber-600 mr-2" />}
                    {index > 2 && <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 mr-2">{index + 1}</span>}
                  </div>
                  
                  <div>
                    <div className="flex items-center">
                      <span className="font-bold text-blue-900">{referrer.name}</span>
                      <Crown className="w-4 h-4 text-yellow-500 ml-2" />
                    </div>
                    {referrer.location ? <div className="text-sm text-gray-500">{referrer.location}</div> : null}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">
                    {referrer.referrals} invites
                  </div>
                  <div className="text-xs text-gray-500">
                    ${referrer.earnings} earned
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}