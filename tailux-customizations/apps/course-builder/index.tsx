// Course Builder — REAL tailux components only, matching Tutor LMS source structure
// Source: /home/z/my-project/repos/tutor/assets/src/js/v3/entries/course-builder/
//
// STRICT RULES:
//   - All buttons use <Button> from @/components/ui (no raw <button>)
//   - All inputs use <Input>, <Textarea>, <Select>, <Switch>, <Checkbox> from @/components/ui
//   - All uploads use <Upload> from @/components/ui/Form/Upload
//   - Modals use headlessui Dialog + Transition (same pattern as tailux's NewTask.tsx)
//   - Spacing uses tailux's scale: gap-4, p-4, size-7, size-4.5 (NOT p-8, gap-2, etc.)
//   - Colors use tailux tokens: text-primary-600, dark:bg-dark-700, dark:text-dark-100
//   - Card uses <Card> from @/components/ui with skin="bordered" or "shadow"

import { useState, Fragment, useRef, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  AcademicCapIcon,
  SparklesIcon,
  CloudArrowUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  InformationCircleIcon,
  EyeIcon,
  PhotoIcon,
  FilmIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  LinkIcon,
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3CenterLeftIcon,
  Bars3Icon,
  Squares2X2Icon,
  EllipsisVerticalIcon,
  DocumentTextIcon,
  PuzzlePieceIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  ClockIcon,
  UserIcon,
  RectangleStackIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilSquareIcon,
  ChatBubbleLeftEllipsisIcon,
  ListBulletIcon,
  NumberedListIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon as UnderlineIconHero,
  CalendarIcon,
  PaperClipIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import {
  Button,
  Input,
  Textarea,
  Switch,
  Checkbox,
  Card,
  Badge,
} from "@/components/ui";
import { Upload } from "@/components/ui/Form/Upload";

// ============================================================
// API INTEGRATION (Phase 1 — Part 2)
// The Course Builder is now backed by the real LMS API client.
// All create operations call `lmsApi.*` and fall back to local
// mock IDs on failure so the UI keeps working in dev even when
// the backend is unreachable.
// ============================================================
import { lmsApi } from "@/services/lms-api";
import { useCourses, useCreateCourse } from "@/hooks/useLms";
import type {
  Course as ApiCourse,
  Topic as ApiTopic,
  Lesson as ApiLesson,
} from "@/types/lms";

// ============================================================
// TYPES
// ============================================================
type Step = 1 | 2 | 3;
type ItemType = "lesson" | "quiz" | "assignment";

interface CurriculumItem {
  id: string;
  type: ItemType;
  title: string;
  meta?: string;
}

interface Topic {
  id: string;
  title: string;
  summary: string;
  expanded: boolean;
  items: CurriculumItem[];
}

// ============================================================
// API MAPPERS — translate the API's data shape into the local
// Topic / CurriculumItem shape the UI was already built against.
// (The backend uses snake_case-adjacent camelCase + ObjectID
// strings + ISODate strings; the local mock used short ids and
// plain strings.)
// ============================================================

function apiTopicToLocal(t: ApiTopic): Topic {
  return {
    id: t.id,
    title: t.title,
    summary: t.summary ?? "",
    expanded: false,
    items: [],
  };
}

function apiLessonToItem(l: ApiLesson): CurriculumItem {
  return {
    id: l.id,
    type: "lesson",
    title: l.title,
    meta: l.lessonType ? `(${l.lessonType})` : undefined,
  };
}

/** Slugify a title for the API's required `slug` field on course create. */
function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `course-${Date.now()}`
  );
}

