import type { Activity } from "@/lib/types";
import ActivityCard from "@/components/portfolio/ActivityCard";
import { Card } from "@/components/ui/Card";
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
      <Card className="text-center py-10">
        <p className="text-slate-600">{emptyMessage}</p>
        {showAddButton && (
          <div className="mt-4">
            <Button href="/portfolio/add" size="sm">
              Add your first activity
            </Button>
          </div>
        )}
      </Card>
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
