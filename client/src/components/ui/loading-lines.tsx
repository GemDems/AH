import React from "react";

interface LoadingLinesProps {
  className?: string;
}

const LoadingLines: React.FC<LoadingLinesProps> = ({ className = "" }) => {
  const letters = "Loading".split("");

  return (
    <>
      <style>{`
        @keyframes loadingLetterAnim {
          0%   { opacity: 0; }
          5%   { opacity: 1; text-shadow: 0 0 4px #fff; transform: scale(1.1) translateY(-2px); }
          20%  { opacity: 0.2; }
          100% { opacity: 0; }
        }
        @keyframes loadingTransformAnim {
          0%   { transform: translate(-55%); }
          100% { transform: translate(55%); }
        }
        @keyframes loadingOpacityAnim {
          0%, 100% { opacity: 0; }
          15%       { opacity: 1; }
          65%       { opacity: 0; }
        }
      `}</style>
      <div
        className={`relative flex items-center justify-center h-[120px] w-auto font-semibold select-none text-white scale-[2] ${className}`}
      >
        {/* Animated letters */}
        {letters.map((letter, idx) => (
          <span
            key={idx}
            className="relative inline-block opacity-0 z-[2] text-black dark:text-white"
            style={{
              animation: "loadingLetterAnim 4s linear infinite",
              animationDelay: `${0.1 + idx * 0.105}s`,
            }}
          >
            {letter}
          </span>
        ))}

        {/* Loader background */}
        <div className="absolute top-0 left-0 w-full h-full z-[1] bg-transparent [mask:repeating-linear-gradient(90deg,transparent_0,transparent_6px,black_7px,black_8px)]">
          <div
            className="absolute top-0 left-0 w-full h-full
              [background-image:radial-gradient(circle_at_50%_50%,#ff0_0%,transparent_50%),radial-gradient(circle_at_45%_45%,#f00_0%,transparent_45%),radial-gradient(circle_at_55%_55%,#0ff_0%,transparent_45%),radial-gradient(circle_at_45%_55%,#0f0_0%,transparent_45%),radial-gradient(circle_at_55%_45%,#00f_0%,transparent_45%)]
              [mask:radial-gradient(circle_at_50%_50%,transparent_0%,transparent_10%,black_25%)]"
            style={{
              animation:
                "loadingTransformAnim 2s infinite alternate cubic-bezier(0.6,0.8,0.5,1), loadingOpacityAnim 4s infinite",
            }}
          />
        </div>
      </div>
    </>
  );
};

export default LoadingLines;