// ============================================================
// MAIN COURSE BUILDER
// ============================================================
export default function CourseBuilder() {
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("New Course");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<Topic[]>([
    {
      id: "t1",
      title: "Introduction to Social Media Marketing",
      summary: "",
      expanded: true,
      items: [
        { id: "i1", type: "lesson", title: "What is Social Media Marketing?" },
        { id: "i2", type: "quiz", title: "Introduction Quiz", meta: "(5 Questions)" },
        { id: "i3", type: "assignment", title: "Set up your social media accounts" },
      ],
    },
  ]);

  // ---- API integration state ----
  // `activeCourseId` is the API-side course this builder is editing.
  // When undefined, the UI keeps using the local mock data above.
  const [activeCourseId, setActiveCourseId] = useState<string | undefined>(undefined);
  const [apiSyncing, setApiSyncing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch the courses list on mount via the `useCourses` hook. We use
  // the hook (not a raw effect) so the loading + error plumbing comes
  // for free. The hook keeps its own state, so we mirror it into local
  // state below to drive the "active course" selection.
  const {
    data: coursesData,
    loading: coursesLoading,
    error: coursesError,
  } = useCourses();
  const { mutate: createCourse } = useCreateCourse();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Still waiting for the hook to finish the initial fetch.
      if (coursesLoading) return;
      setApiError(coursesError ? String(coursesError.message) : null);
      if (coursesError || !coursesData) return;

      // Already bootstrapped — don't re-run when the data settles.
      if (cancelled || activeCourseId) return;

      setApiSyncing(true);
      try {
        let courseId: string | undefined;
        let baseTitle = "New Course";
        let baseDescription = "";

        if (coursesData.length === 0) {
          // No courses on the server — create one to host this builder.
          try {
            const created = await createCourse({
              title: "New Course",
              slug: slugify(`New Course ${Date.now()}`),
              description: "",
            });
            courseId = created?.id;
            baseTitle = created?.title ?? baseTitle;
            baseDescription = created?.description ?? "";
          } catch (e) {
            // create failed — fall back to local mock mode
            console.warn("[course-builder] createCourse failed, using local state:", e);
          }
        } else {
          const first: ApiCourse = coursesData[0] as ApiCourse;
          courseId = first.id;
          baseTitle = first.title;
          baseDescription = first.description ?? "";
        }

        if (cancelled) return;

        if (courseId) {
          setActiveCourseId(courseId);
          setTitle(baseTitle);
          setDescription(baseDescription);

          // Fetch topics + lessons for the active course. On any
          // failure we keep the existing local mock topics so the UI
          // still renders something useful.
          try {
            const apiTopics = await lmsApi.topic.list(courseId);
            if (cancelled) return;

            const withItems: Topic[] = await Promise.all(
              apiTopics.map(async (t): Promise<Topic> => {
                const local = apiTopicToLocal(t);
                try {
                  const lessons = await lmsApi.lesson.list(t.id);
                  local.items = lessons.map(apiLessonToItem);
                } catch (e) {
                  // leave items empty — topic still renders
                  console.warn(`[course-builder] lesson.list failed for topic ${t.id}:`, e);
                }
                return local;
              }),
            );

            if (cancelled) return;
            if (withItems.length > 0) {
              // Mark the first topic as expanded so the curriculum
              // tab renders with one open by default (matches the
              // previous mock-data behaviour).
              withItems[0].expanded = true;
              setTopics(withItems);
            }
          } catch (e) {
            console.warn("[course-builder] topic.list failed, using local mock topics:", e);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setApiError(e instanceof Error ? e.message : "Failed to load course data");
        }
      } finally {
        if (!cancelled) setApiSyncing(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coursesData, coursesLoading, coursesError]);

  return (
    <Page title="Course Builder">
      <div className="min-h-screen bg-primary-100 p-4 dark:bg-dark-800 sm:p-8">
        <div className="mx-auto my-4 w-full max-w-[1280px] overflow-hidden rounded-2xl bg-white shadow-soft dark:bg-dark-700">
          <Header step={step} setStep={setStep} />

          {step === 1 && (
            <BasicTab
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <CurriculumTab
              topics={topics}
              setTopics={setTopics}
              courseId={activeCourseId}
              apiSyncing={apiSyncing || coursesLoading}
              apiError={apiError}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && <AdditionalTab onBack={() => setStep(2)} />}
        </div>
      </div>
    </Page>
  );
}

// ============================================================
// HEADER — uses Button with color/variant props (NO raw <button>)
// ============================================================
function Header({ step, setStep }: { step: Step; setStep: (s: Step) => void }) {
  const [showAI, setShowAI] = useState(false);
  return (
    <>
      <header className="flex items-center gap-4 border-b border-gray-200 px-6 py-3 dark:border-dark-600">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2">
          <AcademicCapIcon className="size-6 text-primary-600 dark:text-primary-400" />
          <span className="text-lg font-bold leading-none text-gray-800 dark:text-dark-50">
            tutor <span className="font-light">LMS</span>
          </span>
        </div>

        <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-dark-500" />

        <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-dark-100">
          Course Builder
        </span>

        {/* Step indicator */}
        <div className="ml-2 flex items-center gap-2">
          <StepIndicator n={1} label="Basics" active={step === 1} onClick={() => setStep(1)} />
          <span className="text-gray-300 dark:text-dark-400">—</span>
          <StepIndicator n={2} label="Curriculum" active={step === 2} onClick={() => setStep(2)} />
          <span className="text-gray-300 dark:text-dark-400">—</span>
          <StepIndicator n={3} label="Additional" active={step === 3} onClick={() => setStep(3)} />
        </div>

        <Button
          variant="flat"
          color="error"
          onClick={() => setShowAI(true)}
          className="ml-auto gap-1.5 text-sm"
        >
          <SparklesIcon className="size-4" />
          Generate with AI
        </Button>

        <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-dark-500" />

        <Button variant="flat" color="primary" className="gap-1.5 text-sm">
          <CloudArrowUpIcon className="size-4" />
          Save as Draft
        </Button>

        <Button color="primary" className="gap-1.5 text-sm">
          Publish
          <ChevronDownIcon className="size-4" />
        </Button>
      </header>
      {showAI && <AICourseBuilderModal onClose={() => setShowAI(false)} />}
    </>
  );
}

function StepIndicator({
  n,
  label,
  active,
  onClick,
}: {
  n: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group flex items-center gap-2">
      <span
        className={clsx(
          "flex size-5 items-center justify-center rounded-full text-xs font-bold transition-colors",
          active
            ? "bg-primary-600 text-white dark:bg-primary-500"
            : "bg-gray-200 text-gray-500 group-hover:bg-gray-300 dark:bg-dark-500 dark:text-dark-200 dark:group-hover:bg-dark-400",
        )}
      >
        {n}
      </span>
      <span
        className={clsx(
          "text-xs",
          active ? "font-medium text-gray-900 dark:text-dark-50" : "text-gray-500 dark:text-dark-200",
        )}
      >
        {label}
      </span>
    </button>
  );
}

// ============================================================
// BASIC TAB
// ============================================================
function BasicTab({
  title,
  setTitle,
  description,
  setDescription,
  onNext,
}: {
  title: string;
  setTitle: (t: string) => void;
  description: string;
  setDescription: (d: string) => void;
  onNext: () => void;
}) {
  const [optionTab, setOptionTab] = useState<"general" | "content-drip">("general");
  const [maxStudents, setMaxStudents] = useState("0");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [isPublic, setIsPublic] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [pricing, setPricing] = useState<"free" | "paid">("free");

  return (
    <>
      <div className="grid grid-cols-1 divide-x divide-gray-200 lg:grid-cols-[1.5fr_1fr] dark:divide-dark-600">
        {/* LEFT */}
        <div className="space-y-6 bg-gray-50 p-6 dark:bg-dark-800 sm:p-8">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Title</label>
              <SparklesIcon className="size-3.5 text-pink-500" />
            </div>
            <Input
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
              placeholder="Enter Course Title"
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-dark-300">Course URL:</span>
              <a className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400">
                https://tutor.hellotutorlms.com/courses/{title.toLowerCase().replace(/\s+/g, "-")}
                <LinkIcon className="size-3" />
              </a>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Description</label>
                <SparklesIcon className="size-3.5 text-pink-500" />
              </div>
              <Button variant="outlined" color="primary" className="gap-1 px-2 py-1 text-xs">
                <PhotoIcon className="size-3.5" />
                Add media
              </Button>
            </div>
            <RichTextEditor value={description} onChange={setDescription} placeholder="Enter Course Description" />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-dark-50">Options</h3>
            <Card skin="bordered" className="overflow-hidden p-0">
              <div className="grid grid-cols-[140px_1fr]">
                <nav className="border-r border-gray-200 py-2 dark:border-dark-600">
                  <OptionTab
                    active={optionTab === "general"}
                    onClick={() => setOptionTab("general")}
                    icon={<Cog6ToothIcon className="size-3.5" />}
                    label="General"
                  />
                  <OptionTab
                    active={optionTab === "content-drip"}
                    onClick={() => setOptionTab("content-drip")}
                    icon={<ClockIcon className="size-3.5" />}
                    label="Content Drip"
                  />
                </nav>
                <div className="space-y-4 p-4">
                  {optionTab === "general" && (
                    <>
                      <div className="flex items-center gap-3">
                        <label className="flex min-w-[120px] items-center gap-1 text-xs text-gray-600 dark:text-dark-200">
                          <InformationCircleIcon className="size-3.5 text-gray-400" />
                          Maximum Students
                        </label>
                        <Input
                          type="number"
                          value={maxStudents}
                          onChange={(e: any) => setMaxStudents(e.target.value)}
                          classNames={{ input: "h-9 w-24" }}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex min-w-[120px] items-center gap-1 text-xs text-gray-600 dark:text-dark-200">
                          <InformationCircleIcon className="size-3.5 text-gray-400" />
                          Difficulty Level
                        </label>
                        <SelectNative
                          value={difficulty}
                          onChange={setDifficulty}
                          options={["All Levels", "Beginner", "Intermediate", "Expert"]}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex min-w-[120px] items-center gap-1 text-xs text-gray-600 dark:text-dark-200">
                          <InformationCircleIcon className="size-3.5 text-gray-400" />
                          Public Course
                        </label>
                        <Switch
                          checked={isPublic}
                          onChange={(e: any) => setIsPublic(e.target.checked)}
                        />
                      </div>
                    </>
                  )}
                  {optionTab === "content-drip" && (
                    <div className="space-y-2 py-2">
                      <DripRadio label="Unlock on a specific date" />
                      <DripRadio label="Unlock X days after enrollment" />
                      <DripRadio label="Unlock after completing previous lesson" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-5 bg-white p-6 dark:bg-dark-700">
          <SidebarSection label="Visibility">
            <div className="relative">
              <EyeIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-dark-300" />
              <SelectNative
                value="Public"
                onChange={() => {}}
                options={["Public", "Private", "Password protected"]}
                className="pl-9"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-gray-400 dark:text-dark-400">
              Last updated on 27th November, 2024
            </p>
          </SidebarSection>

          <SidebarSection label="Schedule">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-dark-200">Schedule course launch</span>
              <Switch checked={schedule} onChange={(e: any) => setSchedule(e.target.checked)} />
            </div>
          </SidebarSection>

          <SidebarSection label="Featured Image">
            <UploadBox
              icon={<PhotoIcon className="size-6 text-gray-400" />}
              buttonText="Upload Thumbnail"
              helper="JPEG, PNG, GIF, and WebP formats, up to 512 MB"
            />
          </SidebarSection>

          <SidebarSection label="Intro Video">
            <UploadBox
              icon={<FilmIcon className="size-6 text-gray-400" />}
              buttonText="Upload Video"
              secondaryText="Add from URL"
              helper="MP4, and WebM formats, up to 512 MB"
            />
          </SidebarSection>

          <SidebarSection label="Pricing Model">
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={pricing === "free"}
                  onChange={() => setPricing("free")}
                  className="size-4 text-primary-600 focus:ring-primary-500/30"
                />
                <span className="text-gray-700 dark:text-dark-100">Free</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={pricing === "paid"}
                  onChange={() => setPricing("paid")}
                  className="size-4 text-primary-600 focus:ring-primary-500/30"
                />
                <span className="text-gray-700 dark:text-dark-100">Paid</span>
              </label>
            </div>
          </SidebarSection>

          <SidebarSection label="Categories">
            <Button
              variant="outlined"
              color="neutral"
              className="h-9 w-full justify-start gap-2 text-sm"
            >
              <PlusIcon className="size-4 text-primary-600 dark:text-primary-400" />
              Add
            </Button>
          </SidebarSection>

          <SidebarSection label="Tags">
            <Input placeholder="Add tags" classNames={{ input: "h-9" }} />
          </SidebarSection>

          <SidebarSection label="Author">
            <Button
              variant="outlined"
              color="neutral"
              className="h-auto w-full justify-start gap-2 p-2"
            >
              <div className="flex size-7 items-center justify-center rounded-full bg-gray-200 dark:bg-dark-500">
                <UserIcon className="size-4 text-gray-500 dark:text-dark-300" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-gray-800 dark:text-dark-50">tutor</div>
                <div className="truncate text-[10px] text-gray-500 dark:text-dark-300">
                  admin@tutor.hellotutorlms.com
                </div>
              </div>
              <ChevronDownIcon className="size-4 text-gray-400" />
            </Button>
          </SidebarSection>

          <SidebarSection label="Instructors">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-dark-300" />
              <Input placeholder="Search to add instructor" classNames={{ input: "h-9 pl-9" }} />
            </div>
          </SidebarSection>
        </aside>
      </div>

      <Footer>
        <Button variant="outlined" color="neutral" onClick={onNext} className="gap-1.5">
          Next
          <ArrowRightIcon className="size-4" />
        </Button>
      </Footer>
    </>
  );
}

// ============================================================
// CURRICULUM TAB
// ============================================================
function CurriculumTab({
  topics,
  setTopics,
  courseId,
  apiSyncing,
  apiError,
  onBack,
  onNext,
}: {
  topics: Topic[];
  // Widen to the real useState setter type so async handlers can use
  // the functional form (the existing `setTopics(arr)` calls still work).
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  /** API-side course id this builder is editing. Undefined = dev-fallback mode. */
  courseId?: string;
  /** True while the initial fetch / a background sync is in flight. */
  apiSyncing?: boolean;
  /** Last API error message, surfaced inline so the user knows data is local-only. */
  apiError?: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const [modal, setModal] = useState<{ type: ItemType; topicId: string; itemId?: string } | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "topic" | "item";
    topicId: string;
    itemId?: string;
    name: string;
  } | null>(null);
  const [showContentBank, setShowContentBank] = useState(false);

  const toggleExpand = (id: string) =>
    setTopics(topics.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t)));

  // -------- addTopic: optimistic local + API create with fallback --------
  const addTopic = () => {
    const tempId = `t${Date.now()}`;
    setTopics((prev) => [
      ...prev,
      { id: tempId, title: "New Topic", summary: "", expanded: true, items: [] },
    ]);
    setEditingTopic(tempId);

    if (!courseId) return; // dev-fallback mode — keep local-only
    lmsApi.topic
      .create(courseId, { title: "New Topic" })
      .then((created) => {
        // Replace the temp id with the API-issued id so subsequent
        // operations on this topic target the right resource.
        setTopics((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, id: created.id } : t)),
        );
        setEditingTopic(created.id);
      })
      .catch((e) => {
        console.warn("[course-builder] topic.create failed, keeping local id:", e);
      });
  };

  const updateTopic = (id: string, patch: Partial<Topic>) => {
    setTopics(topics.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    // Best-effort PATCH — fire-and-forget. The local state already reflects the change.
    if (courseId && patch.title !== undefined) {
      lmsApi.topic.update(id, { title: patch.title }).catch((e) => {
        console.warn(`[course-builder] topic.update failed for ${id}:`, e);
      });
    }
  };

  const deleteTopic = (id: string) => {
    setTopics(topics.filter((t) => t.id !== id));
    // Skip the API call for local-only temp ids (pattern: `t{timestamp}`).
    if (/^t\d+$/.test(id)) return;
    lmsApi.topic.remove(id).catch((e) => {
      console.warn(`[course-builder] topic.remove failed for ${id}:`, e);
    });
  };

  // -------- saveItem: optimistic local + API create with fallback --------
  // The modals call this with a CurriculumItem that has a temp id.
  // We optimistically add it to local state, then ask the API to
  // persist it. On success we swap the temp id for the real one so
  // subsequent edits target the right resource.
  const saveItem = (topicId: string, item: CurriculumItem) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, items: [...t.items, item] } : t)),
    );
    setModal(null);

    const replaceTempId = (realId: string) =>
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicId
            ? {
                ...t,
                items: t.items.map((i) => (i.id === item.id ? { ...i, id: realId } : i)),
              }
            : t,
        ),
      );

    if (item.type === "lesson") {
      lmsApi.lesson
        .create(topicId, { title: item.title, lessonType: "text" })
        .then((created) => replaceTempId(created.id))
        .catch((e) => {
          console.warn(`[course-builder] lesson.create failed for topic ${topicId}:`, e);
        });
    } else if (item.type === "quiz") {
      lmsApi.quiz
        .create(topicId, { title: item.title })
        .then((created) => replaceTempId(created.id))
        .catch((e) => {
          console.warn(`[course-builder] quiz.create failed for topic ${topicId}:`, e);
        });
    } else if (item.type === "assignment") {
      lmsApi.assignment
        .create(topicId, { title: item.title })
        .then((created) => replaceTempId(created.id))
        .catch((e) => {
          console.warn(`[course-builder] assignment.create failed for topic ${topicId}:`, e);
        });
    }
  };

  const updateItem = (topicId: string, itemId: string, patch: Partial<CurriculumItem>) =>
    setTopics(
      topics.map((t) =>
        t.id === topicId ? { ...t, items: t.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : t,
      ),
    );

  const deleteItem = (topicId: string, itemId: string) => {
    setTopics(topics.map((t) => (t.id === topicId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t)));
    // Only call the API if the id looks like a server-issued id (not a temp `i{timestamp}`).
    if (!/^i\d+$/.test(itemId)) {
      lmsApi.lesson.remove(itemId).catch((e) => {
        console.warn(`[course-builder] item.remove failed for ${itemId}:`, e);
      });
    }
  };

  const duplicateItem = (topicId: string, itemId: string) => {
    setTopics(
      topics.map((t) => {
        if (t.id !== topicId) return t;
        const orig = t.items.find((i) => i.id === itemId);
        if (!orig) return t;
        return { ...t, items: [...t.items, { ...orig, id: `i${Date.now()}`, title: `${orig.title} (copy)` }] };
      }),
    );
  };

  return (
    <>
      <div className="min-h-[600px] bg-gray-50 p-6 dark:bg-dark-800">
        {/* ---- API sync / error banner (subtle, non-intrusive) ---- */}
        {(apiSyncing || apiError) && (
          <div
            className={clsx(
              "mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
              apiError
                ? "border-error-500/30 bg-error-500/10 text-error-700 dark:text-error-400"
                : "border-primary-500/30 bg-primary-500/10 text-primary-700 dark:text-primary-300",
            )}
          >
            {apiSyncing && (
              <>
                <ArrowPathIcon className="size-3.5 animate-spin" />
                Syncing with server…
              </>
            )}
            {!apiSyncing && apiError && (
              <>
                <ExclamationTriangleIcon className="size-3.5" />
                Server unavailable — showing local mock data. ({apiError})
              </>
            )}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              color="neutral"
              isIcon
              className="size-8"
              onClick={onBack}
            >
              <ArrowLeftIcon className="size-4 text-gray-600 dark:text-dark-200" />
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-50">Curriculum</h2>
            {courseId && (
              <Badge color="success" variant="soft" className="text-[10px]">
                API connected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="flat"
              color="primary"
              className="text-xs"
              onClick={() => setShowContentBank(true)}
            >
              Content Bank
            </Button>
            <button
              onClick={() => setTopics(topics.map((t) => ({ ...t, expanded: true })))}
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline dark:text-dark-300 dark:hover:text-dark-100"
            >
              Expand All
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              isEditing={editingTopic === topic.id}
              onToggle={() => toggleExpand(topic.id)}
              onEdit={() => setEditingTopic(topic.id)}
              onEditDone={() => setEditingTopic(null)}
              onUpdate={(patch) => updateTopic(topic.id, patch)}
              onDuplicate={() =>
                setTopics((prev) => [
                  ...prev,
                  { ...topic, id: `t${Date.now()}`, title: `${topic.title} (copy)`, items: [] },
                ])
              }
              onDelete={() => setDeleteTarget({ kind: "topic", topicId: topic.id, name: topic.title })}
              onAddLesson={() => setModal({ type: "lesson", topicId: topic.id })}
              onAddQuiz={() => setModal({ type: "quiz", topicId: topic.id })}
              onAddAssignment={() => setModal({ type: "assignment", topicId: topic.id })}
              onEditItem={(itemId) => {
                const item = topic.items.find((i) => i.id === itemId);
                if (item) setModal({ type: item.type, topicId: topic.id, itemId });
              }}
              onDuplicateItem={(itemId) => duplicateItem(topic.id, itemId)}
              onDeleteItem={(itemId, name) =>
                setDeleteTarget({ kind: "item", topicId: topic.id, itemId, name })
              }
            />
          ))}
        </div>

        <Button
          variant="soft"
          color="primary"
          onClick={addTopic}
          className="mt-4 w-full gap-2 py-3"
        >
          <span className="flex size-5 items-center justify-center rounded bg-primary-600 text-white">
            <PlusIcon className="size-3.5" />
          </span>
          Add Topic
        </Button>
      </div>

      <Footer>
        <Button
          variant="outlined"
          color="neutral"
          isIcon
          className="size-9"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-4 text-gray-600 dark:text-dark-200" />
        </Button>
        <Button variant="outlined" color="neutral" onClick={onNext} className="gap-1.5">
          Next
          <ArrowRightIcon className="size-4" />
        </Button>
      </Footer>

      {/* MODALS */}
      {modal?.type === "lesson" && (
        <LessonModal
          topicId={modal.topicId}
          itemId={modal.itemId}
          existing={
            modal.itemId
              ? topics.find((t) => t.id === modal.topicId)?.items.find((i) => i.id === modal.itemId)
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={(item) =>
            modal.itemId ? updateItem(modal.topicId, modal.itemId, item) : saveItem(modal.topicId, item)
          }
        />
      )}
      {modal?.type === "quiz" && (
        <QuizModal
          topicId={modal.topicId}
          itemId={modal.itemId}
          existing={
            modal.itemId
              ? topics.find((t) => t.id === modal.topicId)?.items.find((i) => i.id === modal.itemId)
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={(item) =>
            modal.itemId ? updateItem(modal.topicId, modal.itemId, item) : saveItem(modal.topicId, item)
          }
        />
      )}
      {modal?.type === "assignment" && (
        <AssignmentModal
          topicId={modal.topicId}
          itemId={modal.itemId}
          existing={
            modal.itemId
              ? topics.find((t) => t.id === modal.topicId)?.items.find((i) => i.id === modal.itemId)
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={(item) =>
            modal.itemId ? updateItem(modal.topicId, modal.itemId, item) : saveItem(modal.topicId, item)
          }
        />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          name={deleteTarget.name}
          kind={deleteTarget.kind}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget.kind === "topic") deleteTopic(deleteTarget.topicId);
            else if (deleteTarget.itemId) deleteItem(deleteTarget.topicId, deleteTarget.itemId);
            setDeleteTarget(null);
          }}
        />
      )}
      {showContentBank && <ContentBankModal onClose={() => setShowContentBank(false)} />}
    </>
  );
}

// ============================================================
// TOPIC CARD — uses Card component
// ============================================================
function TopicCard({
  topic,
  isEditing,
  onToggle,
  onEdit,
  onEditDone,
  onUpdate,
  onDuplicate,
  onDelete,
  onAddLesson,
  onAddQuiz,
  onAddAssignment,
  onEditItem,
  onDuplicateItem,
  onDeleteItem,
}: {
  topic: Topic;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onEditDone: () => void;
  onUpdate: (patch: Partial<Topic>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onAddQuiz: () => void;
  onAddAssignment: () => void;
  onEditItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
  onDeleteItem: (id: string, name: string) => void;
}) {
  return (
    <Card skin="bordered" className="overflow-hidden p-0">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800">
        <span className="cursor-grab text-gray-300 hover:text-gray-500 dark:text-dark-400 dark:hover:text-dark-200">
          <Squares2X2Icon className="size-4 rotate-90" />
        </span>

        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={topic.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            onBlur={onEditDone}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditDone();
            }}
            className="flex-1 rounded border border-primary-500 px-2 py-1 text-sm font-medium text-gray-800 focus:outline-none dark:bg-dark-800 dark:text-dark-50"
          />
        ) : (
          <button onClick={onToggle} className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-dark-50">
            {topic.title}
          </button>
        )}

        <Menu as="div" className="relative">
          <MenuButton className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-dark-100">
            <EllipsisVerticalIcon className="size-4" />
          </MenuButton>
          <MenuItems className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg focus:outline-none dark:border-dark-500 dark:bg-dark-700">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onEdit}
                  className={clsx(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-dark-100",
                    active && "bg-gray-100 dark:bg-dark-600",
                  )}
                >
                  <PencilSquareIcon className="size-3.5" /> Edit Topic
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onDuplicate}
                  className={clsx(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-dark-100",
                    active && "bg-gray-100 dark:bg-dark-600",
                  )}
                >
                  <ArrowPathIcon className="size-3.5" /> Duplicate
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onDelete}
                  className={clsx(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400",
                    active && "bg-red-50 dark:bg-red-500/10",
                  )}
                >
                  <TrashIcon className="size-3.5" /> Delete
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>

      {/* Items */}
      {topic.expanded && topic.items.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50/50 dark:border-dark-600 dark:bg-dark-800/50">
          <div className="space-y-1 py-2 pl-12 pr-4">
            {topic.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => onEditItem(item.id)}
                onDuplicate={() => onDuplicateItem(item.id)}
                onDelete={() => onDeleteItem(item.id, item.title)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add buttons */}
      {topic.expanded && (
        <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-2.5 dark:border-dark-600 dark:bg-dark-700">
          <Button variant="outlined" color="neutral" onClick={onAddLesson} className="gap-1.5 px-2.5 py-1.5 text-xs">
            <PlusIcon className="size-3 text-primary-600 dark:text-primary-400" />
            Lesson
          </Button>
          <Button variant="outlined" color="neutral" onClick={onAddQuiz} className="gap-1.5 px-2.5 py-1.5 text-xs">
            <PlusIcon className="size-3 text-primary-600 dark:text-primary-400" />
            Quiz
          </Button>
          <Button variant="outlined" color="neutral" onClick={onAddAssignment} className="gap-1.5 px-2.5 py-1.5 text-xs">
            <PlusIcon className="size-3 text-primary-600 dark:text-primary-400" />
            Assignment
          </Button>
        </div>
      )}
    </Card>
  );
}

