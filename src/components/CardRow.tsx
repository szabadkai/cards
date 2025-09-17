import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
  useDndMonitor,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, useMotionValue, animate, useTransform } from 'framer-motion';

export type Card = {
  id: string;
  label: string;
  gradient: string;
  image?: string; // optional image URL for face artwork
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type CardRowTheme = 'dark' | 'light';

export type CardRowProps = {
  items: Card[];
  theme?: CardRowTheme;
  resetKey?: string; // default 'r'
  onOrderChange?: (order: string[]) => void;
};

type DraggableCardProps = {
  id: string;
  label: string;
  gradient: string;
  image?: string;
  index: number;
  overlapClamp: { normal: string; active: string };
  // Layout shaping
  baseY: number;
  baseRotate: number;
  // Interactive sibling displacement when dragging over
  hoverOffsetX: number;
  // To expose the DOM node to parent for measurement
  setOuterRef?: (id: string, el: HTMLDivElement | null) => void;
  // Whether any drag is active and whether this card is the active one
  dragMeta: { draggingId: string | null };
  // Accessibility
  ariaDescribedById?: string;
  count: number;
  theme: CardRowTheme;
};

function DraggableCard({ id, label, gradient, image, index, overlapClamp, baseY, baseRotate, hoverOffsetX, setOuterRef, dragMeta, ariaDescribedById, count, theme }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Motion for spring-following the pointer during drag
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Tilt from pointer position across the card surface
  const tilt = useMotionValue(0);
  // Rotate a touch more based on drag x as well, then combine
  const rotFromX = useTransform(x, (latest) => clamp(latest * 0.04, -8, 8));
  const rotateZ = useTransform([tilt, rotFromX], (vals) => (vals[0] as number) + (vals[1] as number));

  useEffect(() => {
    const tx = transform?.x ?? 0;
    const ty = transform?.y ?? 0;

    const controlsX = animate(x, isDragging ? tx : 0, {
      type: 'spring',
      stiffness: 600,
      damping: 36,
      mass: 0.6,
    });
    const controlsY = animate(y, isDragging ? ty : 0, {
      type: 'spring',
      stiffness: 600,
      damping: 36,
      mass: 0.6,
    });

    return () => {
      controlsX.stop();
      controlsY.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, transform?.x, transform?.y]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const progress = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const deg = (progress - 0.5) * 12; // -6deg .. +6deg
      tilt.set(deg);
    },
    [tilt]
  );

  const onMouseLeave = useCallback(() => {
    animate(tilt, 0, { type: 'spring', stiffness: 500, damping: 30 });
  }, [tilt]);

  // During dragging, we use Framer Motion x/y springs on the outer wrapper; otherwise combine dnd-kit transform with our curve + proximity transforms so hitboxes follow visuals.
  const dndTransform = !isDragging && transform ? CSS.Transform.toString(transform) : '';
  const curveY = dragMeta.draggingId && dragMeta.draggingId !== id ? 0 : baseY;
  const curveRotate = dragMeta.draggingId && dragMeta.draggingId !== id ? 0 : baseRotate;
  const styleTransform = `${dndTransform} translateX(${hoverOffsetX.toFixed(2)}px) translateY(${curveY.toFixed(2)}px) rotate(${curveRotate.toFixed(2)}deg)`.trim();

  const baseShadow = theme === 'light'
    ? '0 6px 16px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.06)'
    : '0 6px 16px rgba(0,0,0,0.20), 0 2px 6px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.08)';
  const hoverShadow = theme === 'light'
    ? '0 10px 28px rgba(0,0,0,0.16), 0 6px 16px rgba(0,0,0,0.10), 0 0 30px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.08)'
    : '0 10px 28px rgba(0,0,0,0.26), 0 6px 16px rgba(0,0,0,0.16), 0 0 30px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.12)';
  const dragShadow = theme === 'light'
    ? '0 24px 60px rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.16), 0 0 60px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.10)'
    : '0 24px 60px rgba(0,0,0,0.40), 0 10px 30px rgba(0,0,0,0.22), 0 0 60px rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.18)';

  const cardWidth = 160;
  const cardHeight = 220;

  // Subtle de-emphasis for non-active siblings
  const isSiblingDimmed = !!dragMeta.draggingId && dragMeta.draggingId !== id && !isDragging;
  const siblingScale = isSiblingDimmed ? 0.98 : 1;
  const siblingOpacity = isSiblingDimmed ? 0.92 : 1;

  // Inner wrapper handles subtle de-emphasis only (scale/opacity).

  return (
    <motion.div
      ref={(el) => {
        setNodeRef(el);
        setOuterRef?.(id, el as HTMLDivElement | null);
      }}
      {...attributes}
      {...listeners}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      layout
      style={{
        x: isDragging ? x : undefined,
        y: isDragging ? y : undefined,
        rotateZ: isDragging ? rotateZ : undefined,
        transform: isDragging ? undefined : styleTransform,
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 999 : 10 + index,
        width: cardWidth,
        height: cardHeight,
        borderRadius: 16,
        marginLeft: index === 0 ? 0 : (isDragging ? overlapClamp.active : overlapClamp.normal),
        boxShadow: isDragging ? dragShadow : baseShadow,
        position: 'relative',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        // Smooth layout shift spring when siblings move
        willChange: 'transform',
      }}
      aria-describedby={ariaDescribedById}
      aria-roledescription="draggable card"
      aria-label={`Card ${label}, position ${index + 1} of ${count}`}
    >
      <motion.div
        initial={false}
        animate={{ scale: siblingScale, opacity: siblingOpacity }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 16,
          background: gradient,
          position: 'relative',
        }}
        whileHover={{
          scale: isDragging ? 1 : 1.03,
          boxShadow: hoverShadow,
          transition: { type: 'spring', stiffness: 500, damping: 30 },
        }}
        whileTap={{ scale: isDragging ? 1 : 1.02 }}
      >
        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            // Subtle inner vignette for depth
            boxShadow: theme === 'light'
              ? 'inset 0 18px 36px rgba(0,0,0,0.05), inset 0 -10px 20px rgba(0,0,0,0.04)'
              : 'inset 0 20px 40px rgba(0,0,0,0.10), inset 0 -10px 20px rgba(0,0,0,0.08)',
          }}
        />
        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.12,
            background:
              'radial-gradient(120px 80px at 30% 20%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)',
            mixBlendMode: 'screen',
          }}
        />
        {/* Ingredient image, if provided */}
        {image && (
          <img
            src={image}
            alt={label}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '70%',
              height: '70%',
              transform: 'translate(-50%, -50%)',
              filter: theme === 'light' ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))',
              opacity: 0.96,
              pointerEvents: 'none',
            }}
          />
        )}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 8,
            borderRadius: 12,
            background: theme === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(2px)',
            border: theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.16)',
          }}
        />
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: label.length > 1 ? 24 : 72,
            fontWeight: 800,
            color: theme === 'light' ? '#111827' : 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.25)',
            letterSpacing: 1,
            }}
        >
          {label}
        </span>
      </div>
      </motion.div>
    </motion.div>
  );
}

