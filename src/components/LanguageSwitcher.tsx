"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n";

const localeFlags: Record<string, string> = {
  en: "🇬🇧",
  de: "🇩🇪",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function handleLocaleChange(newLocale: Locale) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  // Toggle to the other locale
  const otherLocale = locales.find((l) => l !== locale) || locales[0];

  return (
    <button
      onClick={() => handleLocaleChange(otherLocale)}
      className="text-xl hover:scale-110 transition-transform px-1"
      title={otherLocale.toUpperCase()}
    >
      {localeFlags[otherLocale]}
    </button>
  );
}
