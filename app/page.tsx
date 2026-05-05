import { redirect } from "next/navigation";
import { LandingPage } from "@/app/_components/LandingPage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  } catch {
    // Keep the page publicly accessible if auth lookup fails.
  }

  return <LandingPage />;
}
