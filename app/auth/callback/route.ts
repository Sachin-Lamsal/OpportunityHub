import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirects";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();

  // 1. Direct token-hash verification (handles email confirmation links without PKCE dependency)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

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

    console.error("[auth/callback] verifyOtp failed:", error.status, error.message);
  }

  // 2. Standard PKCE code exchange (OAuth and standard email redirect)
  if (code) {
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

    console.error(
      "[auth/callback] exchangeCodeForSession failed:",
      error.status,
      error.message,
      error.code ?? "",
    );

    // If code exchange failed (e.g. email confirmed in an external browser context without PKCE cookie),
    // redirect to login with a friendly success banner since the email was already verified.
    redirect("/login?verified=true");
  }

  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");
  if (errorParam || errorDesc) {
    console.error("[auth/callback] provider error:", errorParam, errorDesc);
    redirect("/login?error=auth_callback_failed");
  }

  redirect("/login?verified=true");
}
