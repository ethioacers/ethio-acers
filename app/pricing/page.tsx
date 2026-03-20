import Link from "next/link";
import { Button } from "@/components/ui/button";

type Plan = {
  key: "free" | "pro_monthly" | "pro_3mo";
  name: string;
  price: string;
  badge?: string;
  subtitle?: string;
  recommended?: boolean;
  features: string[];
  cta: { label: string; href?: string; disabled?: boolean };
};

const TELEGRAM_CONTACT = "https://t.me/yourusername";

const plans: Plan[] = [
  {
    key: "free",
    name: "Free Plan",
    price: "Free",
    features: [
      "2 practice sessions per day",
      "1 flashcard round per day",
      "1 full exam per day",
      "5 AI explanations per day",
      "Basic notes access",
    ],
    cta: { label: "Current Plan", disabled: true },
  },
  {
    key: "pro_monthly",
    name: "Pro Monthly",
    price: "78 ETB / month",
    badge: "⭐ Most Popular",
    recommended: true,
    features: [
      "Unlimited practice sessions",
      "Unlimited flashcards",
      "Unlimited full exams",
      "Unlimited AI explanations",
      "Full notes library",
      "Weekly exams",
      "Priority support",
    ],
    cta: { label: "Get Pro — 78 ETB/mo" },
  },
  {
    key: "pro_3mo",
    name: "Pro 3 Months",
    price: "150 ETB / 3 months",
    badge: "💰 Best Value",
    subtitle: "Save 86 ETB vs monthly",
    features: [
      "Unlimited practice sessions",
      "Unlimited flashcards",
      "Unlimited full exams",
      "Unlimited AI explanations",
      "Full notes library",
      "Weekly exams",
      "Priority support",
    ],
    cta: { label: "Get Pro — 150 ETB/3mo" },
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen p-4 sm:p-6 pb-12">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Free trial banner */}
        <div className="rounded-xl border border-yellow-500/60 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm sm:text-base font-semibold text-gold">
              🎉 Try Pro FREE for 2 weeks! Contact us to activate your free trial.
            </p>
            <Button asChild className="bg-gold text-black hover:bg-gold/90">
              <a href={TELEGRAM_CONTACT} target="_blank" rel="noopener noreferrer">
                Contact Us
              </a>
            </Button>
          </div>
        </div>

        <section className="space-y-3">
          <h1 className="text-2xl font-bold text-gold">Pricing / Plans</h1>
          <p className="text-sm text-muted-foreground">
            Choose the plan that fits your study pace.
          </p>
        </section>

        {/* Plans */}
        <section className="grid gap-4 md:grid-cols-1">
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={[
                  "rounded-xl border bg-card p-5 shadow-sm",
                  plan.recommended
                    ? "border-yellow-500/70 shadow-[0_0_0_1px_rgba(250,204,21,0.15),0_0_30px_rgba(250,204,21,0.25)] scale-[1.01]"
                    : "border-muted",
                ].join(" ")}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{plan.name}</h2>
                    {plan.badge && (
                      <p className="mt-1 inline-flex items-center rounded-full border border-yellow-500/60 bg-card px-3 py-1 text-xs font-semibold text-gold">
                        {plan.badge}
                      </p>
                    )}
                    <p className="mt-2 text-2xl font-bold text-gold">{plan.price}</p>
                    {plan.subtitle && (
                      <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
                    )}
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-sm">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span aria-hidden className="text-gold">
                        •
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  {plan.cta.disabled ? (
                    <Button disabled className="w-full bg-muted text-foreground">
                      {plan.cta.label}
                    </Button>
                  ) : (
                    <Button asChild className="w-full bg-gold text-black hover:bg-gold/90">
                      <Link href="/profile">{plan.cta.label}</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Upgrade steps */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">How to Upgrade</h2>
          <div className="rounded-xl border border-muted bg-card p-5 shadow-sm">
            <ol className="space-y-3 text-sm">
              <li>
                <p className="font-semibold">Choose your plan above</p>
              </li>
              <li>
                <p className="font-semibold">Send payment via Telebirr or CBE Birr</p>
              </li>
              <li>
                <p className="font-semibold">Send payment screenshot to our Telegram</p>
              </li>
              <li>
                <p className="font-semibold">We activate your account within 24 hours</p>
              </li>
            </ol>

            <div className="mt-5">
              <Button asChild className="bg-gold text-black hover:bg-gold/90 w-full">
                <a href={TELEGRAM_CONTACT} target="_blank" rel="noopener noreferrer">
                  Contact on Telegram
                </a>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

