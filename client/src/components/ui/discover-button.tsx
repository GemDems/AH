import { motion } from "framer-motion";
import {
  FavouriteIcon,
  Fire02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export const DISCOVER_TABS = [
  {
    id: "popular",
    label: "Popular",
    icon: Fire02Icon,
    // #EBAD25 is the true colorimetric complement of the site's brand blue
    // (#2563EB, used for the "DEALS" heading and search button) — same hue
    // wheel position 180° opposite, matched saturation/lightness, landing in
    // true "orange" hue territory (~41°, next to CSS orange's 38.8°). Blue
    // and orange are opposites on the color wheel, so this reads as the
    // maximum-contrast, most attention-grabbing choice against the rest of
    // the page for the "Popular" tab.
    color: "text-[#EBAD25]",
    fill: "fill-[#EBAD25]",
    bg: "bg-[#EBAD25]/10",
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: FavouriteIcon,
    color: "text-gray-900",
    fill: "fill-gray-900",
    bg: "bg-gray-100",
  },
] as const;

export type DiscoverTab = (typeof DISCOVER_TABS)[number]["id"];

interface DiscoverButtonProps {
  activeTab: DiscoverTab;
  onTabChange: (tab: DiscoverTab) => void;
}

const SPRING = { type: "spring", damping: 20, stiffness: 230, mass: 1.2 } as const;

export function DiscoverButton({ activeTab, onTabChange }: DiscoverButtonProps) {
  return (
    <motion.div
      layout
      transition={SPRING}
      className="flex items-center bg-white rounded-[3rem] shadow-lg h-[52px] overflow-hidden relative"
    >
      <div className="flex items-center gap-1 px-[5px]">
        {DISCOVER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[3rem] transition-colors relative ${
              activeTab === tab.id ? tab.color : "text-gray-700"
            }`}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId="discover-bubble"
                className={`absolute inset-0 z-0 ${tab.bg}`}
                style={{ borderRadius: 9999 }}
                transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
              />
            )}
            <HugeiconsIcon
              icon={tab.icon}
              className={`w-4 h-4 relative z-10 ${activeTab === tab.id ? tab.fill : ""}`}
            />
            <span className="font-semibold font-mono uppercase text-xs relative z-10">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default DiscoverButton;
