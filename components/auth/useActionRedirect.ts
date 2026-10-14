"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Navigate after a server action returns redirectTo (avoids redirect() + useActionState bug). */
export function useActionRedirect(redirectTo?: string) {
  const router = useRouter();

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
      router.refresh();
    }
  }, [redirectTo, router]);
}
