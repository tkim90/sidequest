import { useState } from "react";

import { useMountEffect } from "../../hooks/useMountEffect";

const MOBILE_VIEW_MEDIA_QUERY = "(max-width: 1023px)";

function resolveIsMobileView(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(MOBILE_VIEW_MEDIA_QUERY).matches;
}

export function useIsMobileView(): boolean {
  const [isMobileView, setIsMobileView] = useState<boolean>(resolveIsMobileView);

  useMountEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(MOBILE_VIEW_MEDIA_QUERY);

    function handleMediaQueryChange(event: MediaQueryListEvent): void {
      setIsMobileView(event.matches);
    }

    setIsMobileView(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleMediaQueryChange);
    };
  });

  return isMobileView;
}
