import { useState, useEffect } from "react";
import { Shield, DollarSign, CheckCircle, ClipboardCheck, ExternalLink, Lock } from "lucide-react";

export default function StatsBar() {
  const [currentStatIndex, setCurrentStatIndex] = useState(0);

  const stats = [
    {
      icon: <Shield className="w-4 h-4 mr-2" />,
      text: "🛡️ Free forever — no subscription, no hidden fees",
      color: "text-yellow-300"
    },
    {
      icon: <CheckCircle className="w-4 h-4 mr-2" />,
      text: "✅ No account required to browse deals",
      color: "text-green-300"
    },
    {
      icon: <DollarSign className="w-4 h-4 mr-2" />,
      text: "💰 Price shown at time of posting — always accurate",
      color: "text-blue-300"
    },
    {
      icon: <ClipboardCheck className="w-4 h-4 mr-2" />,
      text: "📋 Affiliate-disclosed on every single deal",
      color: "text-purple-300"
    },
    {
      icon: <ExternalLink className="w-4 h-4 mr-2" />,
      text: "🔗 Links go directly to official retailer sites",
      color: "text-blue-400"
    },
    {
      icon: <Lock className="w-4 h-4 mr-2" />,
      text: "🔒 We never handle your payment or personal info",
      color: "text-green-400"
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
