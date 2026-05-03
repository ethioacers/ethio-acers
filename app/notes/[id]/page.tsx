"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";

type NoteRow = {
  id: number;
  topic: string;
  content: string | null;
  file_url: string | null;
};

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<NoteRow | null>(null);

  useEffect(() => {
    async function loadNote() {
      if (!Number.isFinite(id)) {
        setError("Invalid note ID.");
        setLoading(false);
        return;
      }
      setError(null);
      setLoading(true);

      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
          setError(userErr.message);
          return;
        }
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error: noteErr } = await supabase
          .from("notes")
          .select("id, topic, content, file_url")
          .eq("id", id)
          .maybeSingle();

        if (noteErr) {
          setError(noteErr.message);
          return;
        }
        if (!data) {
          setError("Note not found.");
          return;
        }

        setNote(data as NoteRow);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load note.");
      } finally {
        setLoading(false);
      }
    }

    void loadNote();
  }, [id, router]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pb-28 pt-6 md:pb-10">
        <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6">
          <Link
            href="/notes"
            className="inline-flex text-sm text-muted-foreground transition-colors hover:text-gold"
          >
            ← Back to Notes
          </Link>

          {loading && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm backdrop-blur-sm dark:border-gold/15 dark:bg-card/60">
              <p className="text-muted-foreground">Loading…</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && note && (
            <section className="rounded-2xl border border-border/60 bg-card/30 p-5 shadow-lg dark:border-gold/15 dark:bg-card/50 sm:p-6">
              <h1 className="text-2xl font-bold tracking-tight text-gold sm:text-3xl">{note.topic}</h1>
              <div className="mt-5 space-y-4 border-t border-border/60 pt-4 dark:border-gold/10">
                {note.file_url && (
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gold/35 bg-gold/10 px-3 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20"
                  >
                    <Download className="h-4 w-4 shrink-0" aria-hidden />
                    Download PDF
                  </a>
                )}
                {note.content?.trim() && <NoteMarkdown content={note.content} />}
                {!note.content?.trim() && !note.file_url && (
                  <p className="text-sm text-muted-foreground">No content for this note.</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
