"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Flame,
  Home,
  LogOut,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { LearnerAnalytics } from "@/lib/analytics-schema";
import type { PublicLesson } from "@/lib/curriculum";
import { getCoachInsight } from "@/lib/coach";
import { getCommunitySnapshot } from "@/lib/community";
import { getLaunchReadiness } from "@/lib/launch-readiness";
import { getNextUnlockedLesson, getPrerequisiteMap, isLessonUnlocked } from "@/lib/learning-path";
import { isPremiumCourse, planCatalog, type PlanId } from "@/lib/plans";
import { runPracticeSnippet } from "@/lib/practice-runner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LearningUser = { id: string; name: string; email: string; isAdmin: boolean };
type View = "overview" | "all" | "continue" | "completed";
type CourseOverview = {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  estimatedMinutes: number;
  recommendedPrerequisites: string[];
  learningOutcomes: string[];
  lessonCount: number;
  topics: string[];
};

const localProgressKey = "script-school-progress-v1";
const studySessionKey = "script-school-study-log-v1";

function readStoredStudyDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(studySessionKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function readStoredStreakDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("script-school-streak-v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export default function LearningApp({
  lessons,
  courseCatalog,
  initialCompletedIds,
  analytics,
  user,
  initialPlan,
}: {
  lessons: PublicLesson[];
  courseCatalog: CourseOverview[];
  initialCompletedIds: string[];
  analytics: LearnerAnalytics | null;
  user: LearningUser;
  initialPlan?: PlanId;
}) {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set(initialCompletedIds));
  const [activeView, setActiveView] = useState<View>("overview");
  const [activeCourseId, setActiveCourseId] = useState("all");
  const [activeCategory, setActiveCategory] = useState("All topics");
  const [query, setQuery] = useState("");
  const [currentLesson, setCurrentLesson] = useState<PublicLesson | null>(null);
  const [practiceCode, setPracticeCode] = useState("");
  const [practiceOutput, setPracticeOutput] = useState("");
  const [practiceRunStatus, setPracticeRunStatus] = useState<"idle" | "success" | "error" | "empty">("idle");
  const [showPracticeHint, setShowPracticeHint] = useState(false);
  const [showPracticeSolution, setShowPracticeSolution] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<boolean | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "");
  const [savedProfileName, setSavedProfileName] = useState(user?.name || "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [studyDates, setStudyDates] = useState<string[]>(() => readStoredStudyDates());
  const currentPlan = initialPlan ?? "free";
  const searchRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const profileCloseRef = useRef<HTMLButtonElement>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const profileFocusTarget = useRef<HTMLElement | null>(null);

  const courses = useMemo(() => {
    if (courseCatalog.length) return courseCatalog;
    const byId = new Map<string, CourseOverview>();
    for (const lesson of lessons) {
      const course = byId.get(lesson.courseId) || {
        id: lesson.courseId,
        title: lesson.courseTitle,
        description: lesson.courseDescription,
        language: lesson.courseLanguage,
        level: lesson.courseLevel,
        estimatedMinutes: lesson.courseEstimatedMinutes,
        recommendedPrerequisites: lesson.courseRecommendedPrerequisites,
        learningOutcomes: lesson.courseLearningOutcomes,
        lessonCount: 0,
        topics: [],
      };
      course.lessonCount += 1;
      if (!course.topics.includes(lesson.category)) course.topics.push(lesson.category);
      byId.set(lesson.courseId, course);
    }
    return [...byId.values()];
  }, [courseCatalog, lessons]);
  const accessibleLessons = lessons.filter((lesson) =>
    !isPremiumCourse(lesson.courseId) || currentPlan === "pro" || user.isAdmin,
  );
  const courseLessons = activeCourseId === "all"
    ? accessibleLessons
    : accessibleLessons.filter((lesson) => lesson.courseId === activeCourseId);
  const categories = useMemo(
    () => ["All topics", ...new Set(courseLessons.map((lesson) => lesson.category))],
    [courseLessons],
  );
  const totalMinutes = useMemo(
    () => lessons.reduce((total, lesson) => total + lesson.duration, 0),
    [lessons],
  );
  const lessonPrerequisites = useMemo(() => getPrerequisiteMap(lessons), [lessons]);
  const completedCount = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
  const percentage = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const courseCompletedCount = courseLessons.filter((lesson) => completedIds.has(lesson.id)).length;
  const coursePercentage = courseLessons.length ? Math.round((courseCompletedCount / courseLessons.length) * 100) : 0;
  const nextLesson = getNextUnlockedLesson(courseLessons, completedIds)
    || (courseLessons.length > 0 && courseLessons.every((lesson) => completedIds.has(lesson.id)) ? courseLessons[0] : undefined);
  const lessonUnlockState = useMemo(() => {
    const states = new Map<string, boolean>();
    for (const lesson of lessons) {
      states.set(lesson.id, isLessonUnlocked(lesson.id, lessons, completedIds));
    }
    return states;
  }, [completedIds, lessons]);
  const categoryProgress = useMemo(() => {
    const totals = new Map<string, { total: number; complete: number }>();
    for (const lesson of lessons) {
      const current = totals.get(lesson.category) || { total: 0, complete: 0 };
      current.total += 1;
      if (completedIds.has(lesson.id)) current.complete += 1;
      totals.set(lesson.category, current);
    }
    return [...totals.entries()]
      .map(([category, metrics]) => ({
        category,
        total: metrics.total,
        complete: metrics.complete,
        percent: metrics.total ? Math.round((metrics.complete / metrics.total) * 100) : 0,
      }))
      .sort((left, right) => right.complete - left.complete || right.percent - left.percent);
  }, [completedIds, lessons]);
  const strongestCategory = categoryProgress[0] || null;
  const streakDays = readStoredStreakDays();
  const currentStreak = useMemo(() => {
    if (!streakDays.length) return 0;
    const uniqueDays = new Set(streakDays);
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let index = 0; index < 365; index += 1) {
      const iso = cursor.toISOString().slice(0, 10);
      if (!uniqueDays.has(iso)) {
        if (index === 0) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [streakDays]);
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const studyGoalReached = useMemo(() => {
    return studyDates.includes(todayKey);
  }, [studyDates, todayKey]);
  const recentStudyCount = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 6);
    return studyDates.filter((entry) => new Date(`${entry}T00:00:00`).getTime() >= cutoff.getTime()).length;
  }, [studyDates]);
  const focusPlan = nextLesson ? nextLesson.title : strongestCategory ? `Review ${strongestCategory.category}` : "Start your first lesson";
  const coachInsight = useMemo(() => getCoachInsight({
    lessons: accessibleLessons,
    completedIds,
    analytics,
    nextLesson,
    strongestCategory,
    streak: currentStreak,
  }), [accessibleLessons, analytics, completedIds, currentStreak, nextLesson, strongestCategory]);
  const readiness = useMemo(() => getLaunchReadiness({
    hasStagingReview: true,
    hasMonitoring: true,
    hasBackupPolicy: false,
    hasBillingLayer: false,
  }), []);
  const community = useMemo(() => getCommunitySnapshot({
    completedCount,
    percentage,
    streak: currentStreak,
  }), [completedCount, currentStreak, percentage]);
  const selectedPlan = planCatalog[currentPlan];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleLessons = courseLessons.filter((lesson) => {
    const categoryMatches = activeCategory === "All topics" || lesson.category === activeCategory;
    const queryMatches = !normalizedQuery || [
      lesson.title,
      lesson.category,
      lesson.description,
      lesson.level,
    ].join(" ").toLocaleLowerCase().includes(normalizedQuery);
    const isUnlocked = lessonUnlockState.get(lesson.id) ?? true;
    const progressMatches = activeView === "completed"
      ? completedIds.has(lesson.id)
      : activeView === "continue"
        ? !completedIds.has(lesson.id) && isUnlocked
        : true;
    return categoryMatches && queryMatches && progressMatches;
  });

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }, []);

  const syncCompleted = useCallback(async (action: "complete" | "import", lessonId?: string, lessonIds?: string[]) => {
    const response = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "complete"
        ? { action, lessonId }
        : { action, lessonIds }),
    });
    const body = await response.json() as { error?: string; completedLessonIds?: string[] };
    if (!response.ok) throw new Error(body.error || "Progress could not be saved.");
    if (body.completedLessonIds) setCompletedIds(new Set(body.completedLessonIds));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(studySessionKey, JSON.stringify(studyDates));
  }, [studyDates]);

  useEffect(() => {
    let cancelled = false;
    async function importLegacyProgress() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(localProgressKey) || "{}") as Record<string, unknown>;
        const legacyIds = lessons.filter((lesson) => saved[lesson.id] === true).map((lesson) => lesson.id);
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "import", lessonIds: legacyIds }),
        });
        const body = await response.json() as { error?: string; completedLessonIds?: string[] };
        if (!response.ok) throw new Error(body.error || "Browser progress import failed.");
        if (cancelled) return;
        setCompletedIds(new Set(body.completedLessonIds || []));
        if (legacyIds.length) showNotice("Your previous browser progress was imported.");
        window.localStorage.removeItem(localProgressKey);
      } catch (error) {
        if (!cancelled) showNotice(error instanceof Error ? error.message : "Progress sync failed.");
      }
    }
    void importLegacyProgress();
    return () => { cancelled = true; };
  }, [lessons, showNotice, user]);

  useEffect(() => {
    if (!currentLesson) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLesson();
      if (event.key === "Tab") {
        const focusable = document.querySelectorAll<HTMLElement>(
          "#lesson-dialog button:not(:disabled), #lesson-dialog a[href]",
        );
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [currentLesson]);

  useEffect(() => {
    if (!profileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    profileCloseRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileFocusTarget.current?.focus();
      } else if (event.key === "Tab") {
        const focusable = document.querySelectorAll<HTMLElement>(
          ".profile-dialog button:not(:disabled), .profile-dialog a[href], .profile-dialog input:not(:disabled)",
        );
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  function closeLesson() {
    setCurrentLesson(null);
    setPracticeCode("");
    setPracticeOutput("");
    setPracticeRunStatus("idle");
    setShowPracticeHint(false);
    setShowPracticeSolution(false);
    setSelectedOption(null);
    setQuizResult(null);
    focusTarget.current?.focus();
  }

  function openLesson(lesson: PublicLesson, target?: HTMLElement) {
    const prereqs = lessonPrerequisites.get(lesson.id) || [];
    const locked = prereqs.some((prereqId) => !completedIds.has(prereqId));
    if (locked) {
      const missing = prereqs.filter((prereqId) => !completedIds.has(prereqId));
      const missingLesson = lessons.find((item) => item.id === missing[0]);
      showNotice(`Complete "${missingLesson?.title || "the previous lesson"}" before opening this one.`);
      return;
    }

    focusTarget.current = target || document.activeElement as HTMLElement;
    setSelectedOption(null);
    setQuizResult(null);
    setPracticeCode(lesson.practiceStarter);
    setPracticeOutput("");
    setPracticeRunStatus("idle");
    setShowPracticeHint(false);
    setShowPracticeSolution(false);
    setCurrentLesson(lesson);
  }

  function runPracticeCode() {
    if (!currentLesson) return;
    const result = runPracticeSnippet(practiceCode);
    setPracticeRunStatus(result.status);
    setPracticeOutput(result.output);
  }

  function selectView(view: View) {
    setActiveView(view);
    setActiveCategory("All topics");
    setQuery("");
    document.getElementById(view === "continue" ? "continue-section" : "curriculum-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitAnswer(optionIndex: number) {
    if (!currentLesson || busy || selectedOption !== null) return;
    setBusy(true);
    setSelectedOption(optionIndex);
    try {
      const response = await fetch("/api/quiz/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: currentLesson.id, optionIndex }),
      });
      const body = await response.json() as { error?: string; isCorrect?: boolean };
      if (!response.ok || typeof body.isCorrect !== "boolean") {
        throw new Error(body.error || "The answer could not be checked.");
      }
      setQuizResult(body.isCorrect);
    } catch (error) {
      setSelectedOption(null);
      showNotice(error instanceof Error ? error.message : "The answer could not be checked.");
    } finally {
      setBusy(false);
    }
  }

  function logStudySession() {
    const today = new Date().toISOString().slice(0, 10);
    setStudyDates((previous) => {
      if (previous.includes(today)) return previous;
      return [...previous, today].sort();
    });
    showNotice("Session logged. Keep your momentum going!");
  }

  async function completeLesson() {
    if (!currentLesson || busy || completedIds.has(currentLesson.id)) return;
    setBusy(true);
    try {
      await syncCompleted("complete", currentLesson.id);
      if (typeof window !== "undefined") {
        const streakKey = "script-school-streak-v1";
        const today = new Date().toISOString().slice(0, 10);
        const existing = JSON.parse(window.localStorage.getItem(streakKey) || "[]") as unknown;
        const entries = Array.isArray(existing) ? existing.filter((value): value is string => typeof value === "string") : [];
        if (!entries.includes(today)) {
          window.localStorage.setItem(streakKey, JSON.stringify([...entries, today].sort()));
        }
      }
      logStudySession();
      showNotice("Lesson complete. Nice work!");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Progress could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok) {
        showNotice("Sign out failed. Try again.");
        return;
      }
      setProfileOpen(false);
      router.replace("/");
      router.refresh();
    } catch {
      showNotice("Sign out failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfileName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = profileName.trim();
    if (!displayName || profileBusy) return;
    setProfileBusy(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Your profile could not be updated.");
      setProfileName(displayName);
      setSavedProfileName(displayName);
      showNotice("Display name updated.");
      router.refresh();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Your profile could not be updated.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileBusy) return;
    if (newPassword.length < 8) {
      showNotice("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotice("The passwords do not match.");
      return;
    }
    setProfileBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      showNotice("Password updated.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Your password could not be updated.");
    } finally {
      setProfileBusy(false);
    }
  }

  const heading = activeView === "completed" ? "Your completed lessons"
    : activeView === "continue" ? "Continue learning"
      : activeCategory !== "All topics" ? `${activeCategory} lessons`
        : normalizedQuery ? "Search results" : "Explore the curriculum";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to lesson content</a>
      <aside className="sidebar" aria-label="Main navigation">
        <Link className="brand" href="/" aria-label="Script School home">
          <span className="brand-mark"><Code2 size={19} /></span>
          <span>script<span className="brand-accent">school</span></span>
        </Link>
        <p className="nav-label">Learning space</p>
        <nav className="side-nav" aria-label="Learning space">
          <button className={activeView === "overview" ? "nav-item active" : "nav-item"} onClick={() => selectView("overview")} type="button" aria-current={activeView === "overview" ? "page" : undefined}><Home />Overview</button>
          <button className={activeView === "all" ? "nav-item active" : "nav-item"} onClick={() => selectView("all")} type="button" aria-current={activeView === "all" ? "page" : undefined}><BookOpen />All lessons<span className="nav-count">{lessons.length}</span></button>
          <button className={activeView === "continue" ? "nav-item active" : "nav-item"} onClick={() => selectView("continue")} type="button" aria-current={activeView === "continue" ? "page" : undefined}><Play />Continue learning</button>
          <button className={activeView === "completed" ? "nav-item active" : "nav-item"} onClick={() => selectView("completed")} type="button" aria-current={activeView === "completed" ? "page" : undefined}><CheckCircle2 />Completed<span className="nav-count">{completedCount}</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="journey-card">
          <div className="journey-title">Your learning journey <span><Flame size={13} /> {completedCount} done</span></div>
          <p>{completedCount ? `${completedCount} of ${lessons.length} lessons complete. Keep that momentum going!` : "Every expert started with their first line of code."}</p>
          <div className="progress-track" role="progressbar" aria-label="Course completion" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percentage}%` }} /></div>
        </div>
        <p className="sidebar-foot">A little learning every day ✨</p>
      </aside>

      <main id="main-content" className="main-area" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb"><span>My learning</span><span aria-hidden="true">/</span><strong>{activeView === "overview" ? "Overview" : activeView === "all" ? "All lessons" : activeView === "continue" ? "Continue learning" : "Completed"}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} aria-hidden="true" />
              <input ref={searchRef} type="search" value={query} placeholder="Search concepts..." aria-label="Search lessons" onChange={(event) => { setQuery(event.target.value); setActiveView("all"); }} />
              <kbd>Ctrl K</kbd>
            </label>
            {user ? (
              <>
                {user.isAdmin && <Link className="admin-link" href="/admin">Admin</Link>}
                <button
                  className="account-button"
                  type="button"
                  onClick={(event) => {
                    profileFocusTarget.current = event.currentTarget;
                    setProfileName(user.name);
                    setSavedProfileName(user.name);
                    setProfileOpen(true);
                  }}
                  aria-haspopup="dialog"
                  aria-label={`Open profile for ${profileName}`}
                >
                  <span className="avatar" aria-hidden="true">{profileName.slice(0, 2).toUpperCase()}</span>
                  <span className="account-label">{profileName}</span>
                </button>
              </>
            ) : <Link className="sign-in-link" href="/login">Sign in <ArrowRight size={15} /></Link>}
          </div>
        </header>

        <div className="page-content">
          <p className="welcome-kicker">YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>Hey there, future developer <Sparkles className="title-sparkle" size={21} /></h1>
          <p className="page-intro">A friendly, hands-on path from your first variable to confidently building for the web.</p>
          <section className="hero-panel" aria-labelledby="hero-title">
            <div className="hero-copy">
              <span className="eyebrow"><Sparkles size={13} /> YOUR JAVASCRIPT JOURNEY</span>
              <h2 id="hero-title">Big ideas. Small steps. Real skills.</h2>
              <p>Explore the language that brings the web to life—one clear concept at a time.</p>
              <button className="button-light" type="button" onClick={() => nextLesson && openLesson(nextLesson, document.activeElement as HTMLElement)}>Start learning <ArrowRight size={16} /></button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit" /><div className="js-tile">JS</div><code>const future = &quot;you&quot;;</code><span />
            </div>
          </section>

          <section className="stats-row" aria-label="Your learning overview">
            <div className="stat-card"><span className="stat-icon lilac"><BookOpen /></span><div><strong>{lessons.length}</strong><small>Bite-sized lessons</small></div></div>
            <div className="stat-card"><span className="stat-icon amber"><Clock3 /></span><div><strong>~{Math.ceil(totalMinutes / 60)} hrs</strong><small>Learn at your own pace</small></div></div>
            <div className="stat-card"><span className="stat-icon mint"><CheckCircle2 /></span><div><strong>{percentage}%</strong><small>Overall completed</small></div></div>
            {analytics && <div className="stat-card"><span className="stat-icon lilac"><Sparkles /></span><div><strong>{analytics.quizAttempts ? Math.round(analytics.correctAnswers / analytics.quizAttempts * 100) : "—"}{analytics.quizAttempts ? "%" : ""}</strong><small>Quiz accuracy · {analytics.quizAttempts} attempts</small></div></div>}
          </section>

          <section className="insight-panel" aria-labelledby="insight-heading">
            <div className="insight-header">
              <div>
                <p className="welcome-kicker">YOUR MOMENTUM</p>
                <h2 id="insight-heading">Keep your streak alive</h2>
              </div>
              <button
                className="focus-session-button"
                type="button"
                onClick={logStudySession}
                disabled={studyGoalReached}
              >
                {studyGoalReached ? "Session logged" : "Log today’s focus"}
              </button>
            </div>
            <div className="insight-grid">
              <div className="achievement-pill"><span className="badge-dot">🔥</span><div><strong>{currentStreak} day streak</strong><small>Practice consistency</small></div></div>
              <div className="achievement-pill"><span className="badge-dot">🏆</span><div><strong>{strongestCategory ? `${strongestCategory.category}` : "Start learning"}</strong><small>{strongestCategory ? `${strongestCategory.complete}/${strongestCategory.total} completed` : "Choose your first lesson"}</small></div></div>
              <div className="achievement-pill"><span className="badge-dot">➡️</span><div><strong>{focusPlan}</strong><small>{nextLesson ? "Recommended next step" : "Review your strongest topic"}</small></div></div>
            </div>
            <div className="focus-plan" aria-label="Daily learning goal and focus plan">
              <div className="focus-metric">
                <span>Today’s goal</span>
                <strong>{studyGoalReached ? "Goal reached" : "1 more session"}</strong>
                <small>{studyGoalReached ? "You logged a focused session today." : `You’ve logged ${recentStudyCount} sessions in the last 7 days.`}</small>
              </div>
              <div className="focus-metric focus-metric-highlight">
                <span>Recommended focus</span>
                <strong>{focusPlan}</strong>
                <small>{nextLesson ? "Keep momentum by completing the next unlocked lesson." : "A quick review is the best way to reinforce your strongest topic."}</small>
              </div>
            </div>
            <div className="coach-panel" aria-label="Adaptive learning coach">
              <div className="coach-panel-header">
                <span className="coach-badge">AI coach</span>
                <strong>{coachInsight.title}</strong>
              </div>
              <p>{coachInsight.summary}</p>
              <button
                type="button"
                className="coach-action"
                onClick={() => {
                  if (!coachInsight.lessonId) return;
                  const target = lessons.find((lesson) => lesson.id === coachInsight.lessonId) || nextLesson || lessons[0];
                  if (target) openLesson(target, document.activeElement as HTMLElement);
                }}
              >
                {coachInsight.actionLabel}
              </button>
            </div>
          </section>

          <section className="launch-readiness-panel" aria-labelledby="launch-readiness-heading">
            <div className="section-head">
              <div>
                <p className="welcome-kicker">LAUNCH HARDENING</p>
                <h2 id="launch-readiness-heading">Production checklist</h2>
              </div>
              <span className="readiness-score">{readiness.score}%</span>
            </div>
            <div className="launch-readiness-body">
              <div className="readiness-summary">
                <strong>{readiness.headline}</strong>
                <p>These checks keep the platform stable before public access, billing, and community growth expand.</p>
              </div>
              <div className="readiness-list" role="list" aria-label="Launch readiness checks">
                {readiness.checks.map((check) => (
                  <div key={check.id} className={`readiness-item ${check.status}`} role="listitem">
                    <span className="readiness-status" aria-label={`${check.title}: ${check.status}`} />
                    <div>
                      <strong>{check.title}</strong>
                      <p>{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="course-catalog" aria-labelledby="course-catalog-heading">
            <div className="section-head">
              <div><h2 id="course-catalog-heading">Explore courses</h2><p>Choose a structured course and build your skills step by step.</p></div>
            </div>
            <div className="course-grid">
              {courses.map((course) => {
                const courseComplete = lessons.filter(
                  (lesson) => lesson.courseId === course.id && completedIds.has(lesson.id),
                ).length;
                const progress = Math.round(courseComplete / course.lessonCount * 100);
                const isCourseLocked = isPremiumCourse(course.id) && currentPlan === "free" && !user.isAdmin;
                return (
                  <article className={`course-card ${isCourseLocked ? "course-card-locked" : ""}`} key={course.id}>
                    <div className="course-card-heading">
                      <span className="course-card-icon"><Code2 size={19} aria-hidden="true" /></span>
                      <span className="course-card-level">{course.level}</span>
                      {isCourseLocked && <span className="course-plan-lock">Pro</span>}
                    </div>
                    <h3>{course.title}</h3>
                    <p className="course-card-description">{course.description}</p>
                    {course.recommendedPrerequisites.length > 0 && (
                      <p className="course-card-prerequisites"><strong>Recommended first:</strong> {course.recommendedPrerequisites.join(", ")}</p>
                    )}
                    <ul className="course-topic-list" aria-label={`${course.title} topics`}>
                      {course.topics.map((topic) => <li key={topic}>{topic}</li>)}
                    </ul>
                    <div className="course-card-meta">
                      <span><BookOpen size={14} aria-hidden="true" />{course.lessonCount} lessons</span>
                      <span><Clock3 size={14} aria-hidden="true" />~{Math.ceil(course.estimatedMinutes / 60)} hrs</span>
                      <span>{course.language}</span>
                    </div>
                    <details className="course-card-outcomes">
                      <summary>What you’ll learn</summary>
                      <ul>{course.learningOutcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
                    </details>
                    <div className="course-card-progress">
                      <span>{isCourseLocked ? "Locked for free access" : `${courseComplete} of ${course.lessonCount} completed`}</span>
                      <div className="progress-track" role="progressbar" aria-label={`${course.title} completion`} aria-valuenow={isCourseLocked ? 0 : progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${isCourseLocked ? 0 : progress}%` }} /></div>
                    </div>
                    <button
                      className="course-card-action"
                      type="button"
                      onClick={() => {
                        if (isCourseLocked) {
                          setProfileOpen(true);
                          showNotice("Pro checkout is not available yet. Course access requires an active subscription.");
                          return;
                        }
                        setActiveCourseId(course.id);
                        selectView("all");
                      }}
                    >
                      {isCourseLocked ? "See Pro access details" : "View course"} <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="community-panel" aria-labelledby="community-heading">
            <div className="section-head">
              <div><h2 id="community-heading">Community & growth</h2><p>Stay connected and keep your momentum visible.</p></div>
            </div>
            <div className="community-grid">
              <article className="community-card">
                <div className="community-card-header">
                  <h3>Leaderboard</h3>
                  <span>Weekly</span>
                </div>
                <ul className="community-list">
                  {community.leaderboard.map((entry, index) => (
                    <li key={entry.name} className={entry.name === "You" ? "is-you" : ""}>
                      <span className="rank">#{index + 1}</span>
                      <div>
                        <strong>{entry.name}</strong>
                        <small>{entry.streak} day streak</small>
                      </div>
                      <b>{entry.progress}%</b>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="community-card highlight-card">
                <div className="community-card-header">
                  <h3>{community.challenge.title}</h3>
                  <span>{community.challenge.reward}</span>
                </div>
                <div className="challenge-progress" aria-label="Cohort challenge progress">
                  <div className="mini-track"><span style={{ width: `${community.challenge.progress}%` }} /></div>
                  <div className="challenge-meta">
                    <strong>{community.challenge.progress}%</strong>
                    <small>{community.challenge.target}% target</small>
                  </div>
                </div>
                <p>{community.challenge.description}</p>
              </article>
              <article className="community-card">
                <div className="community-card-header">
                  <h3>Community discussions</h3>
                  <span>Live now</span>
                </div>
                <ul className="community-discussion-list">
                  {community.discussions.map((discussion) => (
                    <li key={discussion.title}>
                      <span className="discussion-tag">{discussion.tag}</span>
                      <div>
                        <strong>{discussion.title}</strong>
                        <small>{discussion.author} · {discussion.replies} replies</small>
                      </div>
                      <p>{discussion.excerpt}</p>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section className="path-panel" aria-labelledby="path-heading">
            <div className="section-head">
              <div><h2 id="path-heading">Learning path</h2><p>Follow the sequence and keep building confidence.</p></div>
            </div>
            <div className="path-list">
              {categoryProgress.slice(0, 4).map(({ category, complete, total, percent }) => (
                <div key={category} className="path-item">
                  <div className="path-info"><strong>{category}</strong><span>{complete}/{total} lessons complete</span></div>
                  <div className="mini-track" aria-label={`${category} progress`}><span style={{ width: `${percent}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          {analytics && analytics.recentQuizAttempts.length > 0 && (
            <section className="analytics-panel" aria-labelledby="analytics-heading">
              <div><h2 id="analytics-heading">Recent quiz activity</h2><p>{analytics.correctAnswers} correct answers across {analytics.quizAttempts} attempts</p></div>
              <ul>{analytics.recentQuizAttempts.map((attempt, index) => (
                <li key={`${attempt.answeredAt}-${index}`}>
                  <span className={attempt.isCorrect ? "analytics-result correct" : "analytics-result"} aria-label={attempt.isCorrect ? "Correct" : "Incorrect"}>{attempt.isCorrect ? "✓" : "·"}</span>
                  <span>{attempt.lessonTitle}</span>
                  <time dateTime={attempt.answeredAt}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(attempt.answeredAt))}</time>
                </li>
              ))}</ul>
            </section>
          )}

          <section id="continue-section" className="continue-section" aria-labelledby="continue-heading">
            <div className="section-head">
              <div><h2 id="continue-heading">Pick up where you left off</h2><p>Your next step is ready when you are.</p></div>
              <button className="text-link" type="button" onClick={() => selectView("all")}>See all lessons <ArrowRight size={14} /></button>
            </div>
            {nextLesson ? (
              <div className="continue-card">
                <span className="continue-icon"><Code2 /></span>
                <div className="continue-copy"><strong>{courseCompletedCount === courseLessons.length ? "Revisit any lesson" : nextLesson.title}</strong><small>Lesson {String(lessons.indexOf(nextLesson) + 1).padStart(2, "0")} · {nextLesson.courseTitle} / {nextLesson.category}</small></div>
                <div className="continue-progress"><div className="progress-track"><span style={{ width: `${coursePercentage}%` }} /></div><small>{courseCompletedCount} / {courseLessons.length} completed</small></div>
                <button className="button-purple" type="button" onClick={(event) => openLesson(nextLesson, event.currentTarget)}>{courseCompletedCount === courseLessons.length ? "Review lesson" : "Open lesson"} <ArrowRight size={15} /></button>
              </div>
            ) : <p className="empty-state">Course content is being prepared. Please check back soon.</p>}
          </section>

          <section id="curriculum-section" className="curriculum-section" aria-labelledby="curriculum-heading">
            <div className="section-head">
              <div><h2 id="curriculum-heading">{heading}</h2><p>Build a strong foundation, then go further.</p></div>
              <button className="text-link" type="button" onClick={() => { setActiveCategory("All topics"); setQuery(""); selectView("all"); }}>Reset filters</button>
            </div>
            {courses.length > 1 && (
              <div className="topic-filters" role="group" aria-label="Filter lessons by course">
                <button className={activeCourseId === "all" ? "topic-chip selected" : "topic-chip"} type="button" aria-pressed={activeCourseId === "all"} onClick={() => { setActiveCourseId("all"); setActiveCategory("All topics"); }}>All courses<span>{lessons.length}</span></button>
                {courses
                  .filter((course) => !isPremiumCourse(course.id) || currentPlan === "pro" || user.isAdmin)
                  .map((course) => (
                  <button className={activeCourseId === course.id ? "topic-chip selected" : "topic-chip"} key={course.id} type="button" aria-pressed={activeCourseId === course.id} onClick={() => { setActiveCourseId(course.id); setActiveCategory("All topics"); }}>{course.title}<span>{lessons.filter((lesson) => lesson.courseId === course.id).length}</span></button>
                  ))}
              </div>
            )}
            <div className="topic-filters" role="group" aria-label="Filter lessons by topic">
              {categories.map((category) => {
                const count = category === "All topics" ? lessons.length : lessons.filter((lesson) => lesson.category === category).length;
                return <button className={activeCategory === category ? "topic-chip selected" : "topic-chip"} key={category} type="button" aria-pressed={activeCategory === category} onClick={() => { setActiveCategory(category); setActiveView("all"); }}>{category}<span>{count}</span></button>;
              })}
            </div>
            <div className="lesson-grid" aria-live="polite">
              {visibleLessons.length ? visibleLessons.map((lesson) => {
                const locked = !completedIds.has(lesson.id) && !lessonUnlockState.get(lesson.id)!;
                return (
                  <button
                    className={locked ? "lesson-card locked" : "lesson-card"}
                    key={lesson.id}
                    type="button"
                    disabled={locked}
                    onClick={(event) => {
                      if (!locked) openLesson(lesson, event.currentTarget);
                    }}
                    aria-label={locked ? `Locked lesson: ${lesson.title}` : `Open lesson: ${lesson.title}`}
                  >
                    <span className="lesson-card-top"><span className={`lesson-icon category-${lesson.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{lesson.icon}</span><span className={completedIds.has(lesson.id) ? "lesson-status done" : locked ? "lesson-status locked" : "lesson-status"}>{completedIds.has(lesson.id) ? "✓ DONE" : locked ? "🔒 LOCKED" : "● READY"}</span></span>
                    <span className="lesson-number">LESSON {String(lessons.indexOf(lesson) + 1).padStart(2, "0")} · {lesson.category}</span>
                    <strong>{lesson.title}</strong><span className="lesson-description">{lesson.description}</span>
                    <span className="lesson-bottom"><span>{lesson.duration} min</span><span className={`level level-${lesson.level.toLowerCase()}`}><i />{lesson.level}</span></span>
                  </button>
                );
              }) : <p className="empty-state">{activeView === "completed" && !normalizedQuery ? "No completed lessons just yet. Every journey starts with one!" : activeView === "continue" && !normalizedQuery ? "You’re all caught up. Choose a lesson to review!" : "No lessons match that search. Try another topic or keyword."}</p>}
            </div>
          </section>
          <footer className="page-footer">Made for curious minds. Keep experimenting, keep learning. 🌱</footer>
        </div>
      </main>

      {currentLesson && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLesson(); }}>
          <section className="lesson-dialog" id="lesson-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description">
            <header className="modal-header">
              <div><span className="modal-kicker">Lesson {String(lessons.indexOf(currentLesson) + 1).padStart(2, "0")} · {currentLesson.category} · {currentLesson.duration} min</span><h2 id="modal-title">{currentLesson.title}</h2></div>
              <button ref={closeRef} className="close-button" type="button" aria-label="Close lesson" onClick={closeLesson}><X size={18} /></button>
            </header>
            <div className="modal-body">
              <p className="modal-description" id="modal-description">{currentLesson.explanation}</p>
              <h3>See it in action · {currentLesson.courseLanguage}</h3><pre className="code-sample"><code>{currentLesson.code}</code></pre>
              {currentLesson.practicePrompt && (
                <section className="practice-box" aria-labelledby="practice-heading">
                  <div className="practice-heading"><span className="practice-icon"><Code2 size={15} /></span><div><h3 id="practice-heading">Your turn</h3><p>{currentLesson.practicePrompt}</p></div></div>
                  {currentLesson.courseLanguage === "javascript" ? (
                    <>
                      <label className="practice-editor-label" htmlFor="practice-code">Build the solution below, then run it to inspect the output.</label>
                      <textarea id="practice-code" className="practice-editor" spellCheck={false} value={practiceCode} onChange={(event) => setPracticeCode(event.target.value)} />
                      <div className="practice-actions">
                        <button type="button" className="practice-run" onClick={runPracticeCode}>Run code</button>
                        <button type="button" className="practice-reset" onClick={() => {
                          setPracticeCode(currentLesson.practiceStarter);
                          setPracticeOutput("");
                          setPracticeRunStatus("idle");
                        }}>Reset</button>
                        {currentLesson.practiceHint && <button type="button" className="practice-reveal" aria-expanded={showPracticeHint} onClick={() => setShowPracticeHint((visible) => !visible)}>{showPracticeHint ? "Hide hint" : "Need a hint?"}</button>}
                        {currentLesson.practiceSolution && <button type="button" className="practice-reveal" aria-expanded={showPracticeSolution} onClick={() => setShowPracticeSolution((visible) => !visible)}>{showPracticeSolution ? "Hide example answer" : "Show example answer"}</button>}
                      </div>
                      <div className={`practice-output ${practiceRunStatus === "error" ? "error" : practiceRunStatus === "success" ? "success" : "idle"}`} aria-live="polite">
                        {practiceOutput || "Run your code to see the console output here."}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="practice-editor-label">Use this starter to complete the exercise in a suitable local {currentLesson.courseLanguage} environment. This browser runner executes JavaScript only.</p>
                      <pre className="code-sample"><code>{currentLesson.practiceStarter}</code></pre>
                    </>
                  )}
                  {showPracticeHint && <p className="practice-hint"><strong>Hint:</strong> {currentLesson.practiceHint}</p>}
                  {showPracticeSolution && <pre className="code-sample practice-solution"><code>{currentLesson.practiceSolution}</code></pre>}
                </section>
              )}
              <div className="lesson-tip"><strong>A small tip:</strong> {currentLesson.tip}</div>
              <h3>Quick check</h3>
              <div className="quiz-box">
                <p className="quiz-question">{currentLesson.quiz}</p>
                <div className="quiz-options">
                  {currentLesson.options.map((option, index) => (
                    <button
                      className={selectedOption === index && quizResult !== null ? quizResult ? "quiz-option correct" : "quiz-option incorrect" : "quiz-option"}
                      key={currentLesson.optionIds[index] || `${currentLesson.id}-${index}`}
                      type="button"
                      disabled={selectedOption !== null || busy}
                      onClick={() => void submitAnswer(index)}
                    >{option}{selectedOption === index && quizResult && <Check size={15} />}</button>
                  ))}
                </div>
                {quizResult !== null && <p className={quizResult ? "quiz-feedback correct-text" : "quiz-feedback"} aria-live="polite">{quizResult ? "That’s right! " : "Not quite. "}{currentLesson.quizExplanation || (quizResult ? "You’re building a solid foundation. ✨" : "Give the example another look and try again in your next review.")}</p>}
              </div>
              <div className="modal-footer"><span>Lesson {lessons.indexOf(currentLesson) + 1} of {lessons.length}</span><button className={completedIds.has(currentLesson.id) ? "button-complete is-done" : "button-complete"} type="button" disabled={busy || completedIds.has(currentLesson.id)} onClick={() => void completeLesson()}>{completedIds.has(currentLesson.id) ? "Completed ✓" : busy ? "Saving…" : "Mark as complete ✓"}</button></div>
            </div>
          </section>
        </div>
      )}
      {profileOpen && user && (
        <div
          className="modal-backdrop profile-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProfileOpen(false);
              profileFocusTarget.current?.focus();
            }
          }}
        >
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title" aria-describedby="profile-email">
            <header className="profile-header">
              <div className="profile-identity">
                <span className="avatar profile-avatar" aria-hidden="true">{profileName.slice(0, 2).toUpperCase()}</span>
                <div><h2 id="profile-title">Your profile</h2><p id="profile-email">{user.email}</p></div>
              </div>
              <button
                ref={profileCloseRef}
                className="close-button"
                type="button"
                aria-label="Close profile"
                onClick={() => {
                  setProfileOpen(false);
                  profileFocusTarget.current?.focus();
                }}
              ><X size={18} /></button>
            </header>
            <div className="profile-body">
              <div className="profile-account">
                <div className="profile-detail"><span>Account type</span><strong>{user.isAdmin ? "Administrator" : "Learner"}</strong></div>
                <p className="profile-detail"><span>Email address</span><strong>{user.email}</strong></p>
              </div>
              <section className="profile-plan" aria-labelledby="profile-plan-heading">
                <div className="profile-section-heading">
                  <div><h3 id="profile-plan-heading">Plan & access</h3><p>Your access reflects the plan attached to your account.</p></div>
                  <span className={`plan-pill ${currentPlan}`}>{selectedPlan.label}</span>
                </div>
                <div className="plan-grid" role="list" aria-label="Learning plan options">
                  {Object.values(planCatalog).map((plan) => (
                    <article
                      key={plan.id}
                      className={`plan-option ${currentPlan === plan.id ? "selected" : ""}`}
                      aria-current={currentPlan === plan.id ? "true" : undefined}
                    >
                      <span className="plan-option-header">
                        <strong>{plan.label}</strong>
                        <small>{plan.priceLabel}</small>
                      </span>
                      <p>{plan.summary}</p>
                      <ul>
                        {plan.includes.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                      {plan.id === "pro" && <small>Subscriptions are not available yet. Existing access is granted only by verified billing or an administrator.</small>}
                    </article>
                  ))}
                </div>
              </section>
              <form className="profile-edit-form" onSubmit={saveProfileName}>
                <label>Display name<input maxLength={100} required value={profileName} onChange={(event) => setProfileName(event.target.value)} /></label>
                <button className="admin-secondary" type="submit" disabled={profileBusy || profileName.trim() === savedProfileName}>{profileBusy ? "Saving…" : "Save name"}</button>
              </form>
              <section className="profile-learning" aria-labelledby="profile-learning-heading">
                <div className="profile-section-heading">
                  <div><h3 id="profile-learning-heading">Learning overview</h3><p>Your progress at a glance</p></div>
                  <strong className="profile-completion">{percentage}%</strong>
                </div>
                <div className="progress-track" role="progressbar" aria-label="Learning progress" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percentage}%` }} /></div>
                <div className="profile-stat-grid">
                  <div><strong>{completedCount}<small>/{lessons.length}</small></strong><span>Lessons done</span></div>
                  <div><strong>{currentStreak}</strong><span>Day streak</span></div>
                  <div><strong>{analytics?.quizAttempts ?? 0}</strong><span>Quiz attempts</span></div>
                  <div><strong>{analytics?.quizAttempts ? `${Math.round(analytics.correctAnswers / analytics.quizAttempts * 100)}%` : "—"}</strong><span>Quiz accuracy</span></div>
                </div>
                <p className="profile-topic">
                  <span>Strongest topic</span>
                  <strong>{strongestCategory ? `${strongestCategory.category} · ${strongestCategory.complete}/${strongestCategory.total}` : "Start a lesson to build your progress"}</strong>
                </p>
                {nextLesson && (
                  <p className="profile-topic">
                    <span>Next up</span>
                    <strong>{nextLesson.title}</strong>
                  </p>
                )}
              </section>
              {analytics?.recentQuizAttempts.length ? (
                <section className="profile-activity" aria-labelledby="profile-activity-heading">
                  <h3 id="profile-activity-heading">Recent quiz activity</h3>
                  <ul>
                    {analytics.recentQuizAttempts.slice(0, 3).map((attempt, index) => (
                      <li key={`${attempt.answeredAt}-${index}`}>
                        <span className={attempt.isCorrect ? "profile-result correct" : "profile-result"} aria-label={attempt.isCorrect ? "Correct answer" : "Incorrect answer"}>{attempt.isCorrect ? "✓" : "·"}</span>
                        <span>{attempt.lessonTitle}</span>
                        <time dateTime={attempt.answeredAt}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(attempt.answeredAt))}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <div className="profile-actions">
                <button
                  className="admin-secondary"
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    selectView("completed");
                    profileFocusTarget.current?.focus();
                  }}
                >View completed lessons</button>
                {user.isAdmin && <Link className="admin-save profile-admin-link" href="/admin"><Code2 size={15} />Open admin dashboard<ArrowRight size={14} /></Link>}
              </div>
              <section className="profile-password">
                <button className="profile-password-toggle" type="button" aria-expanded={showPasswordForm} onClick={() => setShowPasswordForm((visible) => !visible)}>
                  {showPasswordForm ? "Cancel password change" : "Change password"}
                </button>
                {showPasswordForm && (
                  <form className="profile-edit-form" onSubmit={savePassword}>
                    <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
                    <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
                    <button className="admin-secondary" type="submit" disabled={profileBusy}>{profileBusy ? "Updating…" : "Update password"}</button>
                  </form>
                )}
              </section>
              <button className="profile-signout" type="button" disabled={busy} onClick={() => void signOut()}>
                <LogOut size={16} />{busy ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </section>
        </div>
      )}
      {notice && <div className="toast-notice" role="status" aria-live="polite">{notice}</div>}
    </div>
  );
}
