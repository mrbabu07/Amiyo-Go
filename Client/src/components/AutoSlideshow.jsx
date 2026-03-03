import { useState, useEffect, useRef } from "react";

export default function AutoSlideshow({
  images = [],
  autoPlay = true,
  interval = 3000,
  showDots = true,
  showArrows = true,
  className = "",
  aspectRatio = "aspect-square",
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const intervalRef = useRef(null);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) =>
          prevIndex === images.length - 1 ? 0 : prevIndex + 1,
        );
      }, interval);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, images.length, interval]);

  // Pause on hover
  const handleMouseEnter = () => {
    if (autoPlay) setIsPlaying(false);
  };

  const handleMouseLeave = () => {
    if (autoPlay) setIsPlaying(true);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (!images || images.length === 0) {
    return (
      <div
        className={`${aspectRatio} bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div
        className={`${aspectRatio} bg-gray-100 rounded-lg overflow-hidden ${className}`}
      >
        <img
          src={images[0]}
          alt="Product"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${aspectRatio} bg-gray-100 rounded-lg overflow-hidden group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Image */}
      <div className="relative w-full h-full">
        <img
          src={images[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-500"
        />

        {/* Image Counter */}
        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 text-white text-sm rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Play/Pause Button */}
        {autoPlay && (
          <button
            onClick={togglePlayPause}
            className="absolute top-4 left-4 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          >
            {isPlaying ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 ml-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h10a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Navigation Arrows */}
      {showArrows && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
          >
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
          >
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {showDots && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white scale-125"
                  : "bg-white/60 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{
              width: `${((Date.now() % interval) / interval) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
