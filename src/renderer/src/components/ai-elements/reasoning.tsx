"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { BrainIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Streamdown } from "streamdown";

import { Shimmer } from "./shimmer";

interface ReasoningContextValue {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const resolvedDefaultOpen = defaultOpen ?? isStreaming;
    // Track if defaultOpen was explicitly set to false (to prevent auto-open)
    const isExplicitlyClosed = defaultOpen === false;

    const [isOpen, setIsOpen] = useControllableState<boolean>({
      defaultProp: resolvedDefaultOpen,
      onChange: onOpenChange,
      prop: open,
    });
    const [duration, setDuration] = useControllableState<number | undefined>({
      defaultProp: undefined,
      prop: durationProp,
    });

    const hasEverStreamedRef = useRef(isStreaming);
    const [hasAutoClosed, setHasAutoClosed] = useState(false);
    const startTimeRef = useRef<number | null>(null);

    // Track when streaming starts and compute duration
    useEffect(() => {
      if (isStreaming) {
        hasEverStreamedRef.current = true;
        if (startTimeRef.current === null) {
          startTimeRef.current = Date.now();
        }
      } else if (startTimeRef.current !== null) {
        setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
        startTimeRef.current = null;
      }
    }, [isStreaming, setDuration]);

    // Auto-open when streaming starts (unless explicitly closed)
    useEffect(() => {
      if (isStreaming && !isOpen && !isExplicitlyClosed) {
        setIsOpen(true);
      }
    }, [isStreaming, isOpen, setIsOpen, isExplicitlyClosed]);

    // Auto-close when streaming ends (once only, and only if it ever streamed)
    useEffect(() => {
      if (
        hasEverStreamedRef.current &&
        !isStreaming &&
        isOpen &&
        !hasAutoClosed
      ) {
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosed(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, setIsOpen, hasAutoClosed]);

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        setIsOpen(newOpen);
      },
      [setIsOpen]
    );

    const contextValue = useMemo(
      () => ({ duration, isOpen, isStreaming, setIsOpen }),
      [duration, isOpen, isStreaming, setIsOpen]
    );

    return (
      <ReasoningContext.Provider value={contextValue}>
        <Collapsible
          className={cn("not-prose mb-4", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

type ReasoningTriggerProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
  // A short model-written phrase naming what is being thought about, shown
  // in place of "Thinking..." while the reasoning streams.
  label?: string;
};

const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number) => {
  if (isStreaming || duration === 0) {
    return <Shimmer duration={1}>Thinking...</Shimmer>;
  }
  if (duration === undefined) {
    return <p>Thought for a few seconds</p>;
  }
  return <p>Thought for {duration} seconds</p>;
};

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    label,
    getThinkingMessage = (isStreaming, duration) =>
      isStreaming && label ? (
        <Shimmer duration={1}>{label}</Shimmer>
      ) : (
        defaultGetThinkingMessage(isStreaming, duration)
      ),
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <BrainIcon className="size-4" />
            {getThinkingMessage(isStreaming, duration)}
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
};

const streamdownPlugins = { cjk, code, math, mermaid };

const THOUGHTS_MAX_HEIGHT_PX = 140;
const THOUGHTS_MIN_HEIGHT_PX = 140;
// Fade height (20px) for the top/bottom edges.

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const { isStreaming } = useReasoning();
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = useState(false);

    const pinnedOnceRef = useRef(false);

    // Keep the box pinned to the newest thoughts while streaming so the
    // user can see it is active. Overflow is hidden, so this is the only
    // way the content moves (the user cannot scroll it manually).
    // scroll-behavior: smooth (on the element) makes each retarget glide,
    // turning token-by-token growth into one continuous motion; the first
    // pin on mount jumps instantly so reopening doesn't scroll through the
    // whole backlog.
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (!pinnedOnceRef.current) {
        el.style.scrollBehavior = "auto";
        el.scrollTop = el.scrollHeight;
        el.style.scrollBehavior = "";
        pinnedOnceRef.current = true;
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }, [children, isStreaming]);

    // Only show the edge fades when the content actually overflows the box.
    // Measured on the inner content element (not scrollHeight) and re-checked
    // via ResizeObserver so streaming growth is caught.
    useEffect(() => {
      const el = scrollRef.current;
      const content = contentRef.current;
      if (!el || !content) return;
      const measure = () =>
        setIsScrollable(content.offsetHeight > el.clientHeight + 1);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(content);
      return () => observer.disconnect();
    }, []);

    return (
      <CollapsibleContent
        className={cn(
          "mt-4 text-sm",
          "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
          className
        )}
        {...props}
      >
        {/* The fades live on this wrapper, not inside the scroller: absolute
            children of a scroll container scroll with the content, so the
            gradients would drift across the text instead of pinning to the
            visible edges. */}
        <div className="relative">
          <div
            ref={scrollRef}
            style={{ maxHeight: THOUGHTS_MAX_HEIGHT_PX, minHeight: THOUGHTS_MIN_HEIGHT_PX }}
            className="overflow-hidden scroll-smooth motion-reduce:scroll-auto"
          >
            <div ref={contentRef}>
              {/* Streamdown's own link-safety modal would swallow link clicks before the LinkPresenter. */}
              <Streamdown plugins={streamdownPlugins} linkSafety={{ enabled: false }}>{children}</Streamdown>
            </div>
          </div>
          {isScrollable ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-5 animate-in fade-in duration-300 bg-gradient-to-b from-background to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 animate-in fade-in duration-300 bg-gradient-to-t from-background to-transparent" />
            </>
          ) : null}
        </div>
      </CollapsibleContent>
    );
  }
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
