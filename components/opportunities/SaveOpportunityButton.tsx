"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleSaveOpportunity,
  updateOpportunityReminder,
} from "@/lib/actions/opportunities";
import Button from "@/components/ui/Button";

interface SaveOpportunityButtonProps {
  opportunityId: string;
  initialSaved: boolean;
  initialRemindDeadline?: boolean;
  showReminderToggle?: boolean;
  hasDeadline?: boolean;
  size?: "sm" | "md";
}

export default function SaveOpportunityButton({
  opportunityId,
  initialSaved,
  initialRemindDeadline = true,
  showReminderToggle = false,
  hasDeadline = true,
  size = "md",
}: SaveOpportunityButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [remind, setRemind] = useState(initialRemindDeadline);
  const [isPending, startTransition] = useTransition();
  const [isReminderPending, startReminderTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleSaveOpportunity(opportunityId, {
        remindDeadline: remind,
      });

      if (result.error) {
        if (
          result.error.toLowerCase().includes("log in") ||
          result.error.toLowerCase().includes("logged in")
        ) {
          const shouldLogin = confirm(
            "Please sign in to save opportunities and track them in your portfolio.\n\nGo to login now?",
          );
          if (shouldLogin) {
            router.push(
              `/login/student?next=${encodeURIComponent(window.location.pathname)}`,
            );
          }
          return;
        }

        alert(result.error);
        return;
      }

      if (result.saved !== undefined) {
        setSaved(result.saved);
        if (result.remindDeadline !== undefined) {
          setRemind(result.remindDeadline);
        }
      }
    });
  }

  function handleToggleReminder() {
    const nextVal = !remind;
    setRemind(nextVal);
    startReminderTransition(async () => {
      const res = await updateOpportunityReminder(opportunityId, nextVal);
      if (res.error) {
        setRemind(!nextVal);
        alert(res.error);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant={saved ? "primary" : "outline"}
        size={size}
        onClick={handleClick}
        disabled={isPending}
        aria-label={saved ? "Unsave opportunity" : "Save opportunity"}
        className="shrink-0"
      >
        {isPending ? "…" : saved ? "Saved ✓" : "Save"}
      </Button>

      {saved && showReminderToggle && hasDeadline && (
        <button
          type="button"
          onClick={handleToggleReminder}
          disabled={isReminderPending}
          title={
            remind
              ? "Deadline reminders are ON. Click to mute."
              : "Deadline reminders are OFF. Click to turn on."
          }
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
            remind
              ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700"
          }`}
        >
          <span>{remind ? "🔔" : "🔕"}</span>
          <span>{isReminderPending ? "Saving…" : remind ? "Deadline alert on" : "Muted"}</span>
        </button>
      )}
    </div>
  );
}

