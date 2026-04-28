"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { registerPushSubscription } from "@/lib/push-client";

export function PushSetup() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const setup = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await registerPushSubscription(registration);
      } catch (err) {
        console.error("[PushSetup] SW registration failed:", err);
      }
    };

    setup();
  }, [session?.user]);

  return null;
}
