"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { TripNav } from "@/components/TripNav";
import { AppHeader } from "@/components/AppHeader";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Modal } from "@/components/ui/modal";
import { PageTransition } from "@/components/PageTransition";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import { Vote, Trash2, MoreVertical } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface PollVote {
  id: string;
  user: User;
}

interface PollOption {
  id: string;
  text: string;
  votes: PollVote[];
}

interface Poll {
  id: string;
  question: string;
  allowMultiple: boolean;
  expiresAt: string | null;
  createdBy: User;
  options: PollOption[];
}

export default function PollsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const params = useParams();
  const tripId = params.tripId as string;

  const { toasts, toast, removeToast } = useToast();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuPollId, setOpenMenuPollId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router]);

  useEffect(() => {
    if (session && tripId) {
      fetchPolls();
      localStorage.setItem(`seen_${tripId}_poll`, new Date().toISOString());
    }
  }, [session, tripId]);

  async function fetchPolls() {
    try {
      const response = await fetch(`/api/trips/${tripId}/polls`);
      if (!response.ok) {
        throw new Error("Failed to fetch polls");
      }
      const data = await response.json();
      setPolls(data.polls);
      if (data.userRole) setUserRole(data.userRole);
    } catch (error) {
      console.error("Error fetching polls:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreatePoll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const question = formData.get("question") as string;
    const allowMultiple = formData.get("allowMultiple") === "on";
    const expiresAt = formData.get("expiresAt") as string;

    // Filter out empty options
    const options = pollOptions
      .filter((opt) => opt.trim() !== "")
      .map((text) => ({ text }));

    if (options.length < 2) {
      setError(t("polls.minOptions"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          options,
          allowMultiple,
          expiresAt: expiresAt || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create poll");
      }

      setShowCreateModal(false);
      setPollOptions(["", ""]);
      toast.success(t("polls.created"));
      fetchPolls();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVote(optionId: string, poll: Poll) {
    if (!session) return;

    // Check if user already voted for this option
    const option = poll.options.find((opt) => opt.id === optionId);
    const userVoted = option?.votes.some((vote) => vote.user.id === session.user.id);

    try {
      if (userVoted) {
        // Remove vote
        const response = await fetch(
          `/api/trips/${tripId}/polls/vote?optionId=${optionId}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          throw new Error("Failed to remove vote");
        }
      } else {
        // Add vote
        const response = await fetch(`/api/trips/${tripId}/polls/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionId }),
        });

        if (!response.ok) {
          throw new Error("Failed to vote");
        }
      }

      fetchPolls();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error(t("polls.voteFailed"));
    }
  }

  async function handleDeletePoll(pollId: string) {
    try {
      const response = await fetch(`/api/trips/${tripId}/polls?id=${pollId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete poll");
      }

      setShowDeleteConfirm(null);
      toast.success(t("polls.deleted"));
      fetchPolls();
    } catch (error) {
      console.error("Error deleting poll:", error);
      toast.error(t("polls.deleteFailed"));
    }
  }

  function getPollStats(poll: Poll) {
    const totalVotes = poll.options.reduce(
      (sum, opt) => sum + opt.votes.length,
      0
    );
    return { totalVotes };
  }

  function getOptionPercentage(option: PollOption, totalVotes: number) {
    if (totalVotes === 0) return 0;
    return Math.round((option.votes.length / totalVotes) * 100);
  }

  function userVotedInPoll(poll: Poll): boolean {
    if (!session) return false;
    return poll.options.some((opt) =>
      opt.votes.some((vote) => vote.user.id === session.user.id)
    );
  }

  function addPollOption() {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, ""]);
    }
  }

  function updatePollOption(index: number, value: string) {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  }

  function removePollOption(index: number) {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  }

  const canModify = (creatorId: string) =>
    userRole === "OWNER" || userRole === "ADMIN" || creatorId === session?.user?.id;

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppHeader backHref={`/trips/${tripId}`} />

      <TripNav tripId={tripId} currentSection="polls" />

      <PageTransition section="polls" tripId={tripId}>
      {/* Page Header */}
      <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("polls.title")}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400">
                {polls.length} {polls.length === 1 ? t("polls.poll") : t("polls.polls")}
              </p>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              variant="gradient"
              size="lg"
            >
              + {t("polls.createPoll")}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          {polls.length === 0 ? (
            <div className="bg-white/5 border border-white/10 p-8 md:p-16 text-center">
              <Vote className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
              <h2 className="text-3xl font-bold mb-4 tracking-tight">
                {t("polls.noPolls")}
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                {t("polls.noPollsSubtitle")}
              </p>
              <Button onClick={() => setShowCreateModal(true)} variant="gradient">
                {t("polls.createFirstPoll")}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {polls.map((poll) => {
                const stats = getPollStats(poll);
                const userVoted = userVotedInPoll(poll);

                return (
                  <Card key={poll.id} className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">{poll.question}</h2>
                        <p className="text-sm text-gray-500">
                          {t("polls.createdBy")} {poll.createdBy.name || poll.createdBy.email} ·{" "}
                          {stats.totalVotes} {stats.totalVotes === 1 ? t("polls.vote") : t("polls.votes")}
                          {poll.allowMultiple && ` · ${t("polls.multipleChoice")}`}
                        </p>
                      </div>
                      {canModify(poll.createdBy.id) && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenMenuPollId(openMenuPollId === poll.id ? null : poll.id)}
                          className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                        ><MoreVertical className="w-4 h-4" /></button>
                        {openMenuPollId === poll.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuPollId(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
                              <button
                                onClick={() => { setShowDeleteConfirm(poll.id); setOpenMenuPollId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {poll.options.map((option) => {
                        const percentage = getOptionPercentage(option, stats.totalVotes);
                        const userVotedThis = option.votes.some(
                          (vote) => vote.user.id === session.user.id
                        );

                        return (
                          <button
                            key={option.id}
                            onClick={() => handleVote(option.id, poll)}
                            className={`w-full text-left p-4 border transition-all ${
                              userVotedThis
                                ? "border-teal-500 bg-teal-500/10"
                                : "border-white/10 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold">{option.text}</span>
                              <span
                                className={`text-sm ${
                                  userVotedThis ? "text-teal-400" : "text-gray-500"
                                }`}
                              >
                                {option.votes.length} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all bg-gradient-to-r from-teal-400 to-cyan-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            {option.votes.length > 0 && (
                              <div className="mt-2 text-xs text-gray-600">
                                {option.votes
                                  .map((vote) => vote.user.name || vote.user.email)
                                  .join(", ")}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      </PageTransition>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title={t("polls.deleteTitle")}
          message={t("polls.deleteConfirm")}
          onConfirm={() => handleDeletePoll(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {/* Create Poll Modal */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setError(""); setPollOptions(["", ""]); }} maxWidth="max-w-lg">
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight">
            {t("polls.createPollModal").split(" ")[0]}{" "}
            <span className="text-teal-400">{t("polls.createPollModal").split(" ").slice(1).join(" ")}</span>
          </h2>
        </Modal.Header>
        <Modal.Body>
            <form id="create-poll-form" onSubmit={handleCreatePoll} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="question">{t("polls.question")} *</Label>
                <Input
                  id="question"
                  name="question"
                  placeholder={t("polls.question")}
                  required
                />
              </div>

              <div>
                <Label>{t("polls.options")} *</Label>
                <div className="space-y-2 mt-2">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        placeholder={`${t("polls.options")} ${index + 1}`}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(index)}
                          className="px-3 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 10 && (
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="mt-2 text-sm text-teal-400 hover:text-teal-300"
                  >
                    + {t("polls.addOption")}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowMultiple"
                  name="allowMultiple"
                  className="w-5 h-5"
                />
                <Label htmlFor="allowMultiple" className="cursor-pointer">
                  {t("polls.allowMultiple")}
                </Label>
              </div>

              <div>
                <Label htmlFor="expiresAt">{t("polls.expiresAt")}</Label>
                <Input
                  id="expiresAt"
                  name="expiresAt"
                  type="datetime-local"
                />
              </div>
            </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="create-poll-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("polls.createPoll")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setShowCreateModal(false); setError(""); setPollOptions(["", ""]); }}
            className="flex-1"
          >
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