export default function CardRow({ items, theme = 'dark', resetKey = 'r', onOrderChange }: CardRowProps) {
  const [order, setOrder] = useState<string[]>(items.map((c) => c.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverOffsets, setHoverOffsets] = useState<Record<string, number>>({});
  const [liveMessage, setLiveMessage] = useState<string>("");
  const liveTimerRef = useRef<number | null>(null);

  // Track DOM nodes to compute centers for the proximity push
  const nodeMapRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const setOuterRef = useCallback((id: string, el: HTMLDivElement | null) => {
    nodeMapRef.current.set(id, el);
  }, []);

  // Reset order when items change (e.g., deck switch)
  useEffect(() => {
    setOrder(items.map((c) => c.id));
    setHoverOffsets({});
    nodeMapRef.current.clear();
  }, [items]);

  // External change callback
  useEffect(() => {
    onOrderChange?.(order);
  }, [order, onOrderChange]);

  const byId = useMemo(() => {
    const map = new Map<string, Card>();
    items.forEach((c) => map.set(c.id, c));
    return map;
  }, [items]);

  // Ensure render uses only IDs that exist in the current deck
  const renderOrder = useMemo(() => {
    const filtered = order.filter((id) => byId.has(id));
    return filtered.length ? filtered : items.map((c) => c.id);
  }, [order, byId, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Announce helper
  const announce = useCallback((msg: string) => {
    setLiveMessage(msg);
    if (liveTimerRef.current) {
      window.clearTimeout(liveTimerRef.current);
    }
    liveTimerRef.current = window.setTimeout(() => setLiveMessage("") , 1500);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setOrder((prev) => {
          const oldIndex = prev.indexOf(String(active.id));
          const newIndex = prev.indexOf(String(over.id));
          // Announce movement (1-based positions)
          const label = String(active.id);
          announce(`Moved ${label} from position ${oldIndex + 1} to ${newIndex + 1}.`);
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
      setDraggingId(null);
      setHoverOffsets({});
    },
    [setOrder, announce]
  );

  // Effects component to safely use useDndMonitor under DndContext
  function DndEffects() {
    useDndMonitor({
      onDragStart(event) {
        setDraggingId(String(event.active.id));
        setHoverOffsets({});
        const idx = order.indexOf(String(event.active.id));
        if (idx >= 0) {
          announce(`Picked up ${String(event.active.id)} at position ${idx + 1}.`);
        }
      },
      onDragMove(event) {
        const rect = event.active.rect.current.translated || event.active.rect.current.initial;
        if (!rect) return;
        const pointerX = rect.left + rect.width / 2;
        // Compute smooth radial push for siblings within radius
        const radius = 160; // px
        const maxPush = 34; // px
        const next: Record<string, number> = {};
        for (const id of order) {
          if (id === String(event.active.id)) {
            next[id] = 0;
            continue;
          }
          const el = nodeMapRef.current.get(id);
          if (!el) {
            next[id] = 0;
            continue;
          }
          const b = el.getBoundingClientRect();
          const centerX = b.left + b.width / 2;
          const dx = centerX - pointerX; // positive if card is to the right of pointer
          const dist = Math.abs(dx);
          if (dist > radius) {
            next[id] = 0;
            continue;
          }
          // Ease out cubic influence for smoother falloff
          const norm = Math.min(1, Math.max(0, dist / radius));
          const influence = 1 - norm * norm * norm; // 0..1
          const dir = dx >= 0 ? 1 : -1; // push away
          next[id] = dir * maxPush * influence;
        }
        setHoverOffsets(next);
      },
      onDragCancel() {
        setDraggingId(null);
        setHoverOffsets({});
        announce('Cancelled drag.');
      },
    });
    return null;
  }

  // Keyboard shortcut to reset order
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = resetKey.toLowerCase();
      if (e.key.toLowerCase() === key) {
        setOrder(items.map((c) => c.id));
        announce('Order reset.');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, resetKey, announce]);

  // Slight overlap between cards; relax overlap a little when a card is active
  const overlapClamp = {
    // Slightly stronger overlap to accommodate more cards
    normal: 'clamp(-86px, -7.5vw, -38px)',
    active: 'clamp(-64px, -6.5vw, -26px)',
  };

  // Curve shaping for the row (default state). Parabolic arc.
  const computeCurve = useCallback((idx: number, count: number) => {
    if (count <= 1) return { y: 0, rot: 0 };
    const t = (idx / (count - 1)) * 2 - 1; // -1 .. 1
    // Softer arc: noticeably curved but not extreme.
    const amp = Math.max(60, Math.min(120, 80 + (count - 5) * 6));
    const y = -(1 - t * t) * amp;
    // Subtle fan rotation
    const rotAmp = Math.max(6, Math.min(10, 10 - (count - 5) * 0.4));
    const rot = t * rotAmp;
    return { y, rot };
  }, []);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 12px',
      }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          // Give the row some breathing room
          padding: '12px 0',
        }}
      >
        {/* Screen reader announcements and keyboard help */}
        <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
          {liveMessage}
        </div>
        <p id="cardrow-kbd-instructions" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
          Keyboard: Focus a card, press Space to pick up, use Left/Right arrows to move, press Space or Enter to drop, Escape to cancel. Press "{resetKey.toUpperCase()}" to reset order.
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <DndEffects />
          <SortableContext items={renderOrder} strategy={horizontalListSortingStrategy}>
            {renderOrder.map((id, idx) => {
              const c = byId.get(id);
              if (!c) return null;
              const curve = computeCurve(idx, renderOrder.length);
              return (
                <DraggableCard
                  key={c.id}
                  id={c.id}
                  label={c.label}
                  gradient={c.gradient}
                  image={c.image}
                  index={idx}
                  overlapClamp={overlapClamp}
                  baseY={curve.y}
                  baseRotate={curve.rot}
                  hoverOffsetX={hoverOffsets[id] || 0}
                  setOuterRef={setOuterRef}
                  dragMeta={{ draggingId }}
                  ariaDescribedById="cardrow-kbd-instructions"
                  count={renderOrder.length}
                  theme={theme}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </motion.div>
    </div>
  );
}
