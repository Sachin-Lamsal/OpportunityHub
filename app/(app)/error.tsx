"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg text-center py-10">
      <h2 className="text-xl font-semibold text-slate-900">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Try again. If the problem continues, check your Supabase connection and
        environment variables.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button href="/dashboard" variant="outline">
          Dashboard
        </Button>
      </div>
    </Card>
  );
}
