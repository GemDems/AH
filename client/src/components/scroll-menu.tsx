import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface ScrollMenuProps {
  onCategorySelect: (category: string) => void;
  onExit: () => void;
}

export default function ScrollMenu({ onCategorySelect, onExit }: ScrollMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isProductsOnly, setIsProductsOnly] = useState(false);

  const categories = [
    { id: "all", label: "All Deals", emoji: "" },
    { id: "hot", label: "Hot Deals", emoji: "🔥" },
    { id: "tech", label: "Tech & Gadgets", emoji: "📱" },
    { id: "fashion", label: "Fashion", emoji: "👔" },
    { id: "health", label: "Health & Fitness", emoji: "💪" },
    { id: "travel", label: "Travel", emoji: "✈️" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      // Show menu when scrolled down at least 100px
      const shouldShow = window.scrollY > 100;
      setIsVisible(shouldShow);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    setIsProductsOnly(true);
    onCategorySelect(categoryId);
    
    // Scroll to top to show products
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExit = () => {
    setIsProductsOnly(false);
    onExit();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 z-50 bg-white shadow-lg border-b border-gray-200 transition-all duration-300 ease-in-out">
      <div className="flex items-center px-4 py-3">
        {/* Categories Menu */}
        <div className="flex items-center space-x-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-sm font-medium"
            >
              {category.emoji && <span>{category.emoji}</span>}
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Exit Button - Only show when in products-only mode */}
        {isProductsOnly && (
          <button
            onClick={handleExit}
            className="ml-auto flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-sm font-medium text-gray-600"
          >
            <X className="w-4 h-4" />
            <span>Exit</span>
          </button>
        )}
      </div>
    </div>
  );
}