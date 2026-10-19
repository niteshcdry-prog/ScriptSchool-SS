"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { applyVersionSnapshot, recordContentVersion, readVersionHistory, type ContentVersion } from "@/lib/content-versioning";

export type AdminLesson = {
  id: string;
  moduleId: string;
  title: string;
  icon: string;
  duration: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  explanation: string;
  code: string;
  tip: string;
  practicePrompt: string;
  practiceStarter: string;
  practiceHint: string;
  practiceSolution: string;
  quizExplanation: string;
  sortOrder: number;
  published: boolean;
  prerequisiteIds: string[];
  quiz: string;
  options: string[];
  answer: number;
};

type Course = {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  estimatedMinutes: number;
  recommendedPrerequisites: string[];
  learningOutcomes: string[];
  published: boolean;
};
type Module = { id: string; course_id: string; title: string; sort_order: number };
type AdminUser = { id: string; email: string; name: string; role: "learner" | "admin"; completedCount: number; createdAt: string };
type Activity = { id: string; action: string; entityType: string; entityId: string; createdAt: string };
type Tab = "content" | "users" | "activity";

const emptyLesson = (moduleId = ""): AdminLesson => ({
  id: "",
  moduleId,
  title: "",
  icon: "✎",
  duration: 7,
  level: "Beginner",
  description: "",
  explanation: "",
  code: "",
  tip: "",
  practicePrompt: "",
  practiceStarter: "",
  practiceHint: "",
  practiceSolution: "",
  quizExplanation: "",
  sortOrder: 1,
  published: false,
  prerequisiteIds: [],
  quiz: "",
  options: ["", ""],
  answer: 0,
});

const emptyCourse = (id = ""): Course => ({
  id,
  title: "",
  description: "",
  language: "javascript",
  level: "Beginner",
  estimatedMinutes: 0,
  recommendedPrerequisites: [],
  learningOutcomes: [],
  published: false,
});

