import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type LightboxProps = {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
};

/**
 * Full-screen product image viewer: scroll or pinch buttons to zoom,
 * drag to pan when zoomed, Esc / backdrop click to close.
 */
export function ImageLightbox({ src, alt, open, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setScale((s) => clamp(s * factor, MIN_SCALE, MAX_SCALE));
  }, []);

  // Reset transform whenever the viewer opens.
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Non-passive wheel handler so we can preventDefault page scroll.
  useEffect(() => {
    if (!open) return;
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale((s) => {
        const next = clamp(s * Math.exp(-event.deltaY * 0.0015), MIN_SCALE, MAX_SCALE);
        if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
        return next;
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [open]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (scale <= MIN_SCALE) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const limit = (scale - 1) * 600;
    setOffset({
      x: clamp(drag.baseX + (event.clientX - drag.startX), -limit, limit),
      y: clamp(drag.baseY + (event.clientY - drag.startY), -limit, limit),
    });
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const toggleZoom = () => {
    if (scale > MIN_SCALE) {
      reset();
    } else {
      setScale(2.5);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — enlarged view`}
      data-testid="dialog-lightbox"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close enlarged view"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        data-testid="button-lightbox-close"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <div className="absolute left-4 bottom-4 z-10 flex items-center gap-1 rounded-full bg-black/60 p-1 text-white backdrop-blur-sm">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.4)}
          disabled={scale <= MIN_SCALE}
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-40"
          data-testid="button-zoom-out"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <span className="w-12 text-center text-xs font-semibold tabular-nums" data-testid="text-zoom-level">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          disabled={scale >= MAX_SCALE}
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-40"
          data-testid="button-zoom-in"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={scale <= MIN_SCALE}
          aria-label="Reset zoom"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-40"
          data-testid="button-zoom-reset"
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs text-white backdrop-blur-sm sm:block">
        Scroll to zoom · drag to pan · Esc to close
      </p>

      <div
        ref={stageRef}
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden",
          scale > MIN_SCALE ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        onDoubleClick={toggleZoom}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[85vh] max-w-[92vw] select-none object-contain drop-shadow-2xl transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
          data-testid="img-lightbox"
        />
      </div>
    </div>
  );
}

/** Hover overlay button signalling the image can be enlarged. */
export function ZoomHint() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover/enlarge:bg-black/20 group-hover/enlarge:opacity-100">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg">
        <ZoomIn className="h-5 w-5" aria-hidden />
      </span>
    </span>
  );
}
