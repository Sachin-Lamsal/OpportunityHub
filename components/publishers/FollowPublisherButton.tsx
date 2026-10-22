"use client";

import { useState, useTransition } from "react";
import { toggleFollowOrganization } from "@/lib/actions/community";
import Button from "@/components/ui/Button";

interface FollowPublisherButtonProps {
  publisherId: string;
  initialFollowing: boolean;
}

export default function FollowPublisherButton({
  publisherId,
  initialFollowing,
}: FollowPublisherButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleFollowOrganization(publisherId);
      if (!res.success) {
        setError(res.error || "Could not update follow status.");
        return;
      }
      setFollowing(Boolean(res.following));
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={following ? "outline" : "primary"}
        size="sm"
        disabled={isPending}
        onClick={handleToggle}
      >
        {isPending ? "Updating" : following ? "Following" : "Follow"}
      </Button>
      {error && <p className="text-xs text-rose-600 max-w-[12rem] text-right">{error}</p>}
    </div>
  );
}
