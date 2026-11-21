"use client";

import { useEffect, useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Red bar while the phone has no internet; saving fails with a clear message until it's back. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="alert" className="sticky top-0 z-20 bg-due px-4 pt-[calc(8px+env(safe-area-inset-top))] pb-2 text-center text-sm font-semibold text-white print:hidden">
      No internet. You can look at this page, but nothing can be saved until you are back online.
    </div>
  );
}

/** Registers public/sw.js (offline page only) in production builds. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