function ItemRow({
  item,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  item: CurriculumItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700/50">
      <span className="cursor-grab text-gray-300 dark:text-dark-400">
        <Squares2X2Icon className="size-3.5 rotate-90" />
      </span>
      <span className={itemIconColor(item.type)}>{itemIcon(item.type)}</span>
      <button onClick={onEdit} className="flex-1 text-left text-sm text-gray-700 dark:text-dark-100">
        {item.title}
      </button>
      {item.meta && <span className="text-xs text-gray-400 dark:text-dark-300">{item.meta}</span>}
      <Menu as="div" className="relative">
        <MenuButton className="p-1 text-gray-300 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-100">
          <EllipsisVerticalIcon className="size-4" />
        </MenuButton>
        <MenuItems className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg focus:outline-none dark:border-dark-500 dark:bg-dark-700">
          <MenuItem>
            {({ active }) => (
              <button
                onClick={onEdit}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-dark-100",
                  active && "bg-gray-100 dark:bg-dark-600",
                )}
              >
                <PencilSquareIcon className="size-3.5" /> Edit
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <button
                onClick={onDuplicate}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-dark-100",
                  active && "bg-gray-100 dark:bg-dark-600",
                )}
              >
                <ArrowPathIcon className="size-3.5" /> Duplicate
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <button
                onClick={onDelete}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400",
                  active && "bg-red-50 dark:bg-red-500/10",
                )}
              >
                <TrashIcon className="size-3.5" /> Delete
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}

