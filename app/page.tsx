import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Ethio Acers</h1>
      <p className="text-center text-muted-foreground">
        Practice national exam questions. Track your streak.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Log in
      </Link>
    </main>
  );
}
