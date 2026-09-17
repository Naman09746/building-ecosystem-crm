import * as React from "react";

// Keyboard-accessible props for clickable cards/divs (a11y: role, focus,
// Enter/Space activation). Spread onto any clickable non-button element.
export function actionCardProps(onActivate: () => void, label: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick: onActivate,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
