import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-border/70 bg-card/90 p-8 text-center shadow-lg">
      <h1 className="text-gold">Ethioacers</h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
        Practice national exam questions. Track your streak.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-md"
      >
        Log in
      </Link>
      </div>
    </main>
  );
}
