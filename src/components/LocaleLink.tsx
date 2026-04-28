"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { ComponentProps } from "react";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale();

  // If href already starts with a locale, use as-is
  if (href.match(/^\/(en|de)\//)) {
    return <Link href={href} {...props} />;
  }

  // Add locale prefix
  const localizedHref = `/${locale}${href}`;

  return <Link href={localizedHref} {...props} />;
}
