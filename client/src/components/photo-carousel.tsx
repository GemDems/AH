import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCarouselProps {
  images: string[];
  title: string;
  className?: string;
}

export default function PhotoCarousel({ images, title, className = "" }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Filter out empty images
  const validImages = images.filter(img => img && img.trim());
  
  if (validImages.length === 0) {
    // Return gradient background when no images
    return (
      <div className={`relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl ${className}`}>
        <div className="text-center px-4">
          <div className="text-2xl mb-2">💎</div>
          <div className="text-sm opacity-90">Premium Deal</div>
        </div>
      </div>
    );
  }

  // For single image, just show the image without carousel controls
  if (validImages.length === 1) {
    return (
      <div className={`relative bg-white flex items-center justify-center ${className}`}>
        <img
          src={validImages[0]}
          alt={title}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to gradient if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        
        {/* Fallback gradient (hidden by default) */}
        <div className="hidden absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          <div className="text-center">
            <div className="text-2xl mb-2">💎</div>
            <div className="text-sm opacity-90">Premium Deal</div>
          </div>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const prevImage = () => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // Touch handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(0); // Reset touch end
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextImage(); // Swipe left - next image
    } else if (distance < -minSwipeDistance) {
      prevImage(); // Swipe right - previous image
    }
    
    // Reset touch values
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div 
      className={`relative overflow-hidden group bg-white flex items-center justify-center ${className} ${
        isTransitioning ? 'ring-2 ring-blue-400/50 ring-offset-2' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        background: isTransitioning ? 
          'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))' : 
          'transparent',
      }}
    >
      {/* Main Image */}
      <img
        src={validImages[currentIndex]}
        alt={`${title} - Image ${currentIndex + 1}`}
        className={`w-full h-full object-contain transition-all duration-500 ease-out transform ${
          isTransitioning ? 'scale-105' : 'scale-100'
        }`}
        style={{
          transform: touchEnd && touchStart ? 
            `translateX(${(touchStart - touchEnd) * 0.3}px) ${isTransitioning ? 'scale(1.05)' : 'scale(1)'}` : 
            isTransitioning ? 'scale(1.05)' : 'scale(1)',
          filter: touchEnd && Math.abs(touchStart - touchEnd) > 20 ? 'brightness(1.1)' : 'brightness(1)',
        }}
        onError={(e) => {
          // Fallback to gradient if image fails to load
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      
      {/* Fallback gradient (hidden by default) */}
      <div className="hidden absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
        <div className="text-center">
          <div className="text-2xl mb-2">💎</div>
          <div className="text-sm opacity-90">Premium Deal</div>
        </div>
      </div>

      {/* Navigation Arrows - only show if multiple images */}
      {validImages.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 backdrop-blur-sm z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevImage();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 backdrop-blur-sm z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              nextImage();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Image Indicators */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
            {validImages.map((_, index) => (
              <button
                key={index}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 hover:scale-125 ${
                  index === currentIndex ? 'bg-white shadow-lg' : 'bg-white/60 hover:bg-white/80'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}