import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";

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
  { id: "free_trial",   label: "Free Trial",   icon: "🆓", description: "Products with a free trial offer" },
  { id: "elite_pick",   label: "Elite Picks",  icon: "🧠", description: "Hand-picked top performers" },
  { id: "verified",     label: "Verified",     icon: "✔️", description: "Verified by our team" },
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
          <div className="absolute z-50 top-[calc(100%+10px)] right-0 w-72 rounded-2xl shadow-2xl border border-white/10 p-4"
            style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)" }}>
            {/* arrow */}
            <div className="absolute right-5 -top-[7px] w-3 h-3 rotate-45 border-l border-t border-white/10"
              style={{ background: "#0f172a" }} />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white">Filter Deals</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { SPECIAL_FILTERS.forEach(f => { if (activeFilters.has(f.id)) onFilterToggle(f.id); }); }}
                  className="text-[10px] text-purple-300 hover:text-white flex items-center gap-0.5 transition-colors"
                >
                  <X size={10} /> Clear all
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {SPECIAL_FILTERS.map(f => {
                const isActive = activeFilters.has(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => onFilterToggle(f.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600/80 ring-1 ring-purple-400"
                        : "hover:bg-white/10"
                    }`}
                  >
                    <span className="text-base leading-none">{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-white leading-tight">{f.label}</div>
                      <div className="text-[10px] leading-tight mt-0.5" style={{ color: "#94a3b8" }}>{f.description}</div>
                    </div>
                    {isActive && (
                      <div className="w-4 h-4 rounded-full bg-purple-400 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