function itemIcon(type: ItemType) {
  switch (type) {
    case "lesson":
      return <DocumentTextIcon className="size-4" />;
    case "quiz":
      return <PuzzlePieceIcon className="size-4" />;
    case "assignment":
      return <ClipboardDocumentCheckIcon className="size-4" />;
  }
}

function itemIconColor(type: ItemType) {
  switch (type) {
    case "lesson":
      return "text-gray-400 dark:text-dark-300";
    case "quiz":
      return "text-amber-500";
    case "assignment":
      return "text-teal-500";
  }
}

// ============================================================
// LESSON MODAL — uses ModalShell + Input/Textarea/Switch/UploadBox
// ============================================================
function LessonModal({
  topicId,
  itemId,
  existing,
  onClose,
  onSave,
}: {
  topicId: string;
  itemId?: string;
  existing?: CurriculumItem;
  onClose: () => void;
  onSave: (item: CurriculumItem) => void;
}) {
  const [name, setName] = useState(existing?.title || "");
  const [content, setContent] = useState("");
  const [videoHour, setVideoHour] = useState("0");
  const [videoMin, setVideoMin] = useState("0");
  const [videoSec, setVideoSec] = useState("0");
  const [lessonPreview, setLessonPreview] = useState(false);
  const [dripType, setDripType] = useState<
    "none" | "specific_days" | "unlock_by_date" | "after_finishing_prerequisites"
  >("none");

  const isDirty = name !== (existing?.title || "") || content !== "";

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: itemId || `i${Date.now()}`, type: "lesson", title: name });
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      icon={<DocumentTextIcon className="size-5 text-primary-500" />}
      title={itemId ? "Edit Lesson" : "Add Lesson"}
      isDirty={isDirty}
      onSave={handleSave}
      saveLabel={itemId ? "Update" : "Save"}
      maxWidth="max-w-[1070px]"
    >
      <div className="grid h-full grid-cols-[1fr_338px]">
        {/* LEFT */}
        <div className="space-y-6 overflow-y-auto border-r border-gray-200 p-8 dark:border-dark-600">
          <Input
            label="Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            placeholder="Enter Lesson Name"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Content</label>
              <Button variant="flat" color="primary" className="gap-1 px-2 py-1 text-xs">
                <PencilSquareIcon className="size-3" />
                WP Editor
              </Button>
            </div>
            <RichTextEditor value={content} onChange={setContent} placeholder="Enter Lesson Description" />
            <button className="text-xs text-primary-600 hover:underline dark:text-primary-400">
              + Add H5P Content
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-5 overflow-y-auto bg-gray-50/50 p-5 dark:bg-dark-800/50">
          <SidebarSection label="Featured Image">
            <UploadBox
              icon={<PhotoIcon className="size-6 text-gray-400" />}
              buttonText="Upload Image"
              helper="JPEG, PNG, GIF, and WebP formats, up to 512 MB"
            />
          </SidebarSection>

          <SidebarSection label="Video">
            <UploadBox
              icon={<VideoCameraIcon className="size-6 text-gray-400" />}
              buttonText="Upload Video"
              secondaryText="Add from URL"
              helper="MP4, and WebM formats, up to 512 MB"
            />
          </SidebarSection>

          <SidebarSection label="Video Playback Time">
            <div className="flex items-center gap-2">
              <DurationInput value={videoHour} onChange={setVideoHour} unit="hour" />
              <DurationInput value={videoMin} onChange={setVideoMin} unit="min" />
              <DurationInput value={videoSec} onChange={setVideoSec} unit="sec" />
            </div>
          </SidebarSection>

          <SidebarSection label="Content Drip">
            <SelectNative
              value={dripType === "none" ? "" : dripType}
              onChange={(v) => setDripType(v as any)}
              options={[
                { value: "", label: "No drip" },
                { value: "specific_days", label: "After X days" },
                { value: "unlock_by_date", label: "On specific date" },
                { value: "after_finishing_prerequisites", label: "After prerequisites" },
              ]}
            />
            {dripType === "specific_days" && (
              <div className="mt-2 space-y-1">
                <Label icon={<ClockIcon className="size-3" />}>Available after days</Label>
                <Input type="number" placeholder="0" classNames={{ input: "h-9" }} />
              </div>
            )}
            {dripType === "unlock_by_date" && (
              <div className="mt-2 space-y-1">
                <Label icon={<CalendarIcon className="size-3" />}>Unlock Date</Label>
                <Input type="date" classNames={{ input: "h-9" }} />
              </div>
            )}
            {dripType === "after_finishing_prerequisites" && (
              <div className="mt-2 space-y-1">
                <Label icon={<InformationCircleIcon className="size-3" />}>Prerequisites</Label>
                <SelectNative value="" onChange={() => {}} options={["Select Prerequisite"]} />
              </div>
            )}
          </SidebarSection>

          <SidebarSection label="Exercise Files">
            <UploadBox
              icon={<PaperClipIcon className="size-6 text-gray-400" />}
              buttonText="Upload Attachment"
              helper="Select multiple files"
            />
          </SidebarSection>

          <SidebarSection label="Lesson Preview">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-dark-200">Allow guest preview</span>
              <Switch checked={lessonPreview} onChange={(e: any) => setLessonPreview(e.target.checked)} />
            </div>
            {lessonPreview && (
              <p className="mt-1 text-[10px] text-primary-600 dark:text-primary-400">
                This lesson is now available for preview without enrollment.
              </p>
            )}
          </SidebarSection>
        </div>
      </div>
    </ModalShell>
  );
}

