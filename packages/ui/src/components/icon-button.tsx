import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@repo/core/lib/utils";

export interface IconButtonProps extends Omit<ButtonProps, "children"> {
  icon: React.ReactNode;
  "aria-label": string;
  tooltip?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, "aria-label": ariaLabel, size = "icon", variant = "ghost", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        aria-label={ariaLabel}
        className={cn(
          "relative min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9 p-0 flex items-center justify-center",
          className
        )}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);
IconButton.displayName = "IconButton";
