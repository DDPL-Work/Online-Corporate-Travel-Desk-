import React, { useState, useEffect, useRef } from "react";

/**
 * LazyImage Component
 * Optimizes image delivery using native lazy loading or dynamic IntersectionObserver.
 * Integrates an elegant placeholder skeleton and a smooth fade-in effect to enhance UX and prevent CLS.
 */
const LazyImage = ({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  placeholderSrc = "",
  width,
  height,
  aspectRatio,
  lazy = true,
  decoding = "async",
  onClick,
  style = {},
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(!lazy);
  const imgRef = useRef();

  useEffect(() => {
    if (!lazy) return;

    // Use IntersectionObserver as a fallback/wrapper for advanced loading behaviors
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Pre-fetch image 200px before entering viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, src]);

  const handleLoad = () => {
    setLoaded(true);
  };

  const wrapperStyle = {
    position: "relative",
    overflow: "hidden",
    display: "inline-block",
    width: width || style.width || "100%",
    height: height || style.height || "100%",
    aspectRatio: aspectRatio || style.aspectRatio,
  };

  const imageStyle = {
    ...style,
    width: "100%",
    height: "100%",
    transition: "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), filter 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
    opacity: loaded ? 1 : 0,
    filter: loaded ? "none" : "blur(4px)",
  };

  return (
    <div
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={wrapperStyle}
    >
      {/* Shimmering Skeleton Loader */}
      {!loaded && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          {placeholderSrc ? (
            <img
              src={placeholderSrc}
              alt=""
              className="w-full h-full object-cover blur-md opacity-40"
              loading="eager"
            />
          ) : (
            <div 
              className="absolute inset-0 bg-slate-200 animate-pulse"
              style={{
                background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite linear"
              }}
            />
          )}
        </div>
      )}

      {/* Styled shimmer animation keyframe injection if not already in global CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />

      {/* Main Image */}
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          decoding={decoding}
          loading={lazy ? "lazy" : "eager"}
          className={`object-cover ${loaded ? "" : "absolute inset-0"} ${imgClassName}`}
          style={imageStyle}
          onClick={onClick}
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