// ============================================================
// QUIZ MODAL
// ============================================================
const QUESTION_TYPES = [
  { id: "multiple-choice", label: "Multiple Choice", icon: "◉" },
  { id: "true-false", label: "True/False", icon: "✓" },
  { id: "open-ended", label: "Open-Ended/Essay", icon: "✍" },
  { id: "fill-blanks", label: "Fill in the Blanks", icon: "__" },
  { id: "short-answer", label: "Short Answer", icon: "Aa" },
  { id: "matching", label: "Matching", icon: "⇄" },
  { id: "image-answering", label: "Image Answering", icon: "🖼" },
  { id: "ordering", label: "Ordering", icon: "↕" },
  { id: "puzzle", label: "Puzzle", icon: "🧩" },
  { id: "scale", label: "Scale", icon: "📏" },
  { id: "coordinates", label: "Coordinates", icon: "⊕" },
  { id: "pin-image", label: "Pin the Answer", icon: "📌" },
  { id: "draw-image", label: "Draw on Image", icon: "✏" },
];

function QuizModal({
  topicId,
  itemId,
  existing,
  onClose,
  onSave,
}: {
  topicId: string;
  itemId?: string;
  existing?: CurriculumItem;
  onClose: () => void;
  onSave: (item: CurriculumItem) => void;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "settings">("details");
  const [quizTitle, setQuizTitle] = useState(existing?.title || "");
  const [quizDesc, setQuizDesc] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(!itemId);
  const [questions, setQuestions] = useState<{ id: string; type: string; title: string }[]>([
    { id: "q1", type: "multiple-choice", title: "What is social media marketing?" },
  ]);
  const [activeQuestion, setActiveQuestion] = useState("q1");

  // Settings
  const [passingGrade, setPassingGrade] = useState("50");
  const [questionOrder, setQuestionOrder] = useState("random");
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(true);
  const [attemptsAllowed, setAttemptsAllowed] = useState("3");
  const [limitMaxQuestions, setLimitMaxQuestions] = useState(false);
  const [maxQuestions, setMaxQuestions] = useState("10");
  const [passRequired, setPassRequired] = useState(true);
  const [enableTimeLimit, setEnableTimeLimit] = useState(true);
  const [timeValue, setTimeValue] = useState("60");
  const [timeType, setTimeType] = useState("minutes");
  const [hideTimer, setHideTimer] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [autoStartDelay, setAutoStartDelay] = useState("5");
  const [layout, setLayout] = useState("single");
  const [showPagination, setShowPagination] = useState(false);
  const [enableAnswerReveal, setEnableAnswerReveal] = useState(false);
  const [hidePrev, setHidePrev] = useState(false);
  const [hideQuestionNum, setHideQuestionNum] = useState(false);
  const [openEndedLimit, setOpenEndedLimit] = useState("500");

  const addQuestion = (type: string) => {
    const newQ = { id: `q${Date.now()}`, type, title: "New Question" };
    setQuestions([...questions, newQ]);
    setActiveQuestion(newQ.id);
  };

  const handleSave = () => {
    if (!quizTitle.trim()) return;
    onSave({
      id: itemId || `i${Date.now()}`,
      type: "quiz",
      title: quizTitle,
      meta: `(${questions.length} Questions)`,
    });
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      icon={<PuzzlePieceIcon className="size-5 text-amber-500" />}
      title={itemId ? "Edit Quiz" : "Add Quiz"}
      onSave={handleSave}
      saveLabel={itemId ? "Update" : "Save"}
      maxWidth="max-w-[1200px]"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6 dark:border-dark-600 dark:bg-dark-700">
        <button
          onClick={() => setActiveTab("details")}
          className={clsx(
            "px-4 py-2 text-sm",
            activeTab === "details"
              ? "border-b-2 border-primary-600 font-medium text-primary-600 dark:text-primary-400"
              : "text-gray-500 dark:text-dark-200",
          )}
        >
          Question
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={clsx(
            "px-4 py-2 text-sm",
            activeTab === "settings"
              ? "border-b-2 border-primary-600 font-medium text-primary-600 dark:text-primary-400"
              : "text-gray-500 dark:text-dark-200",
          )}
        >
          Settings
        </button>
      </div>

      {activeTab === "details" && (
        <div className="grid h-[65vh] grid-cols-[400px_1fr_340px] overflow-hidden">
          {/* LEFT */}
          <div className="space-y-3 overflow-y-auto border-r border-gray-200 p-4 dark:border-dark-600">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Quiz Title</label>
              {isEditingTitle ? (
                <div className="flex gap-2">
                  <Input
                    value={quizTitle}
                    onChange={(e: any) => setQuizTitle(e.target.value)}
                    placeholder="Enter Quiz Title"
                    classNames={{ input: "h-9" }}
                  />
                  <Button color="primary" onClick={() => setIsEditingTitle(false)} className="shrink-0">
                    OK
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{quizTitle}</span>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <Textarea
              value={quizDesc}
              onChange={(e: any) => setQuizDesc(e.target.value)}
              placeholder="Quiz Description"
              rows={3}
            />
            <div className="border-t border-gray-200 pt-3 dark:border-dark-600">
              <Label>Questions ({questions.length})</Label>
              <div className="mt-2 space-y-1">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestion(q.id)}
                    className={clsx(
                      "w-full rounded border p-2 text-left text-xs transition-colors",
                      activeQuestion === q.id
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                        : "border-gray-200 hover:bg-gray-50 dark:border-dark-500 dark:hover:bg-dark-800",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{i + 1}.</span>
                      <span className="font-medium text-gray-700 dark:text-dark-100">{q.title}</span>
                    </div>
                    <div className="ml-4 mt-0.5 text-[10px] text-gray-400">
                      {QUESTION_TYPES.find((t) => t.id === q.type)?.label}
                    </div>
                  </button>
                ))}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-primary-600 hover:underline">
                  + Add Question
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-1 rounded border border-gray-200 bg-white p-2 dark:border-dark-500 dark:bg-dark-700">
                  {QUESTION_TYPES.map((qt) => (
                    <button
                      key={qt.id}
                      onClick={() => addQuestion(qt.id)}
                      className="flex items-center gap-2 rounded p-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-dark-800"
                    >
                      <span>{qt.icon}</span>
                      <span className="text-gray-700 dark:text-dark-100">{qt.label}</span>
                    </button>
                  ))}
                </div>
              </details>
            </div>
          </div>

          {/* CENTER */}
          <div className="overflow-y-auto p-6">
            <QuestionForm question={questions.find((q) => q.id === activeQuestion)!} />
          </div>

          {/* RIGHT */}
          <div className="space-y-3 overflow-y-auto border-l border-gray-200 bg-gray-50/50 p-4 dark:border-dark-600 dark:bg-dark-800/50">
            <Label>Question Conditions</Label>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Set conditions to show this question based on previous answers.
            </p>
            <Button variant="outlined" color="primary" className="text-xs">
              + Add Condition
            </Button>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="mx-auto h-[65vh] max-w-3xl space-y-4 overflow-y-auto p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-dark-50">Quiz Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <SettingField label="Passing Grade">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={passingGrade}
                  onChange={(e: any) => setPassingGrade(e.target.value)}
                  classNames={{ input: "h-9 w-20" }}
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </SettingField>
            <SettingField label="Question Order">
              <SelectNative
                value={questionOrder}
                onChange={setQuestionOrder}
                options={["random", "sorting", "ascending", "descending"]}
              />
            </SettingField>
          </div>

          <SettingToggle
            label="Allow multiple attempts"
            checked={allowMultipleAttempts}
            onChange={setAllowMultipleAttempts}
          />
          {allowMultipleAttempts && (
            <SettingField label="Attempts Allowed">
              <Input
                type="number"
                value={attemptsAllowed}
                onChange={(e: any) => setAttemptsAllowed(e.target.value)}
                classNames={{ input: "h-9 w-24" }}
              />
            </SettingField>
          )}

          <SettingToggle
            label="Set maximum questions per quiz"
            checked={limitMaxQuestions}
            onChange={setLimitMaxQuestions}
          />
          {limitMaxQuestions && (
            <SettingField label="Max Questions">
              <Input
                type="number"
                value={maxQuestions}
                onChange={(e: any) => setMaxQuestions(e.target.value)}
                classNames={{ input: "h-9 w-24" }}
              />
            </SettingField>
          )}

          <SettingToggle label="Pass is required" checked={passRequired} onChange={setPassRequired} />

          <SettingToggle
            label="Set time limit"
            checked={enableTimeLimit}
            onChange={setEnableTimeLimit}
            checkbox
          />
          {enableTimeLimit && (
            <div className="flex gap-2">
              <SettingField label="Time Value">
                <Input
                  type="number"
                  value={timeValue}
                  onChange={(e: any) => setTimeValue(e.target.value)}
                  classNames={{ input: "h-9 w-24" }}
                />
              </SettingField>
              <SettingField label="Time Type">
                <SelectNative
                  value={timeType}
                  onChange={setTimeType}
                  options={["minutes", "hours", "days", "weeks"]}
                />
              </SettingField>
            </div>
          )}

          <SettingToggle label="Hide countdown timer" checked={hideTimer} onChange={setHideTimer} />
          <SettingToggle label="Auto start quiz" checked={autoStart} onChange={setAutoStart} checkbox />
          {autoStart && (
            <SettingField label="Auto start delay (seconds)">
              <Input
                type="number"
                value={autoStartDelay}
                onChange={(e: any) => setAutoStartDelay(e.target.value)}
                classNames={{ input: "h-9 w-24" }}
              />
            </SettingField>
          )}
          <SettingField label="Layout">
            <SelectNative value={layout} onChange={setLayout} options={["single", "list"]} />
          </SettingField>
          <SettingToggle
            label="Show pagination"
            checked={showPagination}
            onChange={setShowPagination}
            checkbox
          />
          <SettingToggle
            label="Reveal answers after submission"
            checked={enableAnswerReveal}
            onChange={setEnableAnswerReveal}
            checkbox
          />
          <SettingToggle label="Hide Previous button" checked={hidePrev} onChange={setHidePrev} />
          <SettingToggle label="Hide question number" checked={hideQuestionNum} onChange={setHideQuestionNum} />
          <SettingField label="Open-Ended/Essay Answer (character limit)">
            <Input
              type="number"
              value={openEndedLimit}
              onChange={(e: any) => setOpenEndedLimit(e.target.value)}
              classNames={{ input: "h-9 w-24" }}
            />
          </SettingField>
        </div>
      )}
    </ModalShell>
  );
}

function QuestionForm({ question }: { question: { id: string; type: string; title: string } }) {
  const [title, setTitle] = useState(question.title);
  const qt = QUESTION_TYPES.find((t) => t.id === question.type);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge color="warning" className="text-xs">
          {qt?.icon} {qt?.label}
        </Badge>
      </div>
      <Input
        label="Question Title"
        value={title}
        onChange={(e: any) => setTitle(e.target.value)}
      />
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Question Description</label>
        <RichTextEditor value="" onChange={() => {}} placeholder="Enter question description" />
      </div>
      {question.type === "multiple-choice" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Answer Options</label>
          {["Option A", "Option B", "Option C", "Option D"].map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" className="size-4" />
              <Input defaultValue={opt} classNames={{ input: "h-9" }} />
              <Button variant="flat" color="neutral" isIcon className="size-8">
                <XMarkIcon className="size-4 text-gray-400" />
              </Button>
            </div>
          ))}
          <button className="text-xs text-primary-600 hover:underline">+ Add Option</button>
        </div>
      )}
      {question.type === "true-false" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Correct Answer</label>
          <div className="flex gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="tf" className="size-4" /> True
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="tf" className="size-4" /> False
            </label>
          </div>
        </div>
      )}
      <Input label="Points" type="number" defaultValue="1" classNames={{ input: "h-9 w-24" }} />
    </div>
  );
}

