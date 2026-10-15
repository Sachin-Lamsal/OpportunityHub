import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getApprovalQueue, getAuditEvents, getAdminDashboardStats } from "@/lib/queries/discovery";

export const metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboard() {
  const queue = await getApprovalQueue({ status: "pending" });
  const auditEvents = await getAuditEvents(10);
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Opportunity Discovery & Approval</h2>
        <p className="mt-2 text-slate-600">
          Review, verify, and approve discovered opportunities for official publication
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-4xl font-bold text-indigo-600">{stats.pendingReview}</div>
          <p className="mt-1 text-sm text-slate-600">Pending Review</p>
        </Card>
        <Card>
          <div className="text-4xl font-bold text-green-600">{stats.approvedToday}</div>
          <p className="mt-1 text-sm text-slate-600">Approved Today</p>
        </Card>
        <Card>
          <div className="text-4xl font-bold text-amber-600">{stats.flaggedIssues}</div>
          <p className="mt-1 text-sm text-slate-600">Flagged Issues</p>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Approval Queue</h3>
          <Button href="/admin/queue" variant="outline" size="sm">
            View All
          </Button>
        </div>
        {queue.length > 0 ? (
          <div className="space-y-2">
            {queue.slice(0, 5).map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">
                      {item.candidate?.title || "Untitled"}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.candidate?.organizer || "Unknown"}
                    </p>
                  </div>
                  <Button
                    href={`/admin/candidate/${item.candidate_id}`}
                    variant="outline"
                    size="sm"
                  >
                    Review
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8 text-slate-600">
            No items pending review
          </Card>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent Activity</h3>
        <div className="space-y-2">
          {auditEvents.map((event) => (
            <Card key={event.id} className="p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">{event.action}</span>
                  <span className="mx-2 text-slate-400">•</span>
                  <span className="text-slate-600">{event.target_type}</span>
                </div>
                <span className="text-slate-500">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
