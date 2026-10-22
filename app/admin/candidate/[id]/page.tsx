import { getCandidateWithEvidence } from "@/lib/queries/discovery";
import CandidateReviewActions from "@/components/admin/CandidateReviewActions";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Review Candidate" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CandidatePage({ params }: PageProps) {
  const { id } = await params;
  const { candidate, evidence, flags } = await getCandidateWithEvidence(id);

  if (!candidate) {
    return <div>Candidate not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">{candidate.title}</h2>
        <p className="text-slate-600">{candidate.organizer}</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900">Description</h3>
          <p className="text-slate-700">{candidate.description}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm font-semibold text-slate-600">Deadline</span>
            <p>{candidate.deadline || "N/A"}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-600">Location</span>
            <p>{candidate.location || "N/A"}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-600">Organizer</span>
            <p>{candidate.organizer || "N/A"}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-600">Grade Requirements</span>
            <p>{candidate.grade_requirements || "N/A"}</p>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="font-semibold text-slate-900 mb-2">Verification Evidence ({evidence.length})</h3>
        {evidence.length > 0 ? (
          <div className="space-y-2">
            {evidence.map((e) => (
              <Card key={e.id} className="p-4">
                <p className="text-sm"><strong>{e.claim}</strong></p>
                <p className="text-xs text-slate-600 mt-1">Verdict: {e.verdict}</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-slate-600">No verification evidence yet</p>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-2">Risk Flags ({flags.length})</h3>
        {flags.length > 0 ? (
          <div className="space-y-2">
            {flags.map((f) => (
              <Card key={f.id} className="p-4 bg-red-50 border-red-200">
                <p className="text-sm font-semibold text-red-900">{f.flag_type}</p>
                <p className="text-sm text-red-800 mt-1">{f.description}</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-slate-600">No flags</p>
        )}
      </div>

      <CandidateReviewActions candidateId={id} />
    </div>
  );
}
