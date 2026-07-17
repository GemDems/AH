import { useState } from "react";
import { Heart, Plus, Trash2 } from "lucide-react";

export default function WishlistSection() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("wishlist_items") || "[]");
    } catch {
      return [];
    }
  });

  const saveItems = (next: string[]) => {
    setItems(next);
    localStorage.setItem("wishlist_items", JSON.stringify(next));
  };

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    saveItems([...items, trimmed]);
    setInput("");
  };

  const handleRemove = (idx: number) => {
    saveItems(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-950 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Heart className="w-5 h-5 text-pink-400" />
          <h2 className="text-white text-lg font-semibold">My Wishlist</h2>
        </div>
        <p className="text-gray-400 text-sm text-center mb-6">
          Type in anything you want us to find a deal for.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. wireless headphones, standing desk…"
            maxLength={80}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
            title="Add to wishlist"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                  <span className="text-white text-sm">{item}</span>
                </div>
                <button
                  onClick={() => handleRemove(idx)}
                  className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length === 0 && (
          <p className="text-center text-gray-600 text-xs mt-2">No items yet — add something above!</p>
        )}
      </div>
    </div>
  );
}
