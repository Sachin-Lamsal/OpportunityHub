"use client";

import { useFormStatus } from "react-dom";
import { logout } from "@/lib/actions/auth";
import type { AccountType } from "@/lib/types";
import Button from "@/components/ui/Button";

interface LogoutButtonProps {
  accountType?: AccountType;
}

export default function LogoutButton({ accountType }: LogoutButtonProps) {
  return (
    <form action={logout}>
      {accountType ? (
        <input type="hidden" name="account_type" value={accountType} />
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? "…" : "Log out"}
    </Button>
  );
}
