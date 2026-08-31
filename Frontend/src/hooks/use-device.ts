"use client";

import * as React from "react";

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);

    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}

export function useIsTablet(minWidth = 768, maxWidth = 1024): boolean {
  const [isTablet, setIsTablet] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= minWidth && width < maxWidth);
    };

    checkTablet();
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
  }, [minWidth, maxWidth]);

  return isTablet;
}

export function useIsDesktop(minWidth = 1024): boolean {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(true);

  React.useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= minWidth);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, [minWidth]);

  return isDesktop;
}
