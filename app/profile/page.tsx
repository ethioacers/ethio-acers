"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GRADES = [9, 10, 11, 12];

type ProfileRow = {
  id: string;
  full_name: string | null;
  school_name: string | null;
  grade: number | null;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState<number | "">("");
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profile) {
        const p = profile as ProfileRow;
        setFullName(p.full_name ?? "");
        setSchoolName(p.school_name ?? "");
        setGrade(p.grade != null ? p.grade : "");
        setCreatedAt((s) => s || p.created_at);
      }

      const { count: total } = await supabase
        .from("attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      const { count: correct } = await supabase
        .from("attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_correct", true);
      setTotalAttempts(total ?? 0);
      setCorrectAttempts(correct ?? 0);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setSuccess(false);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        school_name: schoolName || null,
        grade: grade !== "" ? grade : null,
      })
      .eq("id", userId);
    setSaving(false);
    setSuccess(true);
  }

  async function handleChangePassword() {
    const newPassword = window.prompt("Enter your new password:");
    if (newPassword == null || newPassword === "") return;
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert(error.message);
    } else {
      alert("Password updated.");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const accuracy =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const createdDate =
    createdAt ? new Date(createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Dashboard
          </Link>
        </div>

        <form onSubmit={handleSave} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="bg-muted/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolName">School name</Label>
            <Input
              id="schoolName"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Your school"
              className="bg-muted/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <select
              id="grade"
              className="select-theme h-10 w-full rounded-md border border-input bg-muted/80 px-3 py-2 text-sm text-foreground"
              value={grade}
              onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select grade</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              readOnly
              disabled
              className="bg-muted/50 cursor-not-allowed opacity-90"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleChangePassword}>
              Change password
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Account created</Label>
            <p className="text-sm text-muted-foreground">{createdDate}</p>
          </div>
          <div className="space-y-2">
            <Label>Total questions answered</Label>
            <p className="text-sm text-muted-foreground">{totalAttempts}</p>
          </div>
          <div className="space-y-2">
            <Label>Overall accuracy</Label>
            <p className="text-sm text-muted-foreground">{accuracy}%</p>
          </div>
          {success && (
            <p className="text-sm text-green-600">Profile saved successfully.</p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </div>
    </main>
  );
}
