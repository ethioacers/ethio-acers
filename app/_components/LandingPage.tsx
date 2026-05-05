"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const features = [
  {
    emoji: "📝",
    title: "Past Exam Practice",
    description:
      "Practice thousands of real past exam questions filtered by subject, grade, chapter and year.",
  },
  {
    emoji: "🤖",
    title: "AI Tutor",
    description:
      "Get instant AI explanations for every wrong answer in simple, student-friendly language.",
  },
  {
    emoji: "📖",
    title: "Smart Notes",
    description:
      "Access textbook summaries or generate AI notes on any topic instantly.",
  },
  {
    emoji: "🃏",
    title: "Flashcards",
    description: "Swipe through flashcards to memorize key concepts fast.",
  },
  {
    emoji: "🔥",
    title: "Study Streak",
    description:
      "Build a daily study habit and track your consistency with a visual streak calendar.",
  },
  {
    emoji: "📋",
    title: "Weekly Exams",
    description:
      "Take weekly timed exams and see how you rank against other students.",
  },
];

const telegramUrl = "https://t.me/ethioacers_et";

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const revealables = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealables.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="sticky top-0 z-50 border-b border-[#f0c040]/20 bg-[#0f0f0f]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-[#f0c040]">
            Ethio Acers ⚡
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-white/80 transition hover:text-[#f0c040]">
              Features
            </a>
            <a href="#pricing" className="text-sm text-white/80 transition hover:text-[#f0c040]">
              Pricing
            </a>
            <Link
              href="/login"
              className="rounded-lg border border-[#f0c040]/70 px-4 py-2 text-sm font-semibold text-[#f0c040] transition hover:bg-[#f0c040]/10"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#f0c040] px-4 py-2 text-sm font-bold text-black transition hover:opacity-90"
            >
              Sign Up
            </Link>
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            className="rounded-md border border-[#f0c040]/40 px-3 py-2 text-[#f0c040] md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[#f0c040]/20 px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-3">
              <a
                href="#features"
                className="text-sm text-white/85"
                onClick={() => setMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-sm text-white/85"
                onClick={() => setMenuOpen(false)}
              >
                Pricing
              </a>
              <Link href="/login" className="text-sm font-semibold text-[#f0c040]">
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-block w-fit rounded-lg bg-[#f0c040] px-4 py-2 text-sm font-bold text-black"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-20">
        <div className="hero-gradient absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute left-[8%] top-20 text-4xl float-a">📚</div>
        <div className="pointer-events-none absolute right-[10%] top-28 text-4xl float-b">🔥</div>
        <div className="pointer-events-none absolute bottom-24 left-[14%] text-4xl float-c">🧠</div>
        <div className="pointer-events-none absolute bottom-20 right-[15%] text-4xl float-a">✨</div>

        <div className="relative mx-auto max-w-5xl text-center">
          <h1 className="text-balance text-4xl font-black leading-tight sm:text-6xl">
            Ace Your National Exam 🎓
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base text-white/80 sm:text-xl">
            The smartest way for Ethiopian Grade 9–12 students to study,
            practice, and prepare for national exams.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-[#f0c040] px-6 py-3 text-sm font-extrabold text-black transition hover:opacity-90"
            >
              Get Started Free
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-[#f0c040]/70 px-6 py-3 text-sm font-bold text-[#f0c040] transition hover:bg-[#f0c040]/10"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-[#f0c040]/20 bg-[#141414] px-4 py-6 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 text-center sm:grid-cols-3">
          <div>
            <p className="text-2xl font-black text-[#f0c040]">1000+</p>
            <p className="text-sm text-white/75">Past Exam Questions</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#f0c040]">9-12</p>
            <p className="text-sm text-white/75">Grade 9 to 12 Coverage</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#f0c040]">AI</p>
            <p className="text-sm text-white/75">AI-Powered Explanations</p>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="reveal text-center text-3xl font-black sm:text-5xl" data-reveal>
          Everything You Need to Pass 💪
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="reveal rounded-2xl border border-white/10 bg-[#171717] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#f0c040]/70 hover:shadow-[0_0_0_1px_rgba(240,192,64,0.35)]"
              data-reveal
            >
              <p className="text-4xl">{feature.emoji}</p>
              <h3 className="mt-4 text-xl font-extrabold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="reveal text-center text-3xl font-black sm:text-5xl" data-reveal>
          Simple, Affordable Pricing 💰
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="reveal rounded-2xl border border-white/10 bg-[#171717] p-6" data-reveal>
            <h3 className="text-xl font-extrabold">Free Plan</h3>
            <p className="mt-3 text-3xl font-black text-[#f0c040]">Free</p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li>2 practice sessions/day</li>
              <li>1 flashcard round/day</li>
              <li>5 AI explanations/day</li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-lg bg-[#f0c040] px-5 py-2.5 text-sm font-bold text-black"
            >
              Get Started
            </Link>
          </article>

          <article
            className="reveal rounded-2xl border border-[#f0c040] bg-[#171717] p-6 shadow-[0_0_30px_-8px_rgba(240,192,64,0.55)]"
            data-reveal
          >
            <p className="inline-flex rounded-full bg-[#f0c040]/20 px-3 py-1 text-xs font-bold text-[#f0c040]">
              ⭐ Most Popular
            </p>
            <h3 className="mt-3 text-xl font-extrabold">Pro Monthly</h3>
            <p className="mt-3 text-3xl font-black text-[#f0c040]">78 ETB/month</p>
            <p className="mt-4 text-sm text-white/80">Unlimited everything</p>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block rounded-lg bg-[#f0c040] px-5 py-2.5 text-sm font-bold text-black"
            >
              Get Pro
            </a>
          </article>

          <article className="reveal rounded-2xl border border-white/10 bg-[#171717] p-6" data-reveal>
            <p className="inline-flex rounded-full bg-[#f0c040]/20 px-3 py-1 text-xs font-bold text-[#f0c040]">
              💰 Save 86 ETB
            </p>
            <h3 className="mt-3 text-xl font-extrabold">Pro 2 Months</h3>
            <p className="mt-3 text-3xl font-black text-[#f0c040]">110 ETB / 2 months</p>
            <p className="mt-4 text-sm text-white/80">Unlimited everything</p>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block rounded-lg bg-[#f0c040] px-5 py-2.5 text-sm font-bold text-black"
            >
              Get Pro
            </a>
          </article>
        </div>
        <p className="mt-8 rounded-xl border border-[#f0c040]/30 bg-[#f0c040]/10 px-4 py-3 text-center text-sm font-semibold text-[#f0c040]">
          🎉 Try Pro FREE for 2 weeks — contact us on Telegram!
        </p>
      </section>

      <footer className="border-t border-[#f0c040]/20 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-white/80 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-extrabold text-[#f0c040]">Ethio Acers ⚡</p>
            <p>Built for Ethiopian students, by Ethiopians 🇪🇹</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/login" className="transition hover:text-[#f0c040]">
              Login
            </Link>
            <Link href="/signup" className="transition hover:text-[#f0c040]">
              Sign Up
            </Link>
            <a href="#pricing" className="transition hover:text-[#f0c040]">
              Pricing
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#f0c040]"
            >
              Telegram
            </a>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-6xl text-xs text-white/50">
          © 2026 Ethio Acers
        </p>
      </footer>

      <style jsx>{`
        :global(html) {
          scroll-behavior: smooth;
        }
        .hero-gradient {
          background: radial-gradient(
              circle at 25% 20%,
              rgba(240, 192, 64, 0.45),
              transparent 42%
            ),
            radial-gradient(
              circle at 75% 30%,
              rgba(240, 192, 64, 0.3),
              transparent 45%
            ),
            linear-gradient(135deg, #0f0f0f 0%, #171717 55%, #242012 100%);
          animation: pulseGlow 9s ease-in-out infinite alternate;
        }
        .float-a {
          animation: floatA 6s ease-in-out infinite;
        }
        .float-b {
          animation: floatB 7s ease-in-out infinite;
        }
        .float-c {
          animation: floatC 8s ease-in-out infinite;
        }
        .reveal {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes pulseGlow {
          0% {
            filter: saturate(1) brightness(1);
          }
          100% {
            filter: saturate(1.08) brightness(1.06);
          }
        }
        @keyframes floatA {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        @keyframes floatB {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes floatC {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-14px);
          }
        }
      `}</style>
    </main>
  );
}
