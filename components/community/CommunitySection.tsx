"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { OpportunityComment, OpportunityReview, Profile } from "@/lib/types";
import { postComment, deleteComment, submitReview } from "@/lib/actions/community";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import FormMessage from "@/components/ui/FormMessage";

interface CommunitySectionProps {
  opportunityId: string;
  initialComments: OpportunityComment[];
  initialReviews: OpportunityReview[];
  currentProfile: Profile | null;
}

export default function CommunitySection({
  opportunityId,
  initialComments,
  initialReviews,
  currentProfile,
}: CommunitySectionProps) {
  const [activeTab, setActiveTab] = useState<"advice" | "qa">("advice");
  const [isPending, startTransition] = useTransition();
  // The comments and reviews are rendered from server props, so a successful
  // mutation has to pull the new rows in. Without this the action reported
  // "Comment posted!" while the list stayed exactly as it was.
  const router = useRouter();

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced" | "Challenging">("Intermediate");
  const [prepTips, setPrepTips] = useState("");
  const [commonMistakes, setCommonMistakes] = useState("");
  const [skillsDeveloped, setSkillsDeveloped] = useState("");
  const [reviewMsg, setReviewMsg] = useState<{ error?: string; success?: string } | null>(null);

  // Comment form state
  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [commentMsg, setCommentMsg] = useState<{
    error?: string;
    success?: string;
  } | null>(null);

  function handleSubmitReview(e: FormEvent) {
    e.preventDefault();
    setReviewMsg(null);
    startTransition(async () => {
      const res = await submitReview(opportunityId, {
        difficulty_rating: difficulty,
        prep_tips: prepTips,
        common_mistakes: commonMistakes,
        skills_developed: skillsDeveloped,
      });
      if (res.error) {
        setReviewMsg({ error: res.error });
      } else {
        setReviewMsg({ success: res.success });
        setShowReviewForm(false);
        setPrepTips("");
        setCommonMistakes("");
        setSkillsDeveloped("");
        router.refresh();
      }
    });
  }

  function handlePostComment(e: FormEvent, parentId?: string | null) {
    e.preventDefault();
    setCommentMsg(null);
    startTransition(async () => {
      const res = await postComment(opportunityId, newComment, parentId);
      if (res.error) {
        setCommentMsg({ error: res.error });
      } else {
        setCommentMsg({ success: res.success ?? "Comment posted!" });
        setNewComment("");
        setReplyingToId(null);
        router.refresh();
      }
    });
  }

  function handleDeleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    setCommentMsg(null);
    startTransition(async () => {
      const res = await deleteComment(id, opportunityId);
      if (res.error) {
        setCommentMsg({ error: res.error });
      } else {
        setCommentMsg({ success: res.success ?? "Comment deleted." });
        router.refresh();
      }
    });
  }

  return (
    <Card className="mt-8 border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            Community Knowledge
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Student Experiences & Questions
          </h2>
          <p className="text-xs text-slate-500">
            Unfiltered insights from past participants. Separate from official organizer information.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("advice")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              activeTab === "advice"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Participant advice ({initialReviews.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("qa")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              activeTab === "qa"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            💬 Q&A & Discussion ({initialComments.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PARTICIPANT REVIEWS & ADVICE */}
      {activeTab === "advice" && (
        <div className="pt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Have you participated in this before? Help future applicants prepare effectively.
            </p>
            {currentProfile && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? "Cancel" : "+ Share Your Experience"}
              </Button>
            )}
          </div>

          {reviewMsg?.error && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{reviewMsg.error}</p>
          )}
          {reviewMsg?.success && (
            <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{reviewMsg.success}</p>
          )}

          {/* Form to submit review */}
          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <h3 className="text-sm font-bold text-indigo-950">Share Your Participant Advice</h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Perceived Difficulty</label>
                <div className="flex gap-2">
                  {(["Beginner", "Intermediate", "Advanced", "Challenging"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium ${
                        difficulty === lvl
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-slate-300 text-slate-700"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                label="Preparation Tips & Workload"
                required
                rows={2}
                placeholder="What materials did you study? How many hours per week did you invest?"
                value={prepTips}
                onChange={(e) => setPrepTips(e.target.value)}
              />

              <Textarea
                label="Common Mistakes to Avoid"
                rows={2}
                placeholder="What mistakes did teams/delegates make that hurt their chances?"
                value={commonMistakes}
                onChange={(e) => setCommonMistakes(e.target.value)}
              />

              <Input
                label="What did you learn / take away?"
                placeholder="e.g. Negotiation, debugging under pressure, teamwork"
                value={skillsDeveloped}
                onChange={(e) => setSkillsDeveloped(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Submitting..." : "Post Advice"}
                </Button>
              </div>
            </form>
          )}

          {/* Reviews list */}
          {initialReviews.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No participant advice posted yet. Be the first to share your experience!
            </div>
          ) : (
            <div className="space-y-3">
              {initialReviews.map((rev) => (
                <div key={rev.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        {rev.organization_name || "Participant"}
                      </span>
                      {rev.verified_participant && (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                          Verified participant
                        </span>
                      )}
                    </div>
                    {rev.difficulty_rating && (
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        Difficulty: {rev.difficulty_rating}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                    <p><strong className="text-slate-900">Preparation Tip:</strong> {rev.prep_tips}</p>
                    {rev.common_mistakes && (
                      <p><strong className="text-slate-900">Mistakes to Avoid:</strong> {rev.common_mistakes}</p>
                    )}
                    {rev.skills_developed && (
                      <p><strong className="text-slate-900">Skills Gained:</strong> {rev.skills_developed}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMMUNITY Q&A */}
      {activeTab === "qa" && (
        <div className="pt-4 space-y-4">
          {currentProfile ? (
            <form onSubmit={(e) => handlePostComment(e, replyingToId)} className="space-y-2">
              <FormMessage
                error={commentMsg?.error}
                success={commentMsg?.success}
              />
              <Textarea
                label={replyingToId ? "Reply to discussion" : "Ask a question about this opportunity"}
                rows={2}
                placeholder="Ask about team formation, preparation materials, or eligibility..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="flex items-center justify-between">
                {replyingToId && (
                  <button
                    type="button"
                    onClick={() => setReplyingToId(null)}
                    className="text-xs text-slate-500 underline"
                  >
                    Cancel reply
                  </button>
                )}
                <div className="ml-auto">
                  <Button type="submit" size="sm" disabled={isPending || !newComment.trim()}>
                    {isPending ? "Posting..." : replyingToId ? "Post Reply" : "Post Question"}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-600">
              <a href="/login" className="font-semibold text-indigo-600 underline">Sign in</a> to ask questions or reply to the community.
            </div>
          )}

          {initialComments.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No questions or discussions yet. Ask the first question!
            </div>
          ) : (
            <div className="space-y-2.5">
              {initialComments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      {comment.organization_name || "User"}
                      {comment.account_type && comment.account_type !== "student" && (
                        <span className="ml-1.5 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                          {comment.account_type}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                      {currentProfile?.id === comment.user_id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-rose-500 hover:text-rose-700 font-semibold"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
