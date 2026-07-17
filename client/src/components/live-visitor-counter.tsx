import { useState, useEffect } from "react";
import { Users, Eye, ShoppingCart } from "lucide-react";

export default function LiveVisitorCounter() {
  const [visitors, setVisitors] = useState(Math.floor(Math.random() * 200) + 150);
  const [recentPurchases, setRecentPurchases] = useState(Math.floor(Math.random() * 30) + 20);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitors(prev => {
        const change = Math.floor(Math.random() * 20) - 10;
        return Math.max(100, Math.min(400, prev + change));
      });
      
      if (Math.random() > 0.7) {
        setRecentPurchases(prev => prev + 1);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="bg-gradient-to-r from-urgency-red to-red-600 text-white rounded-2xl p-4 shadow-2xl border-2 border-white/20 backdrop-blur-sm">
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
            <Eye className="w-4 h-4 mr-2" />
            <span className="font-bold text-sm">{visitors} viewing now</span>
          </div>
          
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse mr-2"></div>
            <ShoppingCart className="w-4 h-4 mr-2" />
            <span className="font-bold text-sm">{recentPurchases} bought today</span>
          </div>
          
          <div className="text-center pt-1 border-t border-white/20">
            <div className="text-xs font-medium">🔥 LIVE ACTIVITY</div>
          </div>
        </div>
      </div>
    </div>
  );
}