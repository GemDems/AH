import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  label: string;
  emoji: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategories: Set<string>;
  onCategoryToggle: (id: string) => void;
}

export default function CategoryFilter({ categories, activeCategories, onCategoryToggle }: CategoryFilterProps) {
  return (
    <div className="mb-8 flex flex-wrap justify-center gap-3">
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
    </div>
  );
}
