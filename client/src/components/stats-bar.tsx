import { useState, useEffect } from "react";
import { Users, Shield, Zap, TrendingUp, Award, DollarSign, Star, CheckCircle, Globe, Clock } from "lucide-react";

export default function StatsBar() {
  const [currentStatIndex, setCurrentStatIndex] = useState(0);

  const stats = [
    {
      icon: <Users className="w-4 h-4 mr-2" />,
      text: `💎 ${(Math.floor(Math.random() * 5000) + 25000).toLocaleString()} Elite Members`,
      color: "text-yellow-300"
    },
    {
      icon: <Shield className="w-4 h-4 mr-2" />,
      text: "🔒 Bank-Level Security • SSL Encrypted",
      color: "text-green-300"
    },
    {
      icon: <TrendingUp className="w-4 h-4 mr-2" />,
      text: `📈 ${Math.floor(Math.random() * 300) + 700} deals sold in last hour`,
      color: "text-blue-300"
    },
    {
      icon: <Award className="w-4 h-4 mr-2" />,
      text: "🏆 #1 Deal Platform • 5 Years Running",
      color: "text-purple-300"
    },
    {
      icon: <DollarSign className="w-4 h-4 mr-2" />,
      text: `💰 Members saved $${(Math.floor(Math.random() * 5) + 15).toFixed(1)}M this year`,
      color: "text-green-400"
    },
    {
      icon: <Star className="w-4 h-4 mr-2" />,
      text: "⭐ 4.9/5 Rating • 50K+ Reviews",
      color: "text-yellow-400"
    },
    {
      icon: <CheckCircle className="w-4 h-4 mr-2" />,
      text: "✅ Every Deal Verified • No Fake Offers",
      color: "text-green-300"
    },
    {
      icon: <Globe className="w-4 h-4 mr-2" />,
      text: "🌍 Trusted in 120+ Countries",
      color: "text-blue-400"
    },
    {
      icon: <Clock className="w-4 h-4 mr-2" />,
      text: `⚡ Updated ${Math.floor(Math.random() * 3) + 1} minutes ago`,
      color: "text-orange-300"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % stats.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [stats.length]);

  return (
    <div className="bg-gradient-to-r from-trust-green via-conversion-blue via-purple-600 to-trust-green text-white py-4 relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-center items-center min-h-[32px]">
          <div 
            className={`flex items-center font-medium text-sm transition-all duration-500 ${stats[currentStatIndex].color}`}
            key={currentStatIndex}
          >
            <div className="animate-pulse">
              {stats[currentStatIndex].icon}
            </div>
            <span className="font-semibold">
              {stats[currentStatIndex].text}
            </span>
          </div>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center mt-2 space-x-1">
          {stats.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index === currentStatIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
