import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Zap } from "lucide-react";

interface LiveActivity {
  id: string;
  user: string;
  location: string;
  action: string;
  product: string;
  timeAgo: string;
  blurProduct?: boolean;
}

export default function LiveFeed() {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { isVisibleRef.current = entry.isIntersecting; },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Generate realistic activity feed
  useEffect(() => {
    // Generative name engine — combines syllables to produce endless unique names
    const firsts = ['bri','kai','zo','ty','lex','nov','riv','len','ev','jax','cam','rei','tay','mar','sar','eli','ash','noa','mia','ren','cas','dex','cal','fia','neo','rue','bay','sky','ian','lys'];
    const mids   = ['an','en','ia','el','ar','on','ra','lyn','den','ven','ell','iss','or','ir','et','ey'];
    const lasts  = ['na','ton','ley','son','la','ren','xa','ros','wyn','belle','don','kay','zee','rie','lyn','ven','ell','ara'];
    const isAllCaps = (s: string) => s.length > 1 && s === s.toUpperCase();

    const makeName = (existingActivities: LiveActivity[]) => {
      const useThreeParts = Math.random() > 0.5;
      const raw = useThreeParts
        ? firsts[Math.floor(Math.random()*firsts.length)] + mids[Math.floor(Math.random()*mids.length)] + lasts[Math.floor(Math.random()*lasts.length)]
        : firsts[Math.floor(Math.random()*firsts.length)] + lasts[Math.floor(Math.random()*lasts.length)];

      // Only allow all-caps if none of the currently visible names are already all-caps
      const allCapsAlreadyVisible = existingActivities.some(a => isAllCaps(a.user));
      const r = Math.random();
      if (!allCapsAlreadyVisible && r < 0.22) return raw.toUpperCase();
      return r < 0.5 ? raw.toLowerCase() : raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    };

    const locations = ['TX', 'CA', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
    const actions = ['claimed this deal', 'just purchased', 'grabbed this offer', 'secured this item'];
    const products = ['Premium Headphones', 'Smart Watch', 'Wireless Earbuds', 'Fitness Tracker', 'Phone Case'];

    const generateActivity = (existing: LiveActivity[]): LiveActivity => {
      const showLocation = Math.random() > 0.5;
      return {
        id: Math.random().toString(36).substr(2, 9),
        user: makeName(existing),
        location: showLocation ? locations[Math.floor(Math.random() * locations.length)] : '',
        action: actions[Math.floor(Math.random() * actions.length)],
        product: products[Math.floor(Math.random() * products.length)],
        timeAgo: `${Math.floor(Math.random() * 59) + 1} mins ago`,
        blurProduct: true
      };
    };

    // Build initial list one-by-one so each checks the previous entries
    const initialActivities: LiveActivity[] = [];
    for (let i = 0; i < 5; i++) {
      initialActivities.push(generateActivity(initialActivities));
    }
    setActivities(initialActivities);

    // Add new activity every 8-15 seconds
    const interval = setInterval(() => {
      setActivities(prev => {
        const newActivity = generateActivity(prev);
        return [newActivity, ...prev.slice(0, 9)];
      });
    }, Math.random() * 7000 + 8000); // 8-15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6" ref={containerRef}>
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-conversion-blue animate-pulse" />
          <h3 className="text-lg font-bold text-conversion-blue">Live Activity Feed</h3>
          <div className="ml-auto flex items-center gap-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">LIVE</span>
          </div>
        </div>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activities.map((activity, index) => (
            <div 
              key={activity.id}
              className={`flex items-start gap-3 p-3 rounded-lg bg-white/70 border transition-all duration-500 ${
                index === 0 ? 'ring-2 ring-conversion-blue/30 bg-conversion-blue/5' : ''
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-conversion-blue rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {activity.user.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-conversion-blue">{activity.user}</span>
                  {activity.location ? (
                    <>{' '}in{' '}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        {activity.location}
                      </span>
                    </>
                  ) : null}
                  {' '}{activity.action}
                </p>
                <p className={`text-xs text-gray-600 truncate ${activity.blurProduct ? 'blur-sm' : ''}`}>
                  {activity.product}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {activity.timeAgo}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Real customers making real purchases • Updates every few seconds
          </p>
        </div>
      </Card>
    </div>
  );
}