async function requestJson(path: string, method: string, payload?: unknown) {
  const response = await fetch(path, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json() as { error?: string };
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
}

export default function AdminDashboard({
  courses,
  modules,
  lessons,
  activity,
}: {
  courses: Course[];
  modules: Module[];
  lessons: AdminLesson[];
  activity: Activity[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("content");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [courseDraft, setCourseDraft] = useState<Course>(courses[0] || emptyCourse());
  const [moduleDraft, setModuleDraft] = useState({ id: "", courseId: courses[0]?.id || "", title: "", sortOrder: modules.length + 1 });
  const [lessonDraft, setLessonDraft] = useState<AdminLesson>(emptyLesson(modules[0]?.id || ""));
  const [editingLessonId, setEditingLessonId] = useState("");
  const [showLessonPreview, setShowLessonPreview] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, "learner" | "admin">>({});
  const [userPage, setUserPage] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [versionNote, setVersionNote] = useState("");
  const [versionHistoryState, setVersionHistoryState] = useState<{ key: string; versions: ContentVersion[] }>({ key: "", versions: [] });

  function feedback(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4200);
  }

  const currentVersionTarget = lessonDraft.id || editingLessonId
    ? { type: "lesson" as const, id: lessonDraft.id || editingLessonId, title: lessonDraft.title || "Untitled lesson" }
    : moduleDraft.id
      ? { type: "module" as const, id: moduleDraft.id, title: moduleDraft.title || "Untitled module" }
      : courseDraft.id || courseId
        ? { type: "course" as const, id: courseDraft.id || courseId, title: courseDraft.title || "Untitled course" }
        : null;

  const versionTargetType = currentVersionTarget?.type;
  const versionTargetId = currentVersionTarget?.id;
  const versionTargetKey = versionTargetType && versionTargetId ? `${versionTargetType}:${versionTargetId}` : "";
  const versionHistory = versionHistoryState.key === versionTargetKey ? versionHistoryState.versions : [];

  useEffect(() => {
    if (!versionTargetType || !versionTargetId) return;
    let cancelled = false;
    readVersionHistory(versionTargetType, versionTargetId)
      .then((versions) => {
        if (!cancelled) setVersionHistoryState({ key: `${versionTargetType}:${versionTargetId}`, versions });
      })
      .catch((error: unknown) => {
        if (!cancelled) feedback(error instanceof Error ? error.message : "Version history could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [versionTargetType, versionTargetId]);

  async function captureCurrentVersion(entityType: "course" | "module" | "lesson", snapshot: Record<string, unknown>, title: string, published: boolean) {
    if (!currentVersionTarget || currentVersionTarget.type !== entityType || !currentVersionTarget.id) return;
    const note = versionNote.trim() || (published ? "Published to learners" : "Saved draft");
    await recordContentVersion({
      entityType,
      entityId: currentVersionTarget.id,
      title,
      published,
      note,
      snapshot,
    });
    const versions = await readVersionHistory(entityType, currentVersionTarget.id);
    setVersionHistoryState({ key: `${entityType}:${currentVersionTarget.id}`, versions });
    setVersionNote("");
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestJson("/api/admin/courses", "POST", courseDraft);
      captureCurrentVersion("course", { ...courseDraft }, courseDraft.title || "Untitled course", courseDraft.published);
      feedback("Course saved.");
      router.refresh();
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Course save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestJson("/api/admin/modules", "POST", {
        ...moduleDraft,
        sortOrder: Number(moduleDraft.sortOrder),
      });
      captureCurrentVersion("module", { ...moduleDraft, sortOrder: Number(moduleDraft.sortOrder) }, moduleDraft.title || "Untitled module", false);
      feedback("Module saved.");
      router.refresh();
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Module save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const options = lessonDraft.options.map((option) => option.trim()).filter(Boolean);
      await requestJson("/api/admin/lessons", "POST", {
        ...lessonDraft,
        duration: Number(lessonDraft.duration),
        sortOrder: Number(lessonDraft.sortOrder),
        answer: Number(lessonDraft.answer),
        options,
      });
      captureCurrentVersion("lesson", {
        ...lessonDraft,
        duration: Number(lessonDraft.duration),
        sortOrder: Number(lessonDraft.sortOrder),
        answer: Number(lessonDraft.answer),
        options,
      }, lessonDraft.title || "Untitled lesson", lessonDraft.published);
      feedback("Lesson and quiz saved.");
      setEditingLessonId(lessonDraft.id);
      router.refresh();
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Lesson save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadUsers(nextPage = 1) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users?page=${nextPage}`);
      const body = await response.json() as { error?: string; users?: AdminUser[]; nextPage?: number | null };
      if (!response.ok) throw new Error(body.error || "Users could not be loaded.");
      const received = body.users || [];
      setUsers((current) => nextPage === 1 ? received : [...current, ...received]);
      setUserRoles((current) => ({
        ...current,
        ...Object.fromEntries(received.map((user) => [user.id, user.role])),
      }));
      setUserPage(nextPage);
      setHasMoreUsers(body.nextPage !== null && body.nextPage !== undefined);
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Users could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(user: AdminUser) {
    setBusy(true);
    try {
      await requestJson(`/api/admin/users/${user.id}`, "PATCH", { role: userRoles[user.id] });
      feedback(`Role updated for ${user.email}.`);
      setUsers((current) => current.map((row) => row.id === user.id ? { ...row, role: userRoles[user.id] } : row));
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Role update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resetProgress(user: AdminUser) {
    if (!window.confirm(`Reset all lesson completions for ${user.email}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await requestJson(`/api/admin/users/${user.id}/progress`, "DELETE");
      setUsers((current) => current.map((row) => row.id === user.id ? { ...row, completedCount: 0 } : row));
      feedback(`Progress reset for ${user.email}.`);
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Progress reset failed.");
    } finally {
      setBusy(false);
    }
  }

  function selectLesson(id: string) {
    setEditingLessonId(id);
    setLessonDraft(lessons.find((lesson) => lesson.id === id) || emptyLesson(modules[0]?.id || ""));
  }

  function selectCourse(id: string) {
    setCourseId(id);
    setCourseDraft(courses.find((course) => course.id === id) || emptyCourse(id));
    setModuleDraft({ id: "", courseId: id, title: "", sortOrder: modules.filter((module) => module.course_id === id).length + 1 });
    setEditingLessonId("");
    setLessonDraft(emptyLesson());
  }

  function selectModule(id: string) {
    const selected = modules.find((module) => module.id === id);
    setModuleDraft(selected
      ? { id: selected.id, courseId: selected.course_id, title: selected.title, sortOrder: selected.sort_order }
      : { id: "", courseId: courseId || courses[0]?.id || "", title: "", sortOrder: modules.filter((module) => module.course_id === (courseId || courses[0]?.id)).length + 1 });
    setEditingLessonId("");
    setLessonDraft(emptyLesson(selected?.id || ""));
  }

  function switchTab(next: Tab) {
    setTab(next);
    if (next === "users" && !users.length) void loadUsers();
  }

  const learnerUsers = users.filter((user) => user.role === "learner");
  const adminUsers = users.filter((user) => user.role === "admin");
  const averageCompletion = learnerUsers.length
    ? Math.round(learnerUsers.reduce((total, user) => total + user.completedCount, 0) / learnerUsers.length)
    : 0;
  const strongestLearner = learnerUsers.reduce<AdminUser | null>((best, user) => {
    if (!best || user.completedCount > best.completedCount) return user;
    return best;
  }, null);
  const cohortCompletionRate = learnerUsers.length && lessons.length
    ? Math.min(100, Math.round((learnerUsers.reduce((total, user) => total + user.completedCount, 0) / (learnerUsers.length * lessons.length)) * 100))
    : 0;

  function restoreVersion(version: ContentVersion) {
    if (version.entityType === "course") {
      const snapshot = applyVersionSnapshot(version.snapshot as Partial<Course>, courseDraft);
      setCourseDraft({ ...snapshot, id: version.entityId });
      setCourseId(version.entityId);
      setModuleDraft({ id: "", courseId: version.entityId, title: "", sortOrder: 1 });
      setEditingLessonId("");
      setLessonDraft(emptyLesson());
      return;
    }
    if (version.entityType === "module") {
      const snapshot = applyVersionSnapshot(version.snapshot as Partial<typeof moduleDraft>, moduleDraft);
      setModuleDraft({ ...snapshot, id: version.entityId });
      setEditingLessonId("");
      setLessonDraft(emptyLesson(version.entityId));
      return;
    }
    const snapshot = applyVersionSnapshot(version.snapshot as Partial<AdminLesson>, lessonDraft);
    setLessonDraft({ ...snapshot, id: version.entityId });
    setEditingLessonId(version.entityId);
  }

  async function saveDraftVersion() {
    if (!currentVersionTarget) return;
    setBusy(true);
    try {
      const payload = currentVersionTarget.type === "course"
        ? { ...courseDraft }
        : currentVersionTarget.type === "module"
          ? { ...moduleDraft, sortOrder: Number(moduleDraft.sortOrder) }
          : { ...lessonDraft, duration: Number(lessonDraft.duration), sortOrder: Number(lessonDraft.sortOrder), answer: Number(lessonDraft.answer), options: lessonDraft.options.map((option) => option.trim()).filter(Boolean) };
      await captureCurrentVersion(
        currentVersionTarget.type,
        payload,
        currentVersionTarget.title,
        currentVersionTarget.type === "course" ? courseDraft.published : currentVersionTarget.type === "lesson" ? lessonDraft.published : false,
      );
      feedback(`${currentVersionTarget.title} snapshot saved.`);
    } catch (error) {
      feedback(error instanceof Error ? error.message : "The content version could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function publishCurrentDraft() {
    if (!currentVersionTarget || currentVersionTarget.type === "module") return;
    setBusy(true);
    try {
      if (currentVersionTarget.type === "course") {
        const publishedCourse = { ...courseDraft, published: true };
        await requestJson("/api/admin/publish", "POST", {
          entityType: "course",
          course: publishedCourse,
          note: versionNote.trim(),
        });
        setCourseDraft(publishedCourse);
        setVersionHistoryState({ key: `course:${publishedCourse.id}`, versions: await readVersionHistory("course", publishedCourse.id) });
      } else {
        const publishedLesson = {
          ...lessonDraft,
          published: true,
          duration: Number(lessonDraft.duration),
          sortOrder: Number(lessonDraft.sortOrder),
          answer: Number(lessonDraft.answer),
          options: lessonDraft.options.map((option) => option.trim()).filter(Boolean),
        };
        await requestJson("/api/admin/publish", "POST", {
          entityType: "lesson",
          lesson: publishedLesson,
          note: versionNote.trim(),
        });
        setLessonDraft(publishedLesson);
        setVersionHistoryState({ key: `lesson:${publishedLesson.id}`, versions: await readVersionHistory("lesson", publishedLesson.id) });
      }
      setVersionNote("");
      feedback(`${currentVersionTarget.title} published.`);
      router.refresh();
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Publishing failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-workspace">
      <div className="admin-summary">
        <div><strong>{courses.length}</strong><span>Courses</span></div>
        <div><strong>{modules.length}</strong><span>Modules</span></div>
        <div><strong>{lessons.length}</strong><span>Lessons</span></div>
        <div><strong>{activity.length}</strong><span>Recent admin actions</span></div>
      </div>

      <section className="admin-insights" aria-label="Admin learning analytics">
        <div className="insight-card">
          <span className="insight-label">Learners</span>
          <strong>{learnerUsers.length || "—"}</strong>
          <small>{users.length ? `${users.length} total accounts` : "Awaiting account sync"}</small>
        </div>
        <div className="insight-card">
          <span className="insight-label">Average completion</span>
          <strong>{averageCompletion}</strong>
          <small>lessons per learner</small>
        </div>
        <div className="insight-card">
          <span className="insight-label">Cohort progress</span>
          <strong>{cohortCompletionRate}%</strong>
          <small>of all available lessons completed</small>
        </div>
        <div className="insight-card">
          <span className="insight-label">Top learner</span>
          <strong>{strongestLearner ? strongestLearner.name || strongestLearner.email : "—"}</strong>
          <small>{strongestLearner ? `${strongestLearner.completedCount} lessons done` : "No learner data yet"}</small>
        </div>
      </section>
      <div className="admin-tabs" role="tablist" aria-label="Administration sections">
        <button className={tab === "content" ? "admin-tab active" : "admin-tab"} role="tab" aria-selected={tab === "content"} type="button" onClick={() => switchTab("content")}>Curriculum</button>
        <button className={tab === "users" ? "admin-tab active" : "admin-tab"} role="tab" aria-selected={tab === "users"} type="button" onClick={() => switchTab("users")}>Users & progress</button>
        <button className={tab === "activity" ? "admin-tab active" : "admin-tab"} role="tab" aria-selected={tab === "activity"} type="button" onClick={() => switchTab("activity")}>Audit history</button>
      </div>

      {tab === "content" && (
        <div className="admin-columns">
          <div className="admin-stack">
            <section className="admin-panel">
              <div className="admin-panel-heading"><div><h2>Courses</h2><p>Create or edit courses. Unpublish one to hide it without deleting learner history.</p></div><select aria-label="Select course" value={courseId} onChange={(event) => selectCourse(event.target.value)}><option value="">New course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></div>
              <form className="admin-form" onSubmit={saveCourse}>
                <label>Course ID<input required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={courseDraft.id} onChange={(event) => setCourseDraft({ ...courseDraft, id: event.target.value })} /></label>
                <label>Title<input required maxLength={160} value={courseDraft.title} onChange={(event) => setCourseDraft({ ...courseDraft, title: event.target.value })} /></label>
                <label>Description<textarea required maxLength={1000} rows={3} value={courseDraft.description} onChange={(event) => setCourseDraft({ ...courseDraft, description: event.target.value })} /></label>
                <label>Programming language<input required maxLength={40} value={courseDraft.language} onChange={(event) => setCourseDraft({ ...courseDraft, language: event.target.value })} /></label>
                <label>Level<input required maxLength={80} value={courseDraft.level} onChange={(event) => setCourseDraft({ ...courseDraft, level: event.target.value })} /></label>
                <label>Estimated study time (minutes)<input type="number" min={0} max={100000} value={courseDraft.estimatedMinutes} onChange={(event) => setCourseDraft({ ...courseDraft, estimatedMinutes: Number(event.target.value) })} /></label>
                <label>Recommended prerequisites (one per line)<textarea rows={2} value={courseDraft.recommendedPrerequisites.join("\n")} onChange={(event) => setCourseDraft({ ...courseDraft, recommendedPrerequisites: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
                <label>Learning outcomes (one per line)<textarea rows={4} value={courseDraft.learningOutcomes.join("\n")} onChange={(event) => setCourseDraft({ ...courseDraft, learningOutcomes: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
                <label className="admin-checkbox"><input type="checkbox" checked={courseDraft.published} onChange={(event) => setCourseDraft({ ...courseDraft, published: event.target.checked })} />Published and visible to learners</label>
                <button className="admin-save" disabled={busy || !courseDraft.id} type="submit">Save course</button>
              </form>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading"><div><h2>Modules</h2><p>Create or edit topic groups for a course.</p></div><select aria-label="Select module to edit" value={moduleDraft.id} onChange={(event) => selectModule(event.target.value)}><option value="">New module</option>{modules.filter((module) => module.course_id === moduleDraft.courseId || module.id === moduleDraft.id).map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></div>
              <form className="admin-form" onSubmit={saveModule}>
                <label>Course<select required value={moduleDraft.courseId} onChange={(event) => setModuleDraft({ ...moduleDraft, courseId: event.target.value })}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
                <label>Module ID<input required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" readOnly={modules.some((module) => module.id === moduleDraft.id)} value={moduleDraft.id} onChange={(event) => setModuleDraft({ ...moduleDraft, id: event.target.value })} /></label>
                <label>Title<input required maxLength={160} value={moduleDraft.title} onChange={(event) => setModuleDraft({ ...moduleDraft, title: event.target.value })} /></label>
                <label>Order<input type="number" min={0} max={10000} value={moduleDraft.sortOrder} onChange={(event) => setModuleDraft({ ...moduleDraft, sortOrder: Number(event.target.value) })} /></label>
                <button className="admin-save" disabled={busy || !courses.length} type="submit">{moduleDraft.id && modules.some((module) => module.id === moduleDraft.id) ? "Update module" : "Save module"}</button>
              </form>
            </section>
          </div>

          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Publishing workflow</h2><p>Save a draft note and keep a recent snapshot of each course, module, or lesson before it goes live.</p></div></div>
            {currentVersionTarget ? (
              <>
                <label className="version-note">Version note<textarea rows={3} value={versionNote} onChange={(event) => setVersionNote(event.target.value)} placeholder="Example: Refined examples and corrected quiz wording" /></label>
                <div className="version-actions">
                  <button className="admin-save" type="button" disabled={busy} onClick={() => void saveDraftVersion()}>Save draft version</button>
                  {currentVersionTarget.type !== "module" && <button className="admin-secondary" type="button" disabled={busy} onClick={() => void publishCurrentDraft()}>{busy ? "Publishing…" : "Publish now"}</button>}
                </div>
                <div className="version-list">
                  {versionHistory.length ? versionHistory.map((version) => (
                    <article className="version-item" key={version.id}>
                      <div>
                        <strong>{version.title}</strong>
                        <small>{new Date(version.createdAt).toLocaleString()} · {version.published ? "Published" : "Draft"}</small>
                        <p>{version.note}</p>
                      </div>
                      <button className="admin-secondary" type="button" onClick={() => restoreVersion(version)}>Restore</button>
                    </article>
                  )) : <p className="admin-empty">No version history yet for this item.</p>}
                </div>
              </>
            ) : <p className="admin-empty">Select a course, module, or lesson to track version history.</p>}
          </section>
          <section className="admin-panel lesson-editor">
            <div className="admin-panel-heading">
              <div><h2>{editingLessonId ? "Edit lesson & quiz" : "Create a lesson"}</h2><p>Correct answers stay server-side and are never sent with the course catalog.</p></div>
              <button className="admin-secondary" type="button" onClick={() => { setEditingLessonId(""); setLessonDraft(emptyLesson(modules[0]?.id || "")); }}>New lesson</button>
            </div>
            <label className="lesson-picker">Existing lessons<select value={editingLessonId} onChange={(event) => selectLesson(event.target.value)}><option value="">Create new lesson</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
            <button className="admin-secondary preview-toggle" type="button" aria-expanded={showLessonPreview} onClick={() => setShowLessonPreview((visible) => !visible)}>{showLessonPreview ? "Hide draft preview" : "Preview current draft"}</button>
            {showLessonPreview && (
              <section className="lesson-draft-preview" aria-label="Learner preview of current draft">
                <span className="admin-mode">{lessonDraft.published ? "Published content" : "Unpublished draft"}</span>
                <h3>{lessonDraft.icon} {lessonDraft.title || "Untitled lesson"}</h3>
                <p>{lessonDraft.explanation || "Add an explanation to preview the lesson."}</p>
                {lessonDraft.code && <pre><code>{lessonDraft.code}</code></pre>}
                {lessonDraft.tip && <p><strong>Tip:</strong> {lessonDraft.tip}</p>}
                {lessonDraft.practicePrompt && <div><strong>Your turn:</strong> {lessonDraft.practicePrompt}{lessonDraft.practiceStarter && <pre><code>{lessonDraft.practiceStarter}</code></pre>}{lessonDraft.practiceHint && <p><strong>Hint:</strong> {lessonDraft.practiceHint}</p>}{lessonDraft.practiceSolution && <p><strong>Example solution:</strong> <code>{lessonDraft.practiceSolution}</code></p>}</div>}
                <div><strong>{lessonDraft.quiz || "Quiz question preview"}</strong>
                  <ol>{lessonDraft.options.filter(Boolean).map((option, index) => (
                    <li className={index === Number(lessonDraft.answer) ? "preview-answer" : ""} key={`${index}-${option}`}>{option}{index === Number(lessonDraft.answer) ? " (correct answer)" : ""}</li>
                  ))}</ol>
                </div>
              </section>
            )}
            <form className="admin-form two-column" onSubmit={saveLesson}>
              <label>Lesson ID<input required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" readOnly={Boolean(editingLessonId)} value={lessonDraft.id} onChange={(event) => setLessonDraft({ ...lessonDraft, id: event.target.value })} /></label>
              <label>Module<select required value={lessonDraft.moduleId} onChange={(event) => setLessonDraft({ ...lessonDraft, moduleId: event.target.value })}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
              <label>Title<input required maxLength={160} value={lessonDraft.title} onChange={(event) => setLessonDraft({ ...lessonDraft, title: event.target.value })} /></label>
              <label>Icon<input required maxLength={12} value={lessonDraft.icon} onChange={(event) => setLessonDraft({ ...lessonDraft, icon: event.target.value })} /></label>
              <label>Duration (minutes)<input type="number" min={1} max={600} required value={lessonDraft.duration} onChange={(event) => setLessonDraft({ ...lessonDraft, duration: Number(event.target.value) })} /></label>
              <label>Difficulty<select value={lessonDraft.level} onChange={(event) => setLessonDraft({ ...lessonDraft, level: event.target.value as AdminLesson["level"] })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
              <label>Order<input type="number" min={0} max={10000} value={lessonDraft.sortOrder} onChange={(event) => setLessonDraft({ ...lessonDraft, sortOrder: Number(event.target.value) })} /></label>
              <label className="admin-checkbox"><input type="checkbox" checked={lessonDraft.published} onChange={(event) => setLessonDraft({ ...lessonDraft, published: event.target.checked })} />Published to learners</label>
              <fieldset className="prerequisite-editor full-span">
                <legend>Lessons required first</legend>
                <p>Select lessons learners must complete before opening this lesson. Circular prerequisites are rejected.</p>
                <div>
                  {lessons.filter((lesson) => lesson.id !== lessonDraft.id).map((lesson) => (
                    <label key={lesson.id}>
                      <input
                        type="checkbox"
                        checked={lessonDraft.prerequisiteIds.includes(lesson.id)}
                        onChange={(event) => setLessonDraft((draft) => ({
                          ...draft,
                          prerequisiteIds: event.target.checked
                            ? [...draft.prerequisiteIds, lesson.id]
                            : draft.prerequisiteIds.filter((id) => id !== lesson.id),
                        }))}
                      />
                      <span>{lesson.title}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="full-span">Card description<textarea required maxLength={500} rows={2} value={lessonDraft.description} onChange={(event) => setLessonDraft({ ...lessonDraft, description: event.target.value })} /></label>
              <label className="full-span">Lesson explanation<textarea required maxLength={5000} rows={3} value={lessonDraft.explanation} onChange={(event) => setLessonDraft({ ...lessonDraft, explanation: event.target.value })} /></label>
              <label className="full-span">Code example<textarea maxLength={10000} rows={6} className="code-input" value={lessonDraft.code} onChange={(event) => setLessonDraft({ ...lessonDraft, code: event.target.value })} /></label>
              <label className="full-span">Learning tip<textarea required maxLength={1000} rows={2} value={lessonDraft.tip} onChange={(event) => setLessonDraft({ ...lessonDraft, tip: event.target.value })} /></label>
              <label className="full-span">Practice challenge<textarea maxLength={1000} rows={2} value={lessonDraft.practicePrompt} onChange={(event) => setLessonDraft({ ...lessonDraft, practicePrompt: event.target.value })} /></label>
              <label className="full-span">Practice starter code<textarea maxLength={10000} rows={3} className="code-input" value={lessonDraft.practiceStarter} onChange={(event) => setLessonDraft({ ...lessonDraft, practiceStarter: event.target.value })} /></label>
              <label className="full-span">Practice hint<textarea maxLength={1000} rows={2} value={lessonDraft.practiceHint} onChange={(event) => setLessonDraft({ ...lessonDraft, practiceHint: event.target.value })} /></label>
              <label className="full-span">Example solution<textarea maxLength={10000} rows={3} className="code-input" value={lessonDraft.practiceSolution} onChange={(event) => setLessonDraft({ ...lessonDraft, practiceSolution: event.target.value })} /></label>
              <label className="full-span">Quiz explanation<textarea maxLength={1000} rows={2} value={lessonDraft.quizExplanation} onChange={(event) => setLessonDraft({ ...lessonDraft, quizExplanation: event.target.value })} /></label>
              <label className="full-span">Quiz question<input required maxLength={1000} value={lessonDraft.quiz} onChange={(event) => setLessonDraft({ ...lessonDraft, quiz: event.target.value })} /></label>
              <label className="full-span">Answer options (one per line)<textarea required rows={4} value={lessonDraft.options.join("\n")} onChange={(event) => setLessonDraft({ ...lessonDraft, options: event.target.value.split("\n") })} /></label>
              <label>Correct answer index (starting at 0)<input type="number" min={0} max={7} required value={lessonDraft.answer} onChange={(event) => setLessonDraft({ ...lessonDraft, answer: Number(event.target.value) })} /></label>
              <button className="admin-save" disabled={busy || !modules.length} type="submit">{busy ? "Saving…" : "Save lesson & quiz"}</button>
            </form>
            <div className="lesson-list">
              <h3>Current lessons <span>{lessons.length}</span></h3>
              {lessons.map((lesson) => <button className="lesson-row" key={lesson.id} type="button" onClick={() => selectLesson(lesson.id)}><span>{lesson.title}<small>{lesson.id}</small></span><span className={lesson.published ? "publish-state published" : "publish-state"}>{lesson.published ? "Published" : "Draft"}</span></button>)}
            </div>
          </section>
        </div>
      )}

      {tab === "users" && (
        <section className="admin-panel user-panel">
          <div className="admin-panel-heading"><div><h2>Learner accounts</h2><p>Review access and course completion. Passwords are never available to administrators.</p></div></div>
          {!users.length && <p className="admin-empty">{busy ? "Loading accounts…" : "No accounts found yet."}</p>}
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Learner</th><th>Role</th><th>Completed</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
            {users.map((user) => <tr key={user.id}><td><strong>{user.name || user.email || "Learner"}</strong><small>{user.email}</small></td><td><select value={userRoles[user.id] || user.role} onChange={(event) => setUserRoles({ ...userRoles, [user.id]: event.target.value as AdminUser["role"] })}><option value="learner">Learner</option><option value="admin">Administrator</option></select><button className="table-action" disabled={busy || (userRoles[user.id] || user.role) === user.role} type="button" onClick={() => void updateRole(user)}>Save role</button></td><td>{user.completedCount}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td><button className="table-action danger" disabled={busy || user.completedCount === 0} type="button" onClick={() => void resetProgress(user)}>Reset progress</button></td></tr>)}
          </tbody></table></div>
          {hasMoreUsers && <button className="admin-secondary load-more" disabled={busy} type="button" onClick={() => void loadUsers(userPage + 1)}>Load more accounts</button>}
        </section>
      )}

      {tab === "activity" && (
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Administrator audit history</h2><p>Recent content and account changes.</p></div></div>
          {!activity.length ? <p className="admin-empty">No administration changes have been recorded.</p> : (
            <div className="activity-list">{activity.map((item) => <article className="activity-row" key={item.id}><span className="activity-dot" /><div><strong>{item.action} {item.entityType}{item.entityId ? ` · ${item.entityId}` : ""}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></div></article>)}</div>
          )}
        </section>
      )}
      {notice && <div className="toast-notice" role="status" aria-live="polite">{notice}</div>}
    </section>
  );
}
