import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function FloatingTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      name: "Sarah M.",
      location: "New York",
      text: "Saved $347 on my purchase! This site is amazing!",
      rating: 5,
      product: "Smart Watch Deal"
    },
    {
      name: "Mike R.",
      location: "California", 
      text: "Found the exact deal I wanted. Fast & secure!",
      rating: 5,
      product: "Laptop Bundle"
    },
    {
      name: "Emma K.",
      location: "Texas",
      text: "Best prices guaranteed! Will definitely come back.",
      rating: 5,
      product: "Fitness Equipment"
    },
    {
      name: "David L.",
      location: "Florida",
      text: "Incredible savings and super fast delivery!",
      rating: 5,
      product: "Gaming Setup"
    },
    {
      name: "Lisa P.",
      location: "Washington",
      text: "This is my go-to site for exclusive deals now!",
      rating: 5,
      product: "Kitchen Appliances"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="fixed bottom-6 left-6 z-40 max-w-sm">
      <Card className="bg-gradient-to-br from-white via-gray-50 to-white border-2 border-trust-green/30 shadow-2xl p-4 transform transition-all duration-500 hover:scale-105">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-trust-green to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {testimonials[currentIndex].name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <span className="font-bold text-gray-900 text-sm">
                {testimonials[currentIndex].name}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                • {testimonials[currentIndex].location}
              </span>
            </div>
            
            <div className="flex items-center mb-2">
              {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
              ))}
            </div>
            
            <p className="text-sm text-gray-700 mb-2">
              "{testimonials[currentIndex].text}"
            </p>
            
            <div className="text-xs text-trust-green font-medium">
              ✅ Verified purchase: {testimonials[currentIndex].product}
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-3 space-x-1">
          {testimonials.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-trust-green' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}