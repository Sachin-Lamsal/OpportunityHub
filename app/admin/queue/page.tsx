import { getApprovalQueue } from "@/lib/queries/discovery";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Approval Queue" };

export default async function ApprovalQueuePage() {
  const queue = await getApprovalQueue();
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Approval Queue ({queue.length})</h2>
      {queue.length > 0 ? (
        <div className="space-y-4">
          {queue.map((item) => (
            <Card key={item.id} className="p-6 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{item.candidate?.title}</h3>
                <p className="text-sm text-slate-600">{item.candidate?.organizer}</p>
              </div>
              <Button href={`/admin/candidate/${item.candidate_id}`} size="sm">Review</Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">No items pending</Card>
      )}
    </div>
  );
}