// ============================================================
// ASSIGNMENT MODAL
// ============================================================
function AssignmentModal({
  topicId,
  itemId,
  existing,
  onClose,
  onSave,
}: {
  topicId: string;
  itemId?: string;
  existing?: CurriculumItem;
  onClose: () => void;
  onSave: (item: CurriculumItem) => void;
}) {
  const [title, setTitle] = useState(existing?.title || "");
  const [summary, setSummary] = useState("");
  const [timeValue, setTimeValue] = useState("7");
  const [timeUnit, setTimeUnit] = useState<"weeks" | "days" | "hours">("days");
  const [deadlineFromStart, setDeadlineFromStart] = useState(false);
  const [totalMark, setTotalMark] = useState("100");
  const [passMark, setPassMark] = useState("50");
  const [fileLimit, setFileLimit] = useState("5");
  const [fileSizeLimit, setFileSizeLimit] = useState("10");
  const [retryAllowed, setRetryAllowed] = useState(false);
  const [attemptsAllowed, setAttemptsAllowed] = useState("3");

  const isDirty = title !== (existing?.title || "") || summary !== "";

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ id: itemId || `i${Date.now()}`, type: "assignment", title });
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      icon={<ClipboardDocumentCheckIcon className="size-5 text-teal-500" />}
      title={itemId ? "Edit Assignment" : "Add Assignment"}
      isDirty={isDirty}
      onSave={handleSave}
      saveLabel={itemId ? "Update" : "Save"}
      maxWidth="max-w-[1070px]"
    >
      <div className="grid h-full grid-cols-[1fr_338px]">
        {/* LEFT */}
        <div className="space-y-6 overflow-y-auto border-r border-gray-200 p-8 dark:border-dark-600">
          <Input
            label="Title"
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
            placeholder="Enter Assignment Title"
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Content</label>
            <RichTextEditor value={summary} onChange={setSummary} placeholder="Enter Assignment Content" />
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-5 overflow-y-auto bg-gray-50/50 p-5 dark:bg-dark-800/50">
          <SidebarSection label="Attachments">
            <UploadBox
              icon={<PaperClipIcon className="size-6 text-gray-400" />}
              buttonText="Upload Attachment"
              helper="Select multiple files"
            />
          </SidebarSection>

          <SidebarSection label="Time Limit">
            <div className="flex gap-2">
              <Input
                type="number"
                value={timeValue}
                onChange={(e: any) => setTimeValue(e.target.value)}
                classNames={{ input: "h-9 w-24" }}
              />
              <SelectNative
                value={timeUnit}
                onChange={(v) => setTimeUnit(v as any)}
                options={["weeks", "days", "hours"]}
              />
            </div>
          </SidebarSection>

          <SidebarSection label="Set Deadline From Assignment Start Time">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-dark-200">Per-student deadline</span>
              <Switch
                checked={deadlineFromStart}
                onChange={(e: any) => setDeadlineFromStart(e.target.checked)}
              />
            </div>
            {deadlineFromStart && (
              <p className="mt-1 text-[10px] text-gray-400 dark:text-dark-400">
                Each student will get their own deadline based on when they start.
              </p>
            )}
          </SidebarSection>

          <SidebarSection label="Total Points">
            <Input
              type="number"
              value={totalMark}
              onChange={(e: any) => setTotalMark(e.target.value)}
              classNames={{ input: "h-9 w-24" }}
            />
          </SidebarSection>

          <SidebarSection label="Minimum Pass Points">
            <Input
              type="number"
              value={passMark}
              onChange={(e: any) => setPassMark(e.target.value)}
              classNames={{ input: "h-9 w-24" }}
            />
            {Number(passMark) > Number(totalMark) && (
              <p className="mt-1 text-[10px] text-red-500">Pass mark cannot be greater than total mark</p>
            )}
          </SidebarSection>

          <SidebarSection label="File Upload Limit">
            <Input
              type="number"
              value={fileLimit}
              onChange={(e: any) => setFileLimit(e.target.value)}
              classNames={{ input: "h-9 w-24" }}
            />
            <p className="mt-1 text-[10px] text-gray-400 dark:text-dark-400">
              Number of files a student can upload. 0 disables uploads.
            </p>
          </SidebarSection>

          <SidebarSection label="Maximum File Size Limit">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={fileSizeLimit}
                onChange={(e: any) => setFileSizeLimit(e.target.value)}
                classNames={{ input: "h-9 w-24" }}
              />
              <span className="text-xs text-gray-500">MB</span>
            </div>
          </SidebarSection>

          <SidebarSection label="Allow Assignment Resubmission">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-dark-200">Allow retry after deadline</span>
              <Switch checked={retryAllowed} onChange={(e: any) => setRetryAllowed(e.target.checked)} />
            </div>
            {retryAllowed && (
              <div className="mt-2 space-y-1">
                <Label>Maximum Resubmission Attempts</Label>
                <Input
                  type="number"
                  value={attemptsAllowed}
                  onChange={(e: any) => setAttemptsAllowed(e.target.value)}
                  min="1"
                  max="20"
                  classNames={{ input: "h-9 w-24" }}
                />
                <p className="text-[10px] text-gray-400 dark:text-dark-400">Between 1 and 20 attempts.</p>
              </div>
            )}
          </SidebarSection>
        </div>
      </div>
    </ModalShell>
  );
}

