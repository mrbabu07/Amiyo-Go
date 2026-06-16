import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  PlayCircle,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { toAssetUrl } from "../utils/url";

const fallbackImage =
  "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=900&h=900&fit=crop";

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []);

const unique = (items) => [...new Set(items.filter(Boolean))];

export default function ProductMediaGallery({
  product,
  selectedVariant,
  selectedImage,
  onImageSelect,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const touchRef = useRef({ startX: 0, startDistance: 0, zoom: 1 });

  const media = useMemo(() => {
    const variantImages = unique([
      ...asArray(selectedVariant?.images),
      selectedVariant?.image,
      selectedVariant?.imageUrl,
      selectedVariant?.coverImage,
    ]);
    const detailImages = product?.detail?.media?.images || [];
    const productImages = unique([
      ...variantImages,
      ...detailImages,
      ...asArray(product?.images),
      product?.image,
      product?.coverImage,
    ]);
    const imageItems = (productImages.length ? productImages : [fallbackImage]).map((url, index) => ({
      type: "image",
      sourceUrl: url,
      url: toAssetUrl(url) || fallbackImage,
      title: index === 0 ? product?.title || "Product image" : `${product?.title || "Product"} ${index + 1}`,
    }));
    const rawVideos = [
          ...asArray(product?.videos),
          product?.video,
          product?.videoUrl,
          product?.demoVideo,
        ].filter(Boolean);
    const videos = product?.detail?.media?.videos?.length
      ? product.detail.media.videos
      : rawVideos
          .map((video, index) => {
            if (!video) return null;
            if (typeof video === "string") return { url: toAssetUrl(video), title: index === 0 ? "Product demo" : `Video ${index + 1}` };
            return {
              url: toAssetUrl(video.url || video.src || video.videoUrl),
              title: video.title || video.name || `Video ${index + 1}`,
              thumbnail: toAssetUrl(video.thumbnail || video.poster || null),
            };
          })
          .filter((video) => video?.url);
    const videoItems = videos
      .map((video, index) => {
        if (typeof video === "string") {
          return {
            type: "video",
            url: toAssetUrl(video),
            title: index === 0 ? "Product demo" : `Video ${index + 1}`,
          };
        }

        return {
          type: "video",
          ...video,
          url: toAssetUrl(video.url),
          thumbnail: toAssetUrl(video.thumbnail),
        };
      })
      .filter((video) => video.url);
    return [...imageItems, ...videoItems];
  }, [product, selectedVariant]);

  useEffect(() => {
    if (!selectedImage) return undefined;
    const normalizedSelectedImage = toAssetUrl(selectedImage);
    const index = media.findIndex(
      (item) =>
        item.type === "image" &&
        (item.url === normalizedSelectedImage || item.sourceUrl === selectedImage),
    );
    if (index < 0) return undefined;

    const timeoutId = setTimeout(() => setActiveIndex(index), 0);
    return () => clearTimeout(timeoutId);
  }, [media, selectedImage]);

  const activeMedia = media[activeIndex] || media[0];

  const getImageFocus = (imageUrl) =>
    product?.imageSettings?.crops?.[imageUrl]?.objectPosition ||
    product?.imageSettings?.crops?.[media.find((item) => item.url === imageUrl)?.sourceUrl]?.objectPosition ||
    "center";

  const selectIndex = (nextIndex) => {
    const boundedIndex = (nextIndex + media.length) % media.length;
    setActiveIndex(boundedIndex);
    setImageLoaded(false);
    setZoom(1);
    if (media[boundedIndex]?.type === "image") {
      onImageSelect?.(media[boundedIndex].url);
    }
  };

  const handleTouchStart = (event) => {
    if (event.touches.length === 1) {
      touchRef.current.startX = event.touches[0].clientX;
      return;
    }
    if (event.touches.length === 2) {
      const [first, second] = event.touches;
      touchRef.current.startDistance = Math.hypot(
        first.clientX - second.clientX,
        first.clientY - second.clientY,
      );
      touchRef.current.zoom = zoom;
    }
  };

  const handleTouchMove = (event) => {
    if (!showModal || event.touches.length !== 2) return;
    const [first, second] = event.touches;
    const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    const ratio = distance / Math.max(touchRef.current.startDistance, 1);
    setZoom(Math.min(Math.max(touchRef.current.zoom * ratio, 1), 4));
  };

  const handleTouchEnd = (event) => {
    if (event.changedTouches.length === 0 || showModal) return;
    const delta = event.changedTouches[0].clientX - touchRef.current.startX;
    if (Math.abs(delta) < 45) return;
    selectIndex(delta < 0 ? activeIndex + 1 : activeIndex - 1);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
      <div
        className="group relative aspect-square overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeMedia?.type === "video" ? (
          <video
            key={activeMedia.url}
            src={activeMedia.url}
            poster={activeMedia.thumbnail}
            controls
            playsInline
            className="h-full w-full bg-black object-contain"
          />
        ) : (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 animate-pulse">
                <Maximize2 className="h-10 w-10 text-gray-400" />
              </div>
            )}
            <img
              src={activeMedia?.url || fallbackImage}
              alt={activeMedia?.title || product?.title || "Product image"}
              style={{ objectPosition: getImageFocus(activeMedia?.url) }}
              className={`h-full w-full cursor-zoom-in object-contain p-3 transition-opacity duration-300 sm:p-5 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onClick={() => setShowModal(true)}
              loading="eager"
              fetchPriority="high"
              decoding="sync"
            />
          </>
        )}

        {media.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous media"
              onClick={() => selectIndex(activeIndex - 1)}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/95 text-gray-800 shadow-sm ring-1 ring-gray-200 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-gray-900/90 dark:text-gray-100 dark:ring-gray-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next media"
              onClick={() => selectIndex(activeIndex + 1)}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/95 text-gray-800 shadow-sm ring-1 ring-gray-200 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-gray-900/90 dark:text-gray-100 dark:ring-gray-800"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {activeMedia?.type === "image" && (
          <button
            type="button"
            aria-label="Zoom product image"
            onClick={() => setShowModal(true)}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950/70 text-white opacity-100 transition hover:bg-gray-950/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:opacity-0 md:group-hover:opacity-100"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {media.map((item, index) => (
          <button
            key={`${item.type}-${item.url}-${index}`}
            type="button"
            onClick={() => selectIndex(index)}
            className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-gray-950 ${
              activeIndex === index
                ? "border-primary-500 shadow-sm ring-2 ring-primary-100 dark:ring-primary-900/50"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
            }`}
          >
            {item.type === "video" ? (
              <div className="flex h-full w-full items-center justify-center bg-gray-950 text-white">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover opacity-70" loading="lazy" decoding="async" />
                ) : null}
                <PlayCircle className="absolute h-7 w-7" />
              </div>
            ) : (
              <img
                src={item.url}
                alt={item.title}
                style={{ objectPosition: getImageFocus(item.url) }}
                className="h-full w-full object-contain p-1.5"
                loading="lazy"
                decoding="async"
              />
            )}
          </button>
        ))}
      </div>

      {showModal && activeMedia?.type === "image" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowModal(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <div className="absolute right-4 top-4 flex gap-2">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={(event) => {
                event.stopPropagation();
                setZoom((value) => Math.max(value - 0.35, 1));
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={(event) => {
                event.stopPropagation();
                setZoom((value) => Math.min(value + 0.35, 4));
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Reset zoom"
              onClick={(event) => {
                event.stopPropagation();
                setZoom(1);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Close image zoom"
              onClick={() => setShowModal(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <img
            src={activeMedia.url}
            alt={activeMedia.title}
            className="max-h-full max-w-full object-contain transition-transform"
            style={{ transform: `scale(${zoom})` }}
            onClick={(event) => event.stopPropagation()}
            loading="eager"
            decoding="async"
            onWheel={(event) => {
              event.preventDefault();
              const direction = event.deltaY < 0 ? 0.15 : -0.15;
              setZoom((value) => Math.min(Math.max(value + direction, 1), 4));
            }}
          />
        </div>
      )}
    </div>
  );
}
