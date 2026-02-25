"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GRADES = [9, 10, 11, 12];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            school_name: schoolName,
            grade: grade !== "" ? grade : null,
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data?.user) {
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({
            full_name: fullName || null,
            school_name: schoolName || null,
            grade: grade !== "" ? grade : null,
          })
          .eq("id", data.user.id);
        if (updateErr) {
          setError(updateErr.message);
          return;
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to create account.");
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
            Create your account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-base sm:text-lg">Full name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="w-full sm:w-full px-4 py-3 sm:py-4 text-base sm:text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolName" className="text-base sm:text-lg">School name</Label>
            <Input
              id="schoolName"
              type="text"
              placeholder="Your school"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              autoComplete="organization"
              className="w-full sm:w-full px-4 py-3 sm:py-4 text-base sm:text-lg"
            />
          </div>
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
              autoComplete="new-password"
              className="w-full sm:w-full px-4 py-3 sm:py-4 text-base sm:text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade" className="text-base sm:text-lg">Grade</Label>
            <select
              id="grade"
              className="select-theme h-12 sm:h-14 w-full rounded-md border border-input bg-background px-3 py-2 sm:py-3 text-base sm:text-lg text-foreground"
              value={grade}
              onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">Select grade</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm sm:text-base text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full sm:w-full py-3 sm:py-4 text-base sm:text-lg" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>
        <p className="text-center text-sm sm:text-base">
          <Link href="/login" className="text-primary hover:underline">
            Already have an account? Log in
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
