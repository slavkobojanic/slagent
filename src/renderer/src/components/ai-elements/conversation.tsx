"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useLayoutEffect, useRef } from "react";
import { StickToBottom } from "use-stick-to-bottom";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

// The scroller that sticks to its bottom while the reader stays there. Pass contextRef to
// receive the stick context (scroll element, scrollToBottom, stopScroll, isAtBottom).
export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-hidden", className)}
    initial="instant"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  scrollClassName,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex flex-col gap-8 p-4", className)}
    scrollClassName={cn("overflow-x-hidden overflow-y-auto", scrollClassName)}
    {...props}
  />
);

// Runs after every commit of its parent. A scroller that must adjust to the rows it
// just rendered uses it to do that work. Renders nothing.
export const ConversationSettle = ({ onSettle }: { onSettle: () => void }) => {
  useLayoutEffect(() => {
    onSettle();
  });
  return null;
};

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button> & {
  // The button shows only while the reader is away from the bottom.
  visible: boolean;
};

// The round button that jumps back to the bottom. Its caller decides what the click does.
export const ConversationScrollButton = ({
  className,
  visible,
  ...props
}: ConversationScrollButtonProps) => {
  if (!visible) {
    return null;
  }
  return (
    <Button
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full dark:bg-background dark:hover:bg-muted",
        className
      )}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
};

export type PinnedScrollerProps = Omit<ComponentProps<"div">, "onScroll"> & {
  // The value whose changes the scroller follows, such as streamed output.
  watch: string;
};

// A scroller that follows its content to the bottom while the reader stays within a
// few pixels of it. Scrolling up releases it until the reader returns to the bottom.
export const PinnedScroller = ({
  className,
  watch,
  children,
  ...props
}: PinnedScrollerProps) => {
  const scroller = useRef<HTMLDivElement | null>(null);
  const pinned = useRef(true);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || !pinned.current) {
      return;
    }
    element.scrollTop = element.scrollHeight;
  }, [watch]);

  return (
    <div
      ref={scroller}
      className={className}
      onScroll={(event) => {
        const element = event.currentTarget;
        pinned.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 24;
      }}
      {...props}
    >
      {children}
    </div>
  );
};
