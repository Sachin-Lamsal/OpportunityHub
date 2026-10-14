import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        const { origin } = new URL(request.url);
        redirect(`${origin}${next}`);
      }

      if (forwardedHost) {
        redirect(`https://${forwardedHost}${next}`);
      }

      const { origin } = new URL(request.url);
      redirect(`${origin}${next}`);
    }
  }

  redirect("/login?error=auth_callback_failed");
}
