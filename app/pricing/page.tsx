 "use client";

import { useMemo, useState } from "react";
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
const TELEGRAM_SCREENSHOT = "https://t.me/GEMTA_1";

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
  const [activePlanKey, setActivePlanKey] = useState<Plan["key"] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activePlan = useMemo(
    () => plans.find((p) => p.key === activePlanKey) ?? null,
    [activePlanKey]
  );

  function openProModal(planKey: Plan["key"]) {
    setActivePlanKey(planKey);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function getModalPrice(planKey: Plan["key"]) {
    if (planKey === "pro_monthly") return "78 ETB/mo";
    return "248 ETB/3mo";
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op; clipboard can fail in some environments
    }
  }

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
                    <Button
                      type="button"
                      className="w-full bg-gold text-black hover:bg-gold/90"
                      onClick={() => openProModal(plan.key)}
                    >
                      {plan.cta.label}
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

      {/* Payment instruction modal */}
      {isModalOpen && activePlan && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-yellow-500/50 bg-card shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-muted/60 p-4">
              <div>
                <h2 className="text-lg font-bold text-gold">How to Activate Pro</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activePlan.name} — {getModalPrice(activePlan.key)}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={closeModal} className="shrink-0">
                Close
              </Button>
            </div>

            <div className="space-y-5 p-4">
              {/* Step 1 */}
              <div className="space-y-2">
                <h3 className="font-semibold">Step 1 — Choose payment method:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-muted bg-card p-3 text-sm">
                    📱 Telebirr
                  </div>
                  <div className="rounded-lg border border-muted bg-card p-3 text-sm">
                    🏦 CBE and Awash
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <h3 className="font-semibold">Step 2 — Send payment to:</h3>
                <div className="space-y-3 rounded-lg border border-muted bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Name</p>
                      <p className="text-sm font-medium">GEMTA ZELALEM</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="text-sm font-medium">
                        Awash 013201644054900{" "}
                        <span className="text-muted-foreground">CBE 1000561325662</span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="sm:shrink-0"
                      onClick={() =>
                        copyToClipboard(
                          "Awash 013201644054900 CBE 1000561325662"
                        )
                      }
                    >
                      Copy
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">0904324277</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="sm:shrink-0"
                      onClick={() => copyToClipboard("0904324277")}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <h3 className="font-semibold">Step 3 — Send confirmation:</h3>
                <p className="text-sm text-muted-foreground">
                  After payment, send your screenshot and full name to our Telegram:
                </p>
                <Button asChild className="w-full bg-gold text-black hover:bg-gold/90">
                  <a href={TELEGRAM_SCREENSHOT} target="_blank" rel="noopener noreferrer">
                    Send Screenshot on Telegram
                  </a>
                </Button>
              </div>
            </div>

            <div className="border-t border-muted/60 p-4">
              <p className="text-sm font-medium text-gold">
                🎉 Free 2-week trial available — just contact us on Telegram!
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

