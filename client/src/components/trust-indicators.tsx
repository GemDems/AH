import { Shield, Clock, Percent, Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function TrustIndicators() {
  const [currentReview, setCurrentReview] = useState({ user: "", visible: false });
  const [goldPopups, setGoldPopups] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const reviewUsers = [
    "Sarah M", "David K", "Emma R", "James L", "Maya P", "Alex C", "Nina S", "Ryan T",
    "Lisa W", "Mike B", "Zoe H", "Sam D", "Aria F", "Josh N", "Chloe V", "Tyler G"
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      const randomUser = reviewUsers[Math.floor(Math.random() * reviewUsers.length)];
      setCurrentReview({ user: randomUser, visible: true });
      
      setTimeout(() => {
        setCurrentReview(prev => ({ ...prev, visible: false }));
      }, 3000);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const addGoldPopup = (event: React.MouseEvent | React.TouchEvent) => {
    let clientX, clientY;
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const newPopup = {
      id: Date.now(),
      x: clientX,
      y: clientY
    };
    
    setGoldPopups(prev => [...prev, newPopup]);
    
    // Add $1 to savings progress
    const deviceId = localStorage.getItem('deviceId') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!localStorage.getItem('deviceId')) {
      localStorage.setItem('deviceId', deviceId);
    }
    
    fetch('/api/savings/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: deviceId,
        amount: 1
      })
    }).catch(err => console.error('Failed to update savings:', err));
    
    // Remove popup after animation
    setTimeout(() => {
      setGoldPopups(prev => prev.filter(popup => popup.id !== newPopup.id));
    }, 2000);
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="mt-16 mb-2 bg-white rounded-xl shadow-lg p-8"
        onClick={addGoldPopup}
        onTouchStart={addGoldPopup}
      >
        {/* Nike-style Bold Text Section */}
        <div className="mb-8 overflow-hidden text-center">
          <div className="nike-steroids-text">
            LIKE STEROIDS*
          </div>
          <div className="text-gray-500 text-sm mt-2 italic">
            *but it's 100% safe (pinky promise)
          </div>
        </div>

        {/* Guarantee Section */}
        <div className="mb-8 text-center">
          <div className="text-lg text-gray-900 font-medium">
            If the deal isn't real, I'll personally find you a better one — or send it to you free.
          </div>
        </div>

        <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">Why Choose Elite Deals Hub?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-trust-green rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-white text-2xl w-8 h-8" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Verified Deals Only</h4>
            <p className="text-gray-600 text-sm">Every deal is manually verified for authenticity and value.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-conversion-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-white text-2xl w-8 h-8" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Real-Time Updates</h4>
            <p className="text-gray-600 text-sm">Deals updated every few minutes to ensure availability.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#F54927] rounded-full flex items-center justify-center mx-auto mb-4">
              <Percent className="text-white text-2xl w-8 h-8" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Maximum Savings</h4>
            <p className="text-gray-600 text-sm">We negotiate exclusive discounts you won't find elsewhere.</p>
          </div>
        </div>
      </div>
      
      {/* Gold Popups */}
      {goldPopups.map(popup => (
        <div
          key={popup.id}
          className="gold-popup"
          style={{
            left: popup.x,
            top: popup.y,
          }}
        >
          +$1
        </div>
      ))}
    </>
  );
}
