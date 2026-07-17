import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProductImageGroup {
  id: string;
  images: string[];
}

const variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };

function useSetActiveProduct(initialColor = 0) {
  const [state, setState] = React.useState({
    activeColor: initialColor,
    activeImage: 0,
  });

  const handleColorChange = React.useCallback((index: number) => {
    setState((prev) => ({ ...prev, activeColor: index }));
  }, []);

  const handleMouse = React.useCallback((event: "enter" | "leave") => {
    setState((prev) => ({
      ...prev,
      activeImage: event === "enter" ? 1 : 0,
    }));
  }, []);

  return {
    ...state,
    handleColorChange,
    handleMouse,
  };
}

interface ProductCardImagesInnerProps {
  productImages: ProductImageGroup[];
  activeColor: number;
  activeImage: number;
  handleMouse: (event: "enter" | "leave") => void;
  title: string;
  className?: string;
}

function ProductCardImagesInner({
  productImages,
  activeColor,
  activeImage,
  handleMouse,
  title,
  className,
}: ProductCardImagesInnerProps) {
  const handleMouseEnter = () => handleMouse("enter");
  const handleMouseLeave = () => handleMouse("leave");

  return (
    <div className={cn("relative", className)}>
      {productImages.map((productImage, index) => (
        <motion.div
          key={productImage.id}
          variants={variants}
          animate={index === activeColor ? "visible" : "hidden"}
          className="absolute inset-0 cursor-pointer overflow-hidden"
          exit="hidden"
        >
          <div
            className="relative h-full w-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <AnimatePresence>
              <motion.div
                key={0}
                variants={variants}
                className="pointer-events-none absolute inset-0 size-full"
                exit="hidden"
              >
                <img
                  alt={`${title} - view ${index + 1}`}
                  className="h-full w-full object-contain"
                  src={productImage.images[0]}
                />
              </motion.div>
              <motion.div
                key={1}
                variants={variants}
                className="pointer-events-none absolute inset-0 size-full"
                animate={
                  activeImage === 1 &&
                  productImage.id === productImages[activeColor].id
                    ? "visible"
                    : "hidden"
                }
                exit="hidden"
              >
                <img
                  alt={`${title} - view ${index + 1} alt`}
                  className="h-full w-full object-contain"
                  src={productImage.images[1]}
                  loading="lazy"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const springTransition = {
  type: "spring" as const,
  stiffness: 500,
  damping: 50,
  mass: 1,
};

interface ProductThumbsProps {
  productId: string;
  thumbs: ProductImageGroup[];
  activeColor: number;
  setActiveColor: (index: number) => void;
  className?: string;
}

function ProductThumbs({
  productId,
  thumbs,
  activeColor,
  setActiveColor,
  className,
}: ProductThumbsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-2", className)} data-testid="container-image-thumbs">
      {thumbs.map((thumb, index) => (
        <button
          key={thumb.id}
          type="button"
          aria-label="show product image"
          className="relative size-4 appearance-none rounded-full border border-gray-300 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumb.images[0]})` }}
          onMouseEnter={(e) => { e.stopPropagation(); setActiveColor(index); }}
          onClick={(e) => { e.stopPropagation(); setActiveColor(index); }}
          data-testid={`button-image-thumb-${index}`}
        >
          {index === activeColor ? (
            <motion.div
              layoutId={productId}
              className="absolute -left-[2px] -top-[2px] size-[18px] rounded-full border border-conversion-blue"
              transition={springTransition}
            />
          ) : null}
        </button>
      ))}
    </div>
  );
}

interface ProductCardImagesProps {
  images: string[];
  title: string;
  className?: string;
}

export default function ProductCardImages({
  images,
  title,
  className,
}: ProductCardImagesProps) {
  const validImages = images.filter((img) => img && img.trim());
  const { activeColor, activeImage, handleColorChange, handleMouse } =
    useSetActiveProduct();

  if (validImages.length === 0) {
    return (
      <div
        className={cn(
          "relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl",
          className
        )}
      >
        <div className="text-center px-4">
          <div className="text-2xl mb-2">💎</div>
          <div className="text-sm opacity-90">Premium Deal</div>
        </div>
      </div>
    );
  }

  const productImages: ProductImageGroup[] = validImages.map((img, index) => ({
    id: `${title}-image-${index}`,
    images: [img, validImages[(index + 1) % validImages.length]],
  }));

  return (
    <div id={`product-card-${title}`} className="relative" data-testid="container-product-card-images">
      <ProductCardImagesInner
        productImages={productImages}
        activeColor={activeColor}
        activeImage={activeImage}
        handleMouse={handleMouse}
        title={title}
        className={cn("bg-white overflow-hidden", className)}
      />

      {productImages.length > 1 ? (
        <ProductThumbs
          productId={`${title}-active-thumb`}
          thumbs={productImages}
          activeColor={activeColor}
          setActiveColor={handleColorChange}
        />
      ) : null}
    </div>
  );
}
