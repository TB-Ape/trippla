"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";

const EXEMPT_PATHS = ["/terms-update", "/agb", "/datenschutz", "/impressum", "/login", "/signup"];

export function TermsGuard() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (!session?.user) return;
    const needsUpdate = (session.user as any).needsTermsUpdate;
    if (!needsUpdate) return;
    const isExempt = EXEMPT_PATHS.some((p) => pathname.includes(p));
    if (!isExempt) {
      router.replace(`/${locale}/terms-update`);
    }
  }, [session, pathname, router, locale]);

  return null;
}
