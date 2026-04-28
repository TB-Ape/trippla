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
import { PageTransition } from "@/components/PageTransition";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import { UtensilsCrossed, Hotel, Car, Target, MapPin, Wallet, Pencil, Trash2, MoreVertical } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface ExpenseSplit {
  id: string;
  amount: number;
  user: User;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paidBy: User;
  splits: ExpenseSplit[];
}

interface Balance {
  userId: string;
  userName: string;
  userEmail: string;
  balance: number;
}

interface TripMember {
  id: string;
  userId: string;
  user: User;
}

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const params = useParams();
  const tripId = params.tripId as string;
  const { toasts, toast, removeToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [tripCurrency, setTripCurrency] = useState("EUR");
  const [tripStartDate, setTripStartDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<{ [userId: string]: number }>({});
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [openMenuExpenseId, setOpenMenuExpenseId] = useState<string | null>(null);

  const CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
    { value: "food", label: t("expenses.categories.food"), icon: UtensilsCrossed },
    { value: "accommodation", label: t("expenses.categories.accommodation"), icon: Hotel },
    { value: "transport", label: t("expenses.categories.transport"), icon: Car },
    { value: "activity", label: t("expenses.categories.activity"), icon: Target },
    { value: "other", label: t("expenses.categories.other"), icon: MapPin },
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router]);

  useEffect(() => {
    if (session && tripId) {
      fetchData();
      localStorage.setItem(`seen_${tripId}_expense`, new Date().toISOString());
    }
  }, [session, tripId]);

  useEffect(() => {
    if (!openMenuExpenseId) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-expense-menu]")) {
        setOpenMenuExpenseId(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuExpenseId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuExpenseId]);

  async function fetchData() {
    try {
      const [expensesRes, balancesRes, tripRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/expenses`),
        fetch(`/api/trips/${tripId}/expenses/balance`),
        fetch(`/api/trips/${tripId}`),
      ]);

      if (!expensesRes.ok || !balancesRes.ok || !tripRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const expensesData = await expensesRes.json();
      const balancesData = await balancesRes.json();
      const tripData = await tripRes.json();

      setExpenses(expensesData.expenses);
      if (expensesData.userRole) setUserRole(expensesData.userRole);
      if (expensesData.tripStartDate) setTripStartDate(new Date(expensesData.tripStartDate).toISOString().split("T")[0]);
      setBalances(balancesData.balances);
      setMembers(tripData.trip.members);
      setTripCurrency(tripData.trip.currency || "EUR");

      setSelectedMembers(tripData.trip.members.map((m: TripMember) => m.userId));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function openAddModal() {
    setEditingExpense(null);
    setFormDescription("");
    setFormAmount("");
    setFormDate("");
    setFormCategory("");
    setSplitType("equal");
    setCustomSplits({});
    setSelectedMembers(members.map((m) => m.userId));
    setError("");
    setShowAddModal(true);
  }

  function openEditModal(expense: Expense) {
    setEditingExpense(expense);
    setFormDescription(expense.description);
    setFormAmount(Number(expense.amount).toString());
    setFormDate(expense.date.slice(0, 10));
    setFormCategory(expense.category || "");
    setError("");

    // Initialize split state from existing expense splits
    if (expense.splits.length > 0) {
      const splitIds = expense.splits.map((s) => s.user.id);
      setSelectedMembers(splitIds);
      const total = Number(expense.amount);
      const perPerson = total / expense.splits.length;
      const isEqual = expense.splits.every((s) => Math.abs(Number(s.amount) - perPerson) < 0.02);
      if (isEqual) {
        setSplitType("equal");
        setCustomSplits({});
      } else {
        setSplitType("custom");
        const custom: { [key: string]: number } = {};
        expense.splits.forEach((s) => { custom[s.user.id] = Number(s.amount); });
        setCustomSplits(custom);
      }
    } else {
      setSplitType("equal");
      setSelectedMembers(members.map((m) => m.userId));
      setCustomSplits({});
    }

    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingExpense(null);
    setError("");
    setSplitType("equal");
    setCustomSplits({});
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (editingExpense) {
      await handleUpdateExpense();
    } else {
      await handleAddExpense(e);
    }
  }

  async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const date = formData.get("date") as string;

    let splits: { userId: string; amount: number }[] | undefined;
    let memberIds: string[] | undefined;

    if (splitType === "equal") {
      if (selectedMembers.length === 0) {
        setError(t("expenses.selectMember"));
        return;
      }
      memberIds = selectedMembers;
    } else {
      splits = Object.entries(customSplits).map(([userId, splitAmount]) => ({
        userId,
        amount: splitAmount,
      }));

      if (splits.length === 0) {
        setError(t("expenses.addSplit"));
        return;
      }

      const splitSum = splits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(splitSum - amount) > 0.01) {
        setError(t("expenses.splitsSum", { amount: amount.toFixed(2) }));
        return;
      }
    }

    const data = {
      description,
      amount,
      category: category || undefined,
      date,
      splitType,
      splits,
      memberIds,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add expense");
      }

      closeModal();
      toast.success(t("expenses.added"));
      fetchData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateExpense() {
    if (!editingExpense) return;

    const amount = parseFloat(formAmount);

    let splits: { userId: string; amount: number }[] | undefined;
    let memberIds: string[] | undefined;

    if (splitType === "equal") {
      if (selectedMembers.length === 0) {
        setError(t("expenses.selectMember"));
        return;
      }
      memberIds = selectedMembers;
    } else {
      splits = Object.entries(customSplits).map(([userId, splitAmount]) => ({ userId, amount: splitAmount }));
      if (splits.length === 0) {
        setError(t("expenses.addSplit"));
        return;
      }
      const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitSum - amount) > 0.01) {
        setError(t("expenses.splitsSum", { amount: amount.toFixed(2) }));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExpense.id,
          description: formDescription,
          amount,
          category: formCategory || undefined,
          date: formDate,
          splitType,
          splits,
          memberIds,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update expense");
      }

      closeModal();
      toast.success(t("expenses.updated"));
      fetchData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      const response = await fetch(
        `/api/trips/${tripId}/expenses?id=${expenseId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete expense");
      }

      setShowDeleteConfirm(null);
      toast.success(t("expenses.deleted"));
      fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error(t("expenses.deleteFailed"));
    }
  }

  async function handleSettle(fromId: string, toId: string) {
    try {
      const response = await fetch(`/api/trips/${tripId}/expenses/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId, toId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to settle");
      }

      toast.success(t("expenses.settlementRecorded"));
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to settle");
    }
  }

  function toggleMember(userId: string) {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: tripCurrency,
    }).format(amount);
  }

  function calculateSettlements() {
    const creditors = balances
      .filter((b) => b.balance > 0.005)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.balance - a.balance);
    const debtors = balances
      .filter((b) => b.balance < -0.005)
      .map((b) => ({ ...b }))
      .sort((a, b) => a.balance - b.balance);

    const settlements: { fromName: string; toName: string; fromId: string; toId: string; amount: number }[] = [];

    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0];
      const debtor = debtors[0];
      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

      settlements.push({
        fromName: debtor.userName || debtor.userEmail,
        toName: creditor.userName || creditor.userEmail,
        fromId: debtor.userId,
        toId: creditor.userId,
        amount: Math.round(amount * 100) / 100,
      });

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance < 0.005) creditors.shift();
      if (debtor.balance > -0.005) debtors.shift();
    }

    return settlements;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getCategoryIcon(category: string | null): LucideIcon {
    return CATEGORIES.find((c) => c.value === category)?.icon ?? MapPin;
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

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.category] = (acc[exp.category] ?? 0) + Number(exp.amount);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppHeader backHref={`/trips/${tripId}`} />

      <TripNav tripId={tripId} currentSection="expenses" />

      <PageTransition section="expenses" tripId={tripId}>
      {/* Page Header */}
      <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("expenses.title")}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400">
                {expenses.length} {expenses.length === 1 ? t("expenses.expense") : t("expenses.expenses")} ·{" "}
                {formatCurrency(totalExpenses)} {t("common.total")}
              </p>
            </div>

            <Button
              onClick={openAddModal}
              variant="gradient"
              size="lg"
            >
              + {t("expenses.addExpense")}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Expenses List */}
            <div className="md:col-span-2">
              {expenses.length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-3 items-end mb-6 pb-6 border-b border-white/10">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                      {t("common.total")}
                    </div>
                    <div className="text-xl font-black text-white">
                      {formatCurrency(totalExpenses)}
                    </div>
                  </div>
                  <div className="w-px bg-white/10 h-8 self-center" />
                  {Object.entries(categoryTotals).map(([category, amount]) => (
                    <div key={category}>
                      <div className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-1">
                        {t(`expenses.categories.${category}`)}
                      </div>
                      <div className="text-sm font-bold text-gray-300">
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <h2 className="text-3xl font-black mb-6 tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("expenses.transactions")}
                </span>
              </h2>

              {expenses.length === 0 ? (
                <div className="bg-white/5 border border-white/10 p-8 md:p-16 text-center">
                  <Wallet className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
                  <h2 className="text-3xl font-bold mb-4 tracking-tight">
                    {t("expenses.noExpenses")}
                  </h2>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    {t("expenses.noExpensesSubtitle")}
                  </p>
                  <Button onClick={openAddModal} variant="gradient">
                    {t("expenses.addFirstExpense")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    [...expenses]
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .reduce<Record<string, typeof expenses>>((groups, expense) => {
                        const day = new Date(expense.date).toISOString().slice(0, 10);
                        (groups[day] ||= []).push(expense);
                        return groups;
                      }, {})
                  ).map(([day, group]) => (
                    <div key={day}>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-white/10 pb-2">
                        {formatDate(day)}
                      </div>
                      <div className="space-y-3">
                        {group.map((expense) => {
                          const CategoryIcon = getCategoryIcon(expense.category);
                          return (
                          <Card key={expense.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex gap-4 flex-1">
                                <div className="flex items-center">
                                  <CategoryIcon className="w-7 h-7 shrink-0" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold mb-1">
                                    {expense.description}
                                  </h3>
                                  <p className="text-sm text-gray-500 mb-2">
                                    {t("expenses.paidBy")}{" "}
                                    {expense.paidBy.name || expense.paidBy.email}
                                  </p>
                                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                    {expense.splits.map((split) => (
                                      <span key={split.id}>
                                        {split.user.name || split.user.email}:{" "}
                                        {formatCurrency(Number(split.amount))}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="text-2xl font-black text-teal-400">
                                  {formatCurrency(Number(expense.amount))}
                                </div>
                                {(() => {
                                  const mySplit = expense.splits.find(s => s.user.id === session?.user?.id);
                                  return mySplit ? (
                                    <div className="text-xs text-gray-500">
                                      {t("expenses.yourShare")}:{" "}
                                      <span className="text-gray-300 font-bold">{formatCurrency(Number(mySplit.amount))}</span>
                                    </div>
                                  ) : null;
                                })()}
                                {canModify(expense.paidBy.id) && (
                                  <div className="relative" data-expense-menu>
                                    <button
                                      onClick={() => setOpenMenuExpenseId(openMenuExpenseId === expense.id ? null : expense.id)}
                                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-gray-400 hover:border-white/40 hover:text-white transition-colors text-sm"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {openMenuExpenseId === expense.id && (
                                      <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-10 min-w-[130px]">
                                        <button
                                          onClick={() => { openEditModal(expense); setOpenMenuExpenseId(null); }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors"
                                        >
                                          <Pencil className="w-3 h-3" />
                                          {t("common.edit")}
                                        </button>
                                        <button
                                          onClick={() => { setShowDeleteConfirm(expense.id); setOpenMenuExpenseId(null); }}
                                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          {t("common.delete")}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Balance Summary */}
            <div>
              <h2 className="text-3xl font-black mb-6 tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("expenses.balances")}
                </span>
              </h2>

              <div className="space-y-3">
                {balances.map((balance) => (
                  <Card key={balance.userId} className="p-4">
                    <p className="font-bold mb-1">
                      {balance.userName || balance.userEmail}
                    </p>
                    <p
                      className={`text-2xl font-black ${
                        balance.balance > 0
                          ? "text-green-400"
                          : balance.balance < 0
                          ? "text-red-400"
                          : "text-gray-500"
                      }`}
                    >
                      {balance.balance > 0 ? "+" : ""}
                      {formatCurrency(balance.balance)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {balance.balance > 0
                        ? t("common.isOwed")
                        : balance.balance < 0
                        ? t("common.owes")
                        : t("common.settledUp")}
                    </p>
                  </Card>
                ))}
              </div>

              {/* Settle Up */}
              {(() => {
                const settlements = calculateSettlements();
                if (settlements.length === 0) return null;
                return (
                  <div className="mt-6">
                    <h2 className="text-3xl font-black mb-4 tracking-tight">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                        {t("expenses.settleUp")}
                      </span>
                    </h2>
                    <div className="space-y-2">
                      {settlements.map((s, i) => (
                        <Card key={i} className="p-3">
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-bold text-red-400">{s.fromName}</span>
                            <span className="text-gray-500">→</span>
                            <span className="font-bold text-green-400">{s.toName}</span>
                            <span className="font-black text-white">{formatCurrency(s.amount)}</span>
                            {session?.user?.id === s.toId && (
                              <button
                                onClick={() => handleSettle(s.fromId, s.toId)}
                                className="ml-auto px-3 py-1 text-xs border border-teal-500/50 text-teal-400 hover:bg-teal-500/10 transition-colors uppercase tracking-wider font-bold"
                              >
                                {t("expenses.settle")}
                              </button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </main>

      </PageTransition>

      {/* Add / Edit Expense Modal */}
      <Modal open={showAddModal} onClose={closeModal} maxWidth="max-w-lg">
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight">
            {editingExpense ? (
              <>
                {t("expenses.editExpense").split(" ")[0].toUpperCase()}{" "}
                <span className="text-teal-400">
                  {t("expenses.editExpense").split(" ").slice(1).join(" ").toUpperCase()}
                </span>
              </>
            ) : (
              <>
                {t("expenses.addExpense").split(" ")[0].toUpperCase()}{" "}
                <span className="text-teal-400">
                  {t("expenses.addExpense").split(" ").slice(1).join(" ").toUpperCase()}
                </span>
              </>
            )}
          </h2>
        </Modal.Header>
        <Modal.Body>
            <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="description">{t("expenses.description")} *</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder={t("expenses.description")}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">{t("expenses.amount")} *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="50.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">{t("expenses.date")} *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formDate}
                    min={tripStartDate || undefined}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">{t("itinerary.category")}</Label>
                <Select
                  id="category"
                  name="category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="">{t("common.selectCategory")}</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>

              <>
                  <div>
                    <Label>{t("expenses.splitType")}</Label>
                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => setSplitType("equal")}
                        className={`flex-1 px-3 py-3 border transition-colors text-xs font-bold uppercase leading-tight ${
                          splitType === "equal"
                            ? "bg-teal-500 border-teal-500 text-white"
                            : "border-white/20 hover:bg-white/5"
                        }`}
                      >
                        {t("expenses.equalSplit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitType("custom")}
                        className={`flex-1 px-3 py-3 border transition-colors text-xs font-bold uppercase leading-tight ${
                          splitType === "custom"
                            ? "bg-teal-500 border-teal-500 text-white"
                            : "border-white/20 hover:bg-white/5"
                        }`}
                      >
                        {t("expenses.customSplit")}
                      </button>
                    </div>
                  </div>

                  {splitType === "equal" && (
                    <div>
                      <Label>{t("expenses.splitBetween")}</Label>
                      <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                        {members.map((member) => (
                          <label
                            key={member.id}
                            className="flex items-center gap-3 p-2 border border-white/10 hover:bg-white/5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(member.userId)}
                              onChange={() => toggleMember(member.userId)}
                              className="w-5 h-5"
                            />
                            <span>{member.user.name || member.user.email}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {splitType === "custom" && (
                    <div>
                      <Label>{t("expenses.customSplits")}</Label>
                      <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                        {members.map((member) => (
                          <div key={member.id} className="flex gap-2 items-center">
                            <span className="flex-1 text-sm">
                              {member.user.name || member.user.email}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={customSplits[member.userId] || ""}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setCustomSplits((prev) => ({
                                  ...prev,
                                  [member.userId]: value,
                                }));
                              }}
                              className="w-32"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>

            </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="expense-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting
              ? t("common.saving")
              : editingExpense
              ? t("common.saveChanges")
              : t("expenses.addExpense")}
          </Button>
          <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title={t("expenses.deleteTitle")}
          message={t("expenses.deleteConfirm")}
          onConfirm={() => handleDeleteExpense(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
