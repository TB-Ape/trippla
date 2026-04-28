import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MapPin, Wallet, Backpack, Vote } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/trips");
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-10 bg-noise" />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-sm rotate-45" />
          <span className="text-2xl font-bold tracking-tight">TRIPPLA</span>
        </div>
        <nav className="flex gap-6">
          <Link href="/login" className="px-6 py-2 border border-white/20 hover:bg-white/5 transition-colors uppercase text-sm tracking-wider">
            Login
          </Link>
          <Link href="/signup" className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 transition-all uppercase text-sm tracking-wider font-semibold">
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-8 py-32 text-center">
        <div className="mb-8 inline-block">
          <span className="px-4 py-2 bg-teal-500/20 border border-teal-500/50 rounded-full text-teal-400 text-sm font-mono uppercase tracking-widest">
            Group Travel Planning
          </span>
        </div>

        <h1 className="text-8xl md:text-9xl font-black leading-none mb-6 tracking-tighter">
          PLAN<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            TOGETHER
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-12 font-light leading-relaxed">
          The collaborative platform for group trips. Create itineraries, split expenses,
          coordinate packing, and make decisions together.
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/signup"
            className="group px-10 py-5 bg-white text-black hover:bg-gray-200 transition-all uppercase text-sm tracking-widest font-bold relative overflow-hidden"
          >
            <span className="relative z-10">Start Planning Free</span>
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="#features"
            className="px-10 py-5 border-2 border-white hover:bg-white hover:text-black transition-all uppercase text-sm tracking-widest font-bold"
          >
            See Features
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 px-8 py-24 grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {(
          [
            {
              title: "ITINERARY",
              desc: "Build your trip timeline together. Add activities, restaurants, and experiences.",
              icon: MapPin,
              color: "from-orange-500 to-red-500"
            },
            {
              title: "EXPENSES",
              desc: "Track spending and split costs fairly. Know who owes what instantly.",
              icon: Wallet,
              color: "from-emerald-500 to-purple-500"
            },
            {
              title: "PACKING",
              desc: "Coordinate what to bring. Claim items so nothing gets forgotten.",
              icon: Backpack,
              color: "from-yellow-500 to-orange-500"
            },
            {
              title: "POLLS",
              desc: "Make group decisions easy. Vote on destinations, activities, and more.",
              icon: Vote,
              color: "from-cyan-500 to-blue-500"
            }
          ] as { title: string; desc: string; icon: LucideIcon; color: string }[]
        ).map((feature, i) => (
          <div
            key={i}
            className="group p-8 bg-white/5 border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all hover:transform hover:-translate-y-2 hover:shadow-2xl"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="mb-4 group-hover:scale-125 transition-transform">
              <feature.icon className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
            <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            <div className={`mt-4 h-1 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r ${feature.color}`} />
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-8 py-24 bg-white/5 border-y border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-6xl font-black mb-16 text-center tracking-tighter">
            HOW IT <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">WORKS</span>
          </h2>
          <div className="space-y-8">
            {[
              { num: "01", title: "Create Your Trip", desc: "Set up a new trip with dates and destination. Get a unique join code." },
              { num: "02", title: "Invite Your Crew", desc: "Share the join code with friends. Everyone can join instantly." },
              { num: "03", title: "Plan Together", desc: "Collaborate on itinerary, expenses, packing, and decisions in real-time." },
              { num: "04", title: "Go Have Fun", desc: "Everything organized, nothing forgotten. Just enjoy the adventure." }
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start group">
                <div className="text-6xl font-black text-white/10 group-hover:text-teal-500/50 transition-colors">
                  {step.num}
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-gray-400 text-lg">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-8 py-32 text-center">
        <h2 className="text-7xl font-black mb-8 tracking-tighter">
          READY TO <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            ADVENTURE?
          </span>
        </h2>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          Join thousands of groups planning unforgettable trips together.
        </p>
        <Link
          href="/signup"
          className="inline-block px-16 py-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 text-white font-black text-lg uppercase tracking-widest transition-all hover:scale-105 hover:shadow-2xl"
        >
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-12 border-t border-white/10 text-center text-gray-500">
        <p>&copy; 2026 Trippla. Plan together, travel better.</p>
      </footer>
    </main>
  );
}
