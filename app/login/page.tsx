"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 rounded-lg border bg-card p-4 sm:p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Ethio Acers</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Log in with your test account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base sm:text-lg">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full sm:w-full px-4 py-3 sm:py-4 text-base sm:text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base sm:text-lg">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full sm:w-full px-4 py-3 sm:py-4 text-base sm:text-lg"
            />
          </div>
          {error && (
            <p className="text-sm sm:text-base text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full sm:w-full py-3 sm:py-4 text-base sm:text-lg" disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <p className="text-center text-sm sm:text-base">
          <Link href="/signup" className="text-primary hover:underline">
            Don&apos;t have an account? Sign up
          </Link>
        </p>
        <p className="text-center text-sm sm:text-base">
          <Link href="/" className="text-primary hover:underline">
            ← Back home
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
