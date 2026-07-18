import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, TrendingUp, Zap, Clock } from "lucide-react";
import type { AffiliateLink } from "@shared/schema";

interface SearchBarProps {
  onSearch: (query: string) => void;
  links: AffiliateLink[];
  containerClass?: string;
}

export default function SearchBar({ onSearch, links, containerClass }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingSearches] = useState([
    "Smart watches",
    "Premium headphones", 
    "Gaming laptops",
    "Fitness trackers",
    "Kitchen gadgets"
  ]);

  useEffect(() => {
    if (query.length > 1) {
      const filtered = links
        .filter(link => 
          link.title.toLowerCase().includes(query.toLowerCase()) ||
          link.description.toLowerCase().includes(query.toLowerCase()) ||
          link.category.toLowerCase().includes(query.toLowerCase())
        )
        .map(link => link.title)
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [query, links]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    onSearch(searchQuery);
    setShowSuggestions(false);
  };

  return (
    <div className={containerClass ?? "relative max-w-5xl mx-auto mb-12"}>
      {/* Minimal Search Interface */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="relative">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for deals..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
                className="pl-12 pr-4 py-5 text-xl rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              />
            </div>
            
            <Button
              onClick={() => handleSearch(query)}
              className="hidden sm:flex bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-5 rounded-xl font-semibold text-xl shadow-lg transition-all duration-300"
            >
              Search
            </Button>
          </div>

          {/* Smart Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-30 overflow-hidden">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center">
                    <Search className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="font-medium text-gray-900">{suggestion}</span>
                    <span className="ml-auto text-xs text-blue-600 font-medium">
                      Verified
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>




      </div>
    </div>
  );
}