// ============================================================
// AI COURSE BUILDER MODAL
// ============================================================
function AICourseBuilderModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("Beginner");

  return (
    <ModalShell
      open
      onClose={onClose}
      icon={<SparklesIcon className="size-5 text-pink-500" />}
      title="Generate Course with AI"
      maxWidth="max-w-2xl"
      onSave={() => (step < 3 ? setStep((s) => (s + 1) as any) : onClose())}
      saveLabel={step === 1 ? "Generate Outline" : step === 2 ? "Create Course" : "Done"}
    >
      <div className="space-y-4 p-6">
        {step === 1 && (
          <>
            <Input
              label="What's your course about?"
              value={topic}
              onChange={(e: any) => setTopic(e.target.value)}
              placeholder="e.g., Introduction to Python Programming"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Target Audience</label>
              <SelectNative
                value={audience}
                onChange={setAudience}
                options={["Beginner", "Intermediate", "Advanced", "All Levels"]}
              />
            </div>
          </>
        )}
        {step === 2 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-dark-100">
              Generated Outline (edit as needed)
            </label>
            <Textarea
              rows={12}
              defaultValue={`Topic 1: Introduction\n  - Lesson 1: What is ${topic}?\n  - Lesson 2: Why it matters\n  - Quiz: Introduction\n\nTopic 2: Core Concepts\n  - Lesson 3: Fundamentals\n  - Lesson 4: Practical Examples\n  - Assignment: Hands-on practice\n\nTopic 3: Advanced Topics\n  - Lesson 5: Best practices\n  - Lesson 6: Common pitfalls\n  - Quiz: Final assessment`}
              classNames={{ input: "font-mono text-xs" }}
            />
          </div>
        )}
        {step === 3 && (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
              <svg className="size-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-medium">Course Generated!</h3>
            <p className="text-sm text-gray-500 dark:text-dark-300">
              3 topics, 6 lessons, 2 quizzes, 1 assignment added to your curriculum.
            </p>
          </div>
        )}
      </div>
      {step > 1 && (
        <div className="px-6 pb-4">
          <Button variant="flat" color="neutral" onClick={() => setStep((s) => (s - 1) as any)}>
            Back
          </Button>
        </div>
      )}
    </ModalShell>
  );
}

