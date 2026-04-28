import { getTranslations } from "next-intl/server";
import { LocaleLink as Link } from "@/components/LocaleLink";

export default async function ImpressumPage() {
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 px-4 md:px-8 py-4 md:py-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-sm rotate-45" />
            <span className="text-xl font-bold tracking-tight">{t("common.appName")}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <h1 className="text-4xl md:text-5xl font-black mb-10 tracking-tighter">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("legal.impressum")}
          </span>
        </h1>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <p>Tobias Busch<br />
            Friedrich-Ebert-Straße 146<br />
            47179 Duisburg</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Kontakt</h2>
            <p>
              E-Mail: <a href="mailto:tobias_busch@ymail.com" className="text-teal-400 hover:underline">tobias_busch@ymail.com</a><br />
              Tel: +49 [YOUR_PHONE_NUMBER]
            </p>
          </section>

          <p className="text-sm text-gray-500">
            Quelle: <a href="https://www.e-recht24.de" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">eRecht24</a>
          </p>
        </div>
      </div>

      <footer className="border-t border-white/10 px-4 md:px-8 py-8 text-center text-gray-500 text-sm">
        <div className="flex justify-center gap-6">
          <Link href="/impressum" className="hover:text-gray-300 transition-colors">
            {t("legal.impressum")}
          </Link>
          <Link href="/datenschutz" className="hover:text-gray-300 transition-colors">
            {t("legal.datenschutz")}
          </Link>
        </div>
      </footer>
    </main>
  );
}
