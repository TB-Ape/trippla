"use client";

import { LocaleLink as Link } from "@/components/LocaleLink";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const t = useTranslations();
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/trips");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-64 md:w-96 h-64 md:h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-10 bg-noise" />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-4 md:px-8 py-4 md:py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-sm rotate-45" />
          <span className="text-xl md:text-2xl font-bold tracking-tight">{t("common.appName")}</span>
        </div>
        <nav className="flex gap-2 md:gap-6 items-center">
          <LanguageSwitcher />
          <Link href="/login" className="px-4 md:px-6 py-2 border border-white/20 hover:bg-white/5 transition-colors uppercase text-xs md:text-sm tracking-wider">
            {t("auth.login")}
          </Link>
          <Link href="/signup" className="px-4 md:px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 transition-all uppercase text-xs md:text-sm tracking-wider font-semibold">
            {t("auth.signup")}
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-4 md:px-8 py-16 md:py-32 text-center">
        <div className="mb-6 md:mb-8 inline-block">
          <span className="px-3 md:px-4 py-2 bg-teal-500/20 border border-teal-500/50 rounded-full text-teal-400 text-xs md:text-sm font-mono uppercase tracking-widest">
            {t("landing.tagline")}
          </span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-none mb-4 md:mb-6 tracking-tighter">
          {t("landing.hero1")}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("landing.hero2")}
          </span>
        </h1>

        <p className="text-base md:text-xl lg:text-2xl text-gray-400 max-w-2xl mb-8 md:mb-12 font-light leading-relaxed px-2">
          {t("landing.subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto px-4 sm:px-0">
          <Link
            href="/signup"
            className="group px-8 md:px-10 py-4 md:py-5 bg-white text-black hover:bg-gray-200 transition-all uppercase text-sm tracking-widest font-bold relative overflow-hidden text-center"
          >
            <span className="relative z-10">{t("landing.startPlanningFree")}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="#features"
            className="px-8 md:px-10 py-4 md:py-5 border-2 border-white hover:bg-white hover:text-black transition-all uppercase text-sm tracking-widest font-bold text-center"
          >
            {t("landing.seeFeatures")}
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 px-4 md:px-8 py-16 md:py-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
        {[
          {
            title: t("landing.itineraryTitle"),
            desc: t("landing.itineraryDesc"),
            icon: "📍",
            color: "from-orange-500 to-red-500"
          },
          {
            title: t("landing.expensesTitle"),
            desc: t("landing.expensesDesc"),
            icon: "💰",
            color: "from-emerald-500 to-purple-500"
          },
          {
            title: t("landing.packingTitle"),
            desc: t("landing.packingDesc"),
            icon: "🎒",
            color: "from-yellow-500 to-orange-500"
          },
          {
            title: t("landing.pollsTitle"),
            desc: t("landing.pollsDesc"),
            icon: "🗳️",
            color: "from-cyan-500 to-blue-500"
          }
        ].map((feature, i) => (
          <div
            key={i}
            className="group p-6 md:p-8 bg-white/5 border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all hover:transform hover:-translate-y-2 hover:shadow-2xl"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="text-4xl md:text-5xl mb-4 group-hover:scale-125 transition-transform">{feature.icon}</div>
            <h3 className="text-xl md:text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm md:text-base">{feature.desc}</p>
            <div className={`mt-4 h-1 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r ${feature.color}`} />
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-4 md:px-8 py-16 md:py-24 bg-white/5 border-y border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black mb-10 md:mb-16 text-center tracking-tighter">
            {t("landing.howItWorks")}
          </h2>
          <div className="space-y-6 md:space-y-8">
            {[
              { num: "01", title: t("landing.step1Title"), desc: t("landing.step1Desc") },
              { num: "02", title: t("landing.step2Title"), desc: t("landing.step2Desc") },
              { num: "03", title: t("landing.step3Title"), desc: t("landing.step3Desc") },
              { num: "04", title: t("landing.step4Title"), desc: t("landing.step4Desc") }
            ].map((step, i) => (
              <div key={i} className="flex gap-4 md:gap-6 items-start group">
                <div className="text-4xl md:text-6xl font-black text-white/10 group-hover:text-teal-500/50 transition-colors shrink-0">
                  {step.num}
                </div>
                <div className="flex-1 pt-1 md:pt-2">
                  <h3 className="text-xl md:text-2xl font-bold mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-gray-400 text-base md:text-lg">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 md:px-8 py-20 md:py-32 text-center">
        <h2 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 md:mb-8 tracking-tighter">
          {t("landing.readyTo")} <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("landing.adventure")}
          </span>
        </h2>
        <p className="text-base md:text-xl text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto px-2">
          {t("landing.joinThousands")}
        </p>
        <Link
          href="/signup"
          className="inline-block px-10 md:px-16 py-5 md:py-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 text-white font-black text-base md:text-lg uppercase tracking-widest transition-all hover:scale-105 hover:shadow-2xl"
        >
          {t("landing.getStartedFree")}
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 md:px-8 py-8 md:py-12 border-t border-white/10 text-center text-gray-500 text-sm md:text-base">
        <p>&copy; 2026 {t("common.appName")}. {t("landing.footer")}</p>
      </footer>
    </main>
  );
}
