import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { TermsGuard } from "@/components/TermsGuard";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations("legal");

  return (
    <NextIntlClientProvider messages={messages}>
      <TermsGuard />
      {children}
      <footer className="border-t border-white/10 bg-[#0a0a0a] px-4 md:px-8 py-6 text-center text-gray-600 text-xs">
        <div className="flex justify-center gap-6">
          <Link href="/impressum" className="hover:text-gray-400 transition-colors">
            {t("impressum")}
          </Link>
          <Link href="/datenschutz" className="hover:text-gray-400 transition-colors">
            {t("datenschutz")}
          </Link>
          <Link href="/agb" className="hover:text-gray-400 transition-colors">
            {t("agb")}
          </Link>
        </div>
      </footer>
    </NextIntlClientProvider>
  );
}
