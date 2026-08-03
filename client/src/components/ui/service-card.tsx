import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "relative flex flex-col justify-between w-full p-6 overflow-hidden rounded-xl shadow-sm transition-shadow duration-300 ease-in-out group hover:shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        red: "bg-red-500/90 text-primary-foreground",
        blue: "bg-blue-500/90 text-primary-foreground",
        gray: "bg-secondary text-secondary-foreground",
        dark: "bg-[#1e2235] text-white",
        purple: "bg-purple-600/90 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ServiceCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  title: string;
  description: string;
  href?: string;
  imgSrc: string;
  imgAlt: string;
  linkLabel?: string;
  onLinkClick?: () => void;
}

const ServiceCard = React.forwardRef<HTMLDivElement, ServiceCardProps>(
  ({ className, variant, title, description, href, imgSrc, imgAlt, linkLabel = "LEARN MORE", onLinkClick, ...props }, ref) => {

    const cardAnimation = {
      hover: { scale: 1.02, transition: { duration: 0.3 } },
    };

    const imageAnimation = {
      hover: {
        scale: 1.1,
        rotate: 3,
        x: 10,
        transition: { duration: 0.4, ease: "easeInOut" },
      },
    };

    const arrowAnimation = {
      hover: {
        x: 5,
        transition: { duration: 0.3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" as const },
      },
    };

    const handleClick = (e: React.MouseEvent) => {
      if (onLinkClick) {
        e.preventDefault();
        onLinkClick();
      }
    };

    return (
      <motion.div
        className={cn(cardVariants({ variant, className }))}
        ref={ref}
        variants={cardAnimation}
        whileHover="hover"
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        <div className="relative z-10 flex flex-col h-full">
          <h3 className="text-xl font-bold tracking-tight mb-1">{title}</h3>
          <p className="text-sm opacity-80 mb-4 leading-snug">{description}</p>
          <a
            href={href ?? "#"}
            onClick={handleClick}
            aria-label={`${linkLabel} about ${title}`}
            className="mt-auto flex items-center text-sm font-semibold group-hover:underline"
          >
            {linkLabel}
            <motion.div variants={arrowAnimation}>
              <ArrowRight className="ml-2 h-4 w-4" />
            </motion.div>
          </a>
        </div>

        <motion.img
          src={imgSrc}
          alt={imgAlt}
          className="absolute -right-8 -bottom-8 w-36 h-36 object-contain opacity-80 group-hover:opacity-100"
          variants={imageAnimation}
        />
      </motion.div>
    );
  }
);
ServiceCard.displayName = "ServiceCard";

export { ServiceCard };
