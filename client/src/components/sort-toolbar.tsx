import { Button } from "@/components/ui/button";
import { 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Star, 
  Calendar,
  ArrowUpDown
} from "lucide-react";

interface SortToolbarProps {
  onSort: (sortType: string) => void;
  currentSort: string;
}

export default function SortToolbar({ onSort, currentSort }: SortToolbarProps) {
  const sortOptions = [
    { key: 'newest', label: 'Newest', icon: Calendar, desc: 'Fresh drops' },
    { key: 'price_low', label: 'Price ↑', icon: DollarSign, desc: 'Budget hunters' },
    { key: 'price_high', label: 'Price ↓', icon: DollarSign, desc: 'Luxury spenders' },
    { key: 'popular', label: 'Trending', icon: TrendingUp, desc: 'Most popular' },
    { key: 'ending_soon', label: 'Ending Soon', icon: Clock, desc: 'FOMO trigger' },
    { key: 'top_rated', label: 'Top Rated', icon: Star, desc: 'Trust-based' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <ArrowUpDown className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          const isActive = currentSort === option.key;
          
          return (
            <Button
              key={option.key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onSort(option.key)}
              className={`flex flex-col gap-1 h-auto p-2 text-xs ${
                isActive 
                  ? 'bg-conversion-blue text-white border-conversion-blue' 
                  : 'hover:bg-conversion-blue/10 hover:border-conversion-blue/30'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span className="font-medium">{option.label}</span>
              <span className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                {option.desc}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}