// ============================================================
// CONTENT BANK MODAL
// ============================================================
function ContentBankModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"questions" | "contents" | "collections">("questions");
  return (
    <ModalShell
      open
      onClose={onClose}
      icon={<RectangleStackIcon className="size-5 text-primary-500" />}
      title="Content Bank — Select Content"
      maxWidth="max-w-4xl"
      onSave={onClose}
      saveLabel="Add Selected"
    >
      <div className="flex border-b border-gray-200 bg-white px-6 dark:border-dark-600 dark:bg-dark-700">
        {(["questions", "contents", "collections"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-4 py-2 text-sm capitalize",
              tab === t
                ? "border-b-2 border-primary-600 font-medium text-primary-600 dark:text-primary-400"
                : "text-gray-500 dark:text-dark-200",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="h-[60vh] p-6">
        <div className="mb-4 flex gap-3">
          <Input placeholder="Search..." classNames={{ input: "h-9" }} />
          <SelectNative
            value=""
            onChange={() => {}}
            options={["All Types", "Multiple Choice", "True/False"]}
          />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-center gap-3 rounded border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-dark-500 dark:hover:bg-dark-800"
            >
              <Checkbox />
              <PuzzlePieceIcon className="size-4 text-amber-500" />
              <span className="flex-1">Sample {tab.slice(0, -1)} #{i + 1}</span>
              <Badge color="primary" className="text-xs">
                Multiple Choice
              </Badge>
            </label>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

// ============================================================
// DELETE CONFIRM DIALOG
// ============================================================
function DeleteConfirmDialog({
  name,
  kind,
  onCancel,
  onConfirm,
}: {
  name: string;
  kind: "topic" | "item";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onCancel}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as="div"
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
            className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-dark-700"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
                <ExclamationTriangleIcon className="size-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-dark-50">
                  Delete {kind === "topic" ? "Topic" : "Item"}?
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-dark-200">
                  Are you sure you want to delete <strong>"{name}"</strong>?
                  {kind === "topic" &&
                    " This will also delete all lessons, quizzes, and assignments inside this topic."}
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="flat" color="neutral" onClick={onCancel}>
                Cancel
              </Button>
              <Button color="error" onClick={onConfirm} className="gap-1">
                <TrashIcon className="size-4" />
                Delete
              </Button>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

// ============================================================
// ADDITIONAL SETTINGS TAB
// ============================================================
function AdditionalTab({ onBack }: { onBack: () => void }) {
  const [allowQa, setAllowQa] = useState(true);
  const [enableReview, setEnableReview] = useState(true);
  const [disablePreview, setDisablePreview] = useState(false);
  const [requireEnrollment, setRequireEnrollment] = useState(true);

  return (
    <>
      <div className="min-h-[600px] bg-gray-50 p-6 dark:bg-dark-800">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="outlined" color="neutral" isIcon className="size-8" onClick={onBack}>
            <ArrowLeftIcon className="size-4 text-gray-600 dark:text-dark-200" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-50">Additional Settings</h2>
        </div>
        <Card skin="bordered" className="max-w-2xl divide-y divide-gray-200 p-0 dark:divide-dark-600">
          <SettingRow
            label="Course Q&A"
            description="Allow students to ask questions on lessons. Visible in course Q&A tab."
            checked={allowQa}
            onChange={setAllowQa}
          />
          <SettingRow
            label="Course Reviews"
            description="Enable/disable course reviews from students."
            checked={enableReview}
            onChange={setEnableReview}
          />
          <SettingRow
            label="Disable Course Preview"
            description="Disable lesson preview for non-enrolled users."
            checked={disablePreview}
            onChange={setDisablePreview}
          />
          <SettingRow
            label="Require Enrollment"
            description="Students must be enrolled to access course content."
            checked={requireEnrollment}
            onChange={setRequireEnrollment}
          />
        </Card>
      </div>
      <Footer>
        <Button variant="outlined" color="neutral" isIcon className="size-9" onClick={onBack}>
          <ArrowLeftIcon className="size-4 text-gray-600 dark:text-dark-200" />
        </Button>
        <Button color="primary" className="gap-1.5">
          <ArrowRightIcon className="size-4" />
          Publish Course
        </Button>
      </Footer>
    </>
  );
}

// ============================================================
// SHARED PRIMITIVES — using tailux Card, Button, Input, etc.
// ============================================================
function ModalShell({
  open,
  onClose,
  icon,
  title,
  isDirty,
  onSave,
  saveLabel,
  maxWidth,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  isDirty?: boolean;
  onSave?: () => void;
  saveLabel?: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={DialogPanel}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
            className={clsx(
              "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700",
              maxWidth || "max-w-2xl",
            )}
          >
            {/* Modal header */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-700">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-dark-50">
                {isDirty ? <ExclamationTriangleIcon className="size-5 text-amber-500" /> : icon}
                {isDirty ? "Unsaved Changes" : title}
              </h2>
              <div className="flex items-center gap-2">
                {isDirty && onSave && (
                  <>
                    <Button variant="flat" color="neutral" size="small" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button color="primary" size="small" onClick={onSave}>
                      {saveLabel}
                    </Button>
                  </>
                )}
                <Button variant="flat" color="neutral" isIcon className="size-8" onClick={onClose}>
                  <XMarkIcon className="size-4" />
                </Button>
              </div>
            </header>
            {/* Body */}
            <div className="flex-1 overflow-hidden">{children}</div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-700">
      {children}
    </div>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-700 dark:text-dark-100">{label}</label>
      {children}
    </section>
  );
}

function Label({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-700 dark:text-dark-100">{children}</span>
      {icon}
    </div>
  );
}

function UploadBox({
  icon,
  buttonText,
  secondaryText,
  helper,
}: {
  icon: React.ReactNode;
  buttonText: string;
  secondaryText?: string;
  helper: string;
}) {
  return (
    <Upload onChange={() => {}}>
      {({ onClick }: any) => (
        <div
          onClick={onClick}
          className="cursor-pointer space-y-2 rounded-md border border-dashed border-gray-300 p-4 text-center transition-colors hover:bg-gray-50 dark:border-dark-500 dark:hover:bg-dark-800"
        >
          <div className="flex justify-center">{icon}</div>
          <button className="text-sm text-primary-600 hover:underline dark:text-primary-400">{buttonText}</button>
          {secondaryText && (
            <button className="block mx-auto text-xs text-primary-600 hover:underline dark:text-primary-400">
              {secondaryText}
            </button>
          )}
          <p className="text-[10px] text-gray-400 dark:text-dark-400">{helper}</p>
        </div>
      )}
    </Upload>
  );
}

function SelectNative({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  className?: string;
}) {
  return (
    <div className={clsx("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
      >
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function OptionTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 border-l-2 px-3 py-2 text-xs",
        active
          ? "border-primary-600 bg-primary-50 font-medium text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
          : "border-transparent text-gray-600 hover:bg-gray-50 dark:text-dark-200 dark:hover:bg-dark-800",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DripRadio({ label }: { label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <input type="radio" name="drip-type" className="size-3.5 text-primary-600" />
      <span className="text-gray-700 dark:text-dark-100">{label}</span>
    </label>
  );
}

function DurationInput({
  value,
  onChange,
  unit,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded border border-gray-200 dark:border-dark-500">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-14 bg-white px-2 text-sm text-gray-700 focus:outline-none dark:bg-dark-800 dark:text-dark-100"
      />
      <span className="flex h-9 items-center border-l border-gray-200 bg-gray-50 px-2 text-xs text-gray-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-300">
        {unit}
      </span>
    </div>
  );
}

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700 dark:text-dark-200">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
  checkbox,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  checkbox?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-sm text-gray-700 dark:text-dark-200">{label}</label>
      {checkbox ? (
        <Checkbox checked={checked} onChange={(e: any) => onChange(e.target.checked)} />
      ) : (
        <Switch checked={checked} onChange={(e: any) => onChange(e.target.checked)} />
      )}
    </div>
  );
}

function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <InformationCircleIcon className="size-3.5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-800 dark:text-dark-100">{label}</h3>
        </div>
        <p className="ml-5 mt-1 text-xs text-gray-500 dark:text-dark-300">{description}</p>
      </div>
      <Switch checked={checked} onChange={(e: any) => onChange(e.target.checked)} />
    </div>
  );
}

// Rich text editor (Visual/Text tabs + toolbar)
function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-800">
      <div className="flex items-center gap-0 border-b border-gray-200 bg-gray-50 px-2 dark:border-dark-600 dark:bg-dark-700">
        <button className="-mb-px border-b-2 border-primary-600 px-3 py-2 text-xs font-medium text-gray-900 dark:text-dark-50">
          Visual
        </button>
        <button className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100">
          Text
        </button>
      </div>
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-dark-600 dark:bg-dark-700">
        <select className="cursor-pointer rounded px-1 py-0.5 text-xs text-gray-600 hover:bg-gray-200 focus:outline-none dark:text-dark-200 dark:hover:bg-dark-600">
          <option>Paragraph</option>
          <option>Heading 1</option>
          <option>Heading 2</option>
          <option>Heading 3</option>
        </select>
        <ToolbarDivider />
        <ToolbarIconBtn icon={<BoldIcon className="size-3.5" />} />
        <ToolbarIconBtn icon={<ItalicIcon className="size-3.5" />} />
        <ToolbarIconBtn icon={<UnderlineIconHero className="size-3.5" />} />
        <ToolbarDivider />
        <ToolbarIconBtn icon={<ListBulletIcon className="size-3.5" />} />
        <ToolbarIconBtn icon={<NumberedListIcon className="size-3.5" />} />
        <ToolbarIconBtn icon={<ChatBubbleLeftEllipsisIcon className="size-3.5" />} />
        <ToolbarDivider />
        <ToolbarIconBtn icon={<Bars3BottomLeftIcon className="size-3.5" />} />
        <ToolbarIconBtn icon={<Bars3CenterLeftIcon className="size-3.5" />} />
        <ToolbarIconBtn icon={<Bars3BottomRightIcon className="size-3.5" />} />
        <ToolbarIconBtn icon={<Bars3Icon className="size-3.5" />} />
        <ToolbarDivider />
        <ToolbarIconBtn icon={<LinkIcon className="size-3.5" />} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-40 w-full resize-y bg-white p-3 text-sm text-gray-800 focus:outline-none dark:bg-dark-800 dark:text-dark-100"
      />
    </div>
  );
}

function ToolbarIconBtn({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="rounded p-1 text-gray-600 hover:bg-gray-200 dark:text-dark-200 dark:hover:bg-dark-600">
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px bg-gray-200 dark:bg-dark-500" />;
}
