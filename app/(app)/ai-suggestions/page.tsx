import PageHeader from "@/components/layout/PageHeader";
import AiTalkChat from "@/components/ai/AiTalkChat";
import AISuggestionsPanel from "@/components/ai/AISuggestionsPanel";

export const metadata = {
  title: "AI Advisor",
};

export default function AISuggestionsPage() {
  return (
    <>
      <PageHeader
        title="AI Advisor & Mentorship"
        description="Talk directly with your admissions mentor or generate structured portfolio guidance."
      />

      <div className="space-y-8">
        <section>
          <AiTalkChat />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Portfolio Gap Analysis & Strategy
          </h2>
          <AISuggestionsPanel />
        </section>
      </div>
    </>
  );
}
