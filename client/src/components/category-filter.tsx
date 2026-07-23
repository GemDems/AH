import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X, Check, Gift, Star, ShieldCheck } from "lucide-react";

interface Category {
  id: string;
  label: string;
  emoji: string;
}

export interface SpecialFilter {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const SPECIAL_FILTERS: SpecialFilter[] = [
  { id: "free_trial",   label: "Free",         icon: "lucide:Gift",        description: "Free products & offers" },
  { id: "elite_pick",   label: "Elite Picks",  icon: "lucide:Star",        description: "Hand-picked top performers" },
  { id: "verified",     label: "Verified",     icon: "lucide:ShieldCheck", description: "Verified by our team" },
  { id: "in_stock",     label: "In Stock",     icon: "📦", description: "Available right now" },
  { id: "under_25",     label: "Under $25",    icon: "💵", description: "Deals priced under $25" },
  { id: "under_50",     label: "Under $50",    icon: "💰", description: "Deals priced under $50" },
  { id: "under_100",    label: "Under $100",   icon: "💲", description: "Deals priced under $100" },
];

interface CategoryFilterProps {
  categories: Category[];
  activeCategories: Set<string>;
  onCategoryToggle: (id: string) => void;
  activeFilters: Set<string>;
  onFilterToggle: (id: string) => void;
}

export default function CategoryFilter({
  categories,
  activeCategories,
  onCategoryToggle,
  activeFilters,
  onFilterToggle,
}: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeFilterCount = activeFilters.size;

  return (
    <div className="mb-8 flex flex-wrap justify-center gap-3 items-center">
      {categories.map((category) => {
        const isActive = activeCategories.has(category.id);
        return (
          <Button
            key={category.id}
            onClick={() => onCategoryToggle(category.id)}
            variant={isActive ? "default" : "outline"}
            className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
              isActive
                ? "bg-conversion-blue hover:bg-blue-700 text-white ring-2 ring-blue-400 ring-offset-1"
                : "bg-white text-gray-700 hover:bg-gray-100 border"
            }`}
          >
            {category.emoji && `${category.emoji} `}{category.label}
          </Button>
        );
      })}

      {/* Filter icon button */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full font-medium border transition-all duration-300 text-sm ${
            open || activeFilterCount > 0
              ? "bg-purple-600 border-purple-500 text-white ring-2 ring-purple-400 ring-offset-1"
              : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 bg-white text-purple-700 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute z-50 top-[calc(100%+10px)] right-0 w-64 rounded-xl shadow-xl border border-gray-200 bg-white overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Filter by</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { SPECIAL_FILTERS.forEach(f => { if (activeFilters.has(f.id)) onFilterToggle(f.id); }); }}
                  className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  <X size={11} />
                  Clear
                </button>
              )}
            </div>

            <div className="py-1">
              {SPECIAL_FILTERS.map((f, i) => {
                const isActive = activeFilters.has(f.id);
                const isLast = i === SPECIAL_FILTERS.length - 1;
                const isDivider = i === 3; // divider before price filters
                return (
                  <div key={f.id}>
                    {isDivider && <div className="mx-3 my-1 border-t border-gray-100" />}
                    <button
                      onClick={() => onFilterToggle(f.id)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors duration-150 ${
                        isActive ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {f.icon === "lucide:Gift" ? (
                          <Gift size={14} className={isActive ? "text-blue-600" : "text-gray-400"} strokeWidth={2} />
                        ) : f.icon === "lucide:Star" ? (
                          <Star size={14} className={isActive ? "text-blue-600" : "text-gray-400"} strokeWidth={2} />
                        ) : f.icon === "lucide:ShieldCheck" ? (
                          <ShieldCheck size={14} className={isActive ? "text-blue-600" : "text-gray-400"} strokeWidth={2} />
                        ) : (
                          <span className="text-sm leading-none">{f.icon}</span>
                        )}
                        <span className={`text-[13px] font-medium ${isActive ? "text-blue-700" : "text-gray-700"}`}>
                          {f.label}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"
                      }`}>
                        {isActive && <Check size={10} color="white" strokeWidth={3} />}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
