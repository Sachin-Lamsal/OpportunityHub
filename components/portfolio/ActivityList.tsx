import type { Activity } from "@/lib/types";
import ActivityCard from "@/components/portfolio/ActivityCard";
import { EmptyState } from "@/components/ui/States";
import Button from "@/components/ui/Button";

interface ActivityListProps {
  activities: Activity[];
  emptyMessage?: string;
  showDelete?: boolean;
  showAddButton?: boolean;
}

export default function ActivityList({
  activities,
  emptyMessage = "No activities yet.",
  showDelete = true,
  showAddButton = false,
}: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="No activities logged yet"
        description={emptyMessage}
        action={
          showAddButton ? (
            <Button href="/portfolio/add" size="sm">
              Add your first activity
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          showDelete={showDelete}
        />
      ))}
    </div>
  );
}
