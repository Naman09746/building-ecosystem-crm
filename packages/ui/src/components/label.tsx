import * as React from "react";
import { cn } from "@repo/core/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-xs font-semibold text-foreground/90 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 select-none",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive font-bold">*</span>}
    </label>
  )
);
Label.displayName = "Label";

export { Label };
