"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-device";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  sheetClassName?: string;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  sheetClassName,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "max-h-[92vh] rounded-t-2xl px-4 py-5 overflow-y-auto shadow-2xl flex flex-col",
            sheetClassName
          )}
        >
          {(title || description) && (
            <SheetHeader className="pb-3 text-left shrink-0 pr-6">
              {title && typeof title === "string" ? (
                <SheetTitle className="text-base font-bold text-foreground">
                  {title}
                </SheetTitle>
              ) : (
                title
              )}
              {description && (
                <SheetDescription className="text-xs text-muted-foreground">
                  {description}
                </SheetDescription>
              )}
            </SheetHeader>
          )}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("bg-card rounded-xl border border-border shadow-modal", className)}>
        {(title || description) && (
          <DialogHeader className="space-y-1">
            {title && typeof title === "string" ? (
              <DialogTitle className="text-base font-bold text-foreground">
                {title}
              </DialogTitle>
            ) : (
              title
            )}
            {description && (
              <DialogDescription className="text-xs text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
