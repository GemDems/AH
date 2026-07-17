import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  label: string;
  emoji: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="mb-8 flex flex-wrap justify-center gap-3">
      {categories.map((category) => (
        <Button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          variant={activeCategory === category.id ? "default" : "outline"}
          className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
            activeCategory === category.id
              ? "bg-conversion-blue hover:bg-blue-700 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100 border"
          }`}
        >
          {category.emoji && `${category.emoji} `}{category.label}
        </Button>
      ))}
    </div>
  );
}
