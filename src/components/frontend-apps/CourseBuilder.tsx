'use client'

// ============================================================
// COMPLETE COURSE BUILDER — ported from real Tutor LMS source
// Source: /home/z/my-project/repos/tutor/assets/src/js/v3/entries/course-builder/
//
// MODALS IMPLEMENTED (matching real Tutor LMS source code):
//   1. LessonModal  (760 lines source) — Name + Content + sidebar (Featured Image, Video, Duration, Content Drip, Exercise Files, Lesson Preview)
//   2. QuizModal    (577 lines source) — 3-column with Details/Settings tabs, 13 question types, full QuizSettings sidebar
//   3. AssignmentModal (618 lines source) — Title + Content + sidebar (Attachments, Time Limit, Points, File limits, Resubmission)
//   4. AICourseBuilderModal — AI generation wizard
//   5. QuestionPreviewModal — preview any question type
//   6. ContentBankContentSelectModal — content bank picker
//   7. DeleteConfirmPopover — confirmation popover for delete actions
//   8. TopicEditor (inline) — topic title + summary inline editor
//
// USER FLOW (matching Cypress tests 01-07):
//   1. Open course builder (3-step wizard: Basics → Curriculum → Additional)
//   2. Basics tab: title, description, options, sidebar metadata
//   3. Curriculum tab: Add Topic → Add Lesson/Quiz/Assignment → Edit/Duplicate/Delete
//   4. Additional tab: Q&A, Reviews, Preview, Enrollment toggles
//   5. Publish
// ============================================================

import { useState } from 'react'
import {
  GraduationCap, Sparkles, CloudUpload, ChevronDown, X, ArrowLeft, ArrowRight,
  Info, Eye, Image as ImageIcon, Film, Plus, Search, Link as LinkIcon,
  Bold, Italic, Underline, List, ListOrdered, Quote, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Strikethrough, Code, Table, Minus,
  GripVertical, MoreVertical, FileText, Puzzle, ClipboardCheck,
  Settings, Clock, User, LayoutGrid, AlertTriangle, Copy, Trash2, Pencil,
  Video, Paperclip, Eye as EyeIcon, CheckCircle2, ChevronRight, Wand2,
  FileQuestion, ImagePlus, FileUp, Calendar, Repeat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

type Step = 1 | 2 | 3

// ============================================================
// MAIN COURSE BUILDER
// ============================================================
export function CourseBuilder({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [title, setTitle] = useState('New Course')
  const [description, setDescription] = useState('')
  // Curriculum state shared with CurriculumTab
  const [topics, setTopics] = useState<Topic[]>([
    {
      id: 't1', title: 'Introduction to Social Media Marketing', summary: '', expanded: true,
      items: [
        { id: 'i1', type: 'lesson', title: 'What is Social Media Marketing?' },
        { id: 'i2', type: 'quiz', title: 'Introduction Quiz', meta: '(5 Questions)' },
        { id: 'i3', type: 'assignment', title: 'Set up your social media accounts' },
      ],
    },
  ])

  return (
    <div className="fixed inset-0 z-50 bg-[#8da4ff] dark:bg-[#3f4d8a] overflow-auto">
      <div className="min-h-full p-4 sm:p-8 flex items-start justify-center">
        <div className="w-full max-w-[1280px] bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative my-4">
          <Header step={step} setStep={setStep} onExit={onExit} />

          {step === 1 && <BasicTab title={title} setTitle={setTitle} description={description} setDescription={setDescription} onNext={() => setStep(2)} />}
          {step === 2 && <CurriculumTab topics={topics} setTopics={setTopics} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
          {step === 3 && <AdditionalSettingsTab onBack={() => setStep(2)} />}

          {/* Notebook vertical tab */}
          <button
            className="absolute top-1/2 -right-3 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-r-md py-3 px-1 shadow-md hover:bg-gray-50 dark:hover:bg-zinc-700"
            title="Open Notebook"
          >
            <span className="text-xs font-bold text-gray-700 dark:text-zinc-100 tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              📒 Notebook
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function Header({ step, setStep, onExit }: { step: Step; setStep: (s: Step) => void; onExit: () => void }) {
  const [showAIModal, setShowAIModal] = useState(false)
  return (
    <>
      <header className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 dark:border-zinc-700">
        <div className="flex items-center gap-2 shrink-0">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-gray-800 dark:text-zinc-100 text-lg leading-none">tutor <span className="font-light">LMS</span></span>
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 mx-1" />
        <span className="text-sm font-medium text-gray-700 dark:text-zinc-100 shrink-0">Course Builder</span>
        <div className="flex items-center gap-2 ml-2">
          <StepIndicator n={1} label="Basics" active={step === 1} onClick={() => setStep(1)} />
          <span className="text-gray-300 dark:text-zinc-600">—</span>
          <StepIndicator n={2} label="Curriculum" active={step === 2} onClick={() => setStep(2)} />
          <span className="text-gray-300 dark:text-zinc-600">—</span>
          <StepIndicator n={3} label="Additional" active={step === 3} onClick={() => setStep(3)} />
        </div>
        <button onClick={() => setShowAIModal(true)} className="ml-auto flex items-center gap-1.5 text-sm font-medium text-pink-600 dark:text-pink-400 hover:text-pink-700">
          <Sparkles className="w-4 h-4" /> Generate with AI
        </button>
        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 mx-1" />
        <button className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-1.5 rounded-md">
          <CloudUpload className="w-4 h-4" /> Save as Draft
        </button>
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-md">
          Publish <ChevronDown className="w-4 h-4" />
        </button>
        <button onClick={onExit} className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-100 p-1" title="Exit">
          <X className="w-5 h-5" />
        </button>
      </header>
      {showAIModal && <AICourseBuilderModal onClose={() => setShowAIModal(false)} />}
    </>
  )
}

function StepIndicator({ n, label, active, onClick }: { n: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 group">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-zinc-600 text-gray-500 dark:text-zinc-300 group-hover:bg-gray-300'}`}>{n}</span>
      <span className={`text-xs ${active ? 'text-gray-900 dark:text-zinc-50 font-medium' : 'text-gray-500 dark:text-zinc-300'}`}>{label}</span>
    </button>
  )
}

// ============================================================
// BASIC TAB
// ============================================================
function BasicTab({ title, setTitle, description, setDescription, onNext }: {
  title: string; setTitle: (t: string) => void; description: string; setDescription: (d: string) => void; onNext: () => void
}) {
  const [optionTab, setOptionTab] = useState<'general' | 'content-drip'>('general')
  const [maxStudents, setMaxStudents] = useState('0')
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [isPublic, setIsPublic] = useState(false)
  const [schedule, setSchedule] = useState(false)
  const [pricing, setPricing] = useState<'free' | 'paid'>('free')

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] divide-x divide-gray-100 dark:divide-zinc-700">
        <div className="p-8 bg-[#f9fafb] dark:bg-zinc-900 space-y-6">
          <section className="space-y-2">
            <Label icon={<Sparkles className="w-3.5 h-3.5 text-pink-500" />}>Title</Label>
            <div className="relative">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-11 px-3 pr-9 border border-gray-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              {title && <button onClick={() => setTitle('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-4 h-4" /></button>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Course URL:</span>
              <a className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                https://tutor.hellotutorlms.com/courses/{title.toLowerCase().replace(/\s+/g, '-')}
                <LinkIcon className="w-3 h-3" />
              </a>
            </div>
          </section>

          <section className="space-y-2">
            <Label icon={<Sparkles className="w-3.5 h-3.5 text-pink-500" />}>Description</Label>
            <button className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500/40 px-2 py-1 rounded hover:bg-blue-50">
              <ImageIcon className="w-3.5 h-3.5" /> Add media
            </button>
            <RichTextEditor value={description} onChange={setDescription} />
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-50">Options</h3>
            <div className="grid grid-cols-[140px_1fr] border border-gray-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 overflow-hidden">
              <nav className="border-r border-gray-100 dark:border-zinc-700 py-2">
                <OptionTabButton active={optionTab === 'general'} onClick={() => setOptionTab('general')} icon={<Settings className="w-3.5 h-3.5" />}>General</OptionTabButton>
                <OptionTabButton active={optionTab === 'content-drip'} onClick={() => setOptionTab('content-drip')} icon={<Clock className="w-3.5 h-3.5" />}>Content Drip</OptionTabButton>
              </nav>
              <div className="p-4 space-y-4">
                {optionTab === 'general' && (
                  <>
                    <Field label="Maximum Students"><input type="number" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" /></Field>
                    <Field label="Difficulty Level">
                      <Select value={difficulty} onChange={setDifficulty} options={['All Levels', 'Beginner', 'Intermediate', 'Expert']} />
                    </Field>
                    <Field label="Public Course"><Toggle checked={isPublic} onChange={setIsPublic} /></Field>
                  </>
                )}
                {optionTab === 'content-drip' && (
                  <div className="text-xs text-gray-500 space-y-2">
                    <DripRadio label="Unlock on a specific date" />
                    <DripRadio label="Unlock X days after enrollment" />
                    <DripRadio label="Unlock after completing previous lesson" />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="p-6 bg-white dark:bg-zinc-800 space-y-5">
          <SidebarSection label="Visibility">
            <div className="relative">
              <select className="w-full h-9 pl-9 pr-8 border border-gray-200 dark:border-zinc-600 rounded text-sm appearance-none bg-white dark:bg-zinc-900">
                <option>Public</option><option>Private</option><option>Password protected</option>
              </select>
              <Eye className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Last updated on 27th November, 2024</p>
          </SidebarSection>
          <SidebarSection label="Schedule">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Schedule course launch</span>
              <Toggle checked={schedule} onChange={setSchedule} />
            </div>
          </SidebarSection>
          <SidebarSection label="Featured Image" aiIcon>
            <UploadBox icon={<ImageIcon className="w-6 h-6 text-gray-400" />} buttonText="Upload Thumbnail" helper="JPEG, PNG, GIF, and WebP formats, up to 512 MB" />
          </SidebarSection>
          <SidebarSection label="Intro Video">
            <UploadBox icon={<Film className="w-6 h-6 text-gray-400" />} buttonText="Upload Video" secondaryText="Add from URL" helper="MP4, and WebM formats, up to 512 MB" />
          </SidebarSection>
          <SidebarSection label="Pricing Model">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={pricing === 'free'} onChange={() => setPricing('free')} className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700 dark:text-zinc-100">Free</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={pricing === 'paid'} onChange={() => setPricing('paid')} className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700 dark:text-zinc-100">Paid</span>
              </label>
            </div>
          </SidebarSection>
          <SidebarSection label="Categories">
            <button className="w-full h-9 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm text-left text-gray-500 flex items-center gap-2 hover:bg-gray-50">
              <Plus className="w-4 h-4 text-blue-600" /> Add
            </button>
          </SidebarSection>
          <SidebarSection label="Tags">
            <input type="text" placeholder="Add tags" className="w-full h-9 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
          </SidebarSection>
          <SidebarSection label="Author">
            <button className="w-full flex items-center gap-2 p-2 border border-gray-200 dark:border-zinc-600 rounded hover:bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-4 h-4 text-gray-500" /></div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-zinc-100">tutor</div>
                <div className="text-[10px] text-gray-500 truncate">admin@tutor.hellotutorlms.com</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </SidebarSection>
          <SidebarSection label="Instructors">
            <div className="relative">
              <input type="text" placeholder="Search to add instructor" className="w-full h-9 pl-9 pr-3 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </SidebarSection>
        </aside>
      </div>
      <Footer>
        <Button variant="outline" onClick={onNext} className="flex items-center gap-1.5">Next <ArrowRight className="w-4 h-4" /></Button>
      </Footer>
    </>
  )
}

// ============================================================
// CURRICULUM TAB — with all 3 content modals wired up
// ============================================================
type Item = { id: string; type: 'lesson' | 'quiz' | 'assignment'; title: string; meta?: string }
type Topic = { id: string; title: string; summary: string; expanded?: boolean; items: Item[] }

function CurriculumTab({ topics, setTopics, onBack, onNext }: {
  topics: Topic[]; setTopics: (t: Topic[]) => void; onBack: () => void; onNext: () => void
}) {
  const [modal, setModal] = useState<{ type: 'lesson' | 'quiz' | 'assignment'; topicId: string; itemId?: string } | null>(null)
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'topic' | 'item'; topicId: string; itemId?: string; name: string } | null>(null)
  const [showContentBank, setShowContentBank] = useState(false)

  const toggleExpand = (id: string) => setTopics(topics.map((t) => t.id === id ? { ...t, expanded: !t.expanded } : t))
  const expandAll = () => setTopics(topics.map((t) => ({ ...t, expanded: true })))

  const addTopic = () => {
    const newId = `t${Date.now()}`
    setTopics([...topics, { id: newId, title: 'New Topic', summary: '', expanded: true, items: [] }])
    setEditingTopic(newId)
  }

  const updateTopic = (id: string, patch: Partial<Topic>) =>
    setTopics(topics.map((t) => t.id === id ? { ...t, ...patch } : t))

  const deleteTopic = (id: string) => setTopics(topics.filter((t) => t.id !== id))

  const addItem = (topicId: string, type: Item['type']) => setModal({ type, topicId })

  const saveItem = (topicId: string, item: Item) => {
    setTopics(topics.map((t) => t.id === topicId ? { ...t, items: [...t.items, item] } : t))
    setModal(null)
  }

  const updateItem = (topicId: string, itemId: string, patch: Partial<Item>) =>
    setTopics(topics.map((t) => t.id === topicId ? { ...t, items: t.items.map((i) => i.id === itemId ? { ...i, ...patch } : i) } : t))

  const deleteItem = (topicId: string, itemId: string) =>
    setTopics(topics.map((t) => t.id === topicId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t))

  const duplicateItem = (topicId: string, itemId: string) => {
    setTopics(topics.map((t) => {
      if (t.id !== topicId) return t
      const orig = t.items.find((i) => i.id === itemId)
      if (!orig) return t
      return { ...t, items: [...t.items, { ...orig, id: `i${Date.now()}`, title: `${orig.title} (copy)` }] }
    }))
  }

  return (
    <>
      <div className="p-6 bg-[#f9fafb] dark:bg-zinc-900 min-h-[600px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-100"><ArrowLeft className="w-4 h-4 text-gray-600" /></button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Curriculum</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowContentBank(true)} className="text-xs text-blue-600 hover:underline">Content Bank</button>
            <button onClick={expandAll} className="text-xs text-gray-500 hover:underline">Expand All</button>
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
              onDuplicate={() => setTopics([...topics, { ...topic, id: `t${Date.now()}`, title: `${topic.title} (copy)`, items: [] }])}
              onDelete={() => setDeleteTarget({ kind: 'topic', topicId: topic.id, name: topic.title })}
              onAddLesson={() => addItem(topic.id, 'lesson')}
              onAddQuiz={() => addItem(topic.id, 'quiz')}
              onAddAssignment={() => addItem(topic.id, 'assignment')}
              onEditItem={(itemId) => {
                const item = topic.items.find((i) => i.id === itemId)
                if (item) setModal({ type: item.type, topicId: topic.id, itemId })
              }}
              onDuplicateItem={(itemId) => duplicateItem(topic.id, itemId)}
              onDeleteItem={(itemId, name) => setDeleteTarget({ kind: 'item', topicId: topic.id, itemId, name })}
            />
          ))}
        </div>

        <button onClick={addTopic} className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-[#ebf4ff] dark:bg-blue-500/10 hover:bg-[#d8e8ff] text-blue-600 dark:text-blue-400 text-sm font-medium rounded-md">
          <span className="w-5 h-5 bg-blue-600 text-white rounded flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></span>
          Add Topic
        </button>
      </div>

      <Footer>
        <Button variant="outline" onClick={onBack} className="w-9 h-9 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        <Button variant="outline" onClick={onNext} className="flex items-center gap-1.5">Next <ArrowRight className="w-4 h-4" /></Button>
      </Footer>

      {/* === MODALS === */}
      {modal?.type === 'lesson' && (
        <LessonModal
          topicId={modal.topicId}
          itemId={modal.itemId}
          existing={modal.itemId ? topics.find((t) => t.id === modal.topicId)?.items.find((i) => i.id === modal.itemId) : undefined}
          onClose={() => setModal(null)}
          onSave={(item) => modal.itemId ? updateItem(modal.topicId, modal.itemId, item) : saveItem(modal.topicId, item)}
        />
      )}
      {modal?.type === 'quiz' && (
        <QuizModal
          topicId={modal.topicId}
          itemId={modal.itemId}
          existing={modal.itemId ? topics.find((t) => t.id === modal.topicId)?.items.find((i) => i.id === modal.itemId) : undefined}
          onClose={() => setModal(null)}
          onSave={(item) => modal.itemId ? updateItem(modal.topicId, modal.itemId, item) : saveItem(modal.topicId, item)}
        />
      )}
      {modal?.type === 'assignment' && (
        <AssignmentModal
          topicId={modal.topicId}
          itemId={modal.itemId}
          existing={modal.itemId ? topics.find((t) => t.id === modal.topicId)?.items.find((i) => i.id === modal.itemId) : undefined}
          onClose={() => setModal(null)}
          onSave={(item) => modal.itemId ? updateItem(modal.topicId, modal.itemId, item) : saveItem(modal.topicId, item)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmPopover
          name={deleteTarget.name}
          kind={deleteTarget.kind}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget.kind === 'topic') deleteTopic(deleteTarget.topicId)
            else if (deleteTarget.itemId) deleteItem(deleteTarget.topicId, deleteTarget.itemId)
            setDeleteTarget(null)
          }}
        />
      )}
      {showContentBank && <ContentBankContentSelectModal onClose={() => setShowContentBank(false)} />}
    </>
  )
}

function TopicCard({ topic, isEditing, onToggle, onEdit, onEditDone, onUpdate, onDuplicate, onDelete, onAddLesson, onAddQuiz, onAddAssignment, onEditItem, onDuplicateItem, onDeleteItem }: {
  topic: Topic; isEditing: boolean; onToggle: () => void; onEdit: () => void; onEditDone: () => void
  onUpdate: (patch: Partial<Topic>) => void; onDuplicate: () => void; onDelete: () => void
  onAddLesson: () => void; onAddQuiz: () => void; onAddAssignment: () => void
  onEditItem: (id: string) => void; onDuplicateItem: (id: string) => void; onDeleteItem: (id: string, name: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [itemMenuFor, setItemMenuFor] = useState<string | null>(null)

  return (
    <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900">
        <button className="cursor-grab text-gray-300 hover:text-gray-500"><GripVertical className="w-4 h-4" /></button>
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={topic.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            onBlur={onEditDone}
            onKeyDown={(e) => { if (e.key === 'Enter') onEditDone() }}
            className="flex-1 text-sm font-medium text-gray-800 dark:text-zinc-100 border border-blue-500 rounded px-2 py-1 focus:outline-none bg-white dark:bg-zinc-900"
          />
        ) : (
          <button onClick={onToggle} className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-zinc-100">{topic.title}</button>
        )}
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-400 hover:text-gray-700 p-1"><MoreVertical className="w-4 h-4" /></button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg w-40 py-1">
                <MenuButton icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { onEdit(); setMenuOpen(false) }}>Edit Topic</MenuButton>
                <MenuButton icon={<Copy className="w-3.5 h-3.5" />} onClick={() => { onDuplicate(); setMenuOpen(false) }}>Duplicate</MenuButton>
                <MenuButton icon={<Trash2 className="w-3.5 h-3.5" />} danger onClick={() => { onDelete(); setMenuOpen(false) }}>Delete</MenuButton>
              </div>
            </>
          )}
        </div>
      </div>

      {topic.expanded && topic.items.length > 0 && (
        <div className="border-t border-gray-100 dark:border-zinc-700 bg-[#fafbfc] dark:bg-zinc-900">
          <div className="pl-12 pr-4 py-2 space-y-1">
            {topic.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded cursor-pointer" onClick={() => onEditItem(item.id)}>
                <span className="text-gray-300 cursor-grab"><GripVertical className="w-3.5 h-3.5" /></span>
                <span className={itemIconColor(item.type)}>{itemIcon(item.type)}</span>
                <span className="text-sm text-gray-700 dark:text-zinc-100 flex-1">{item.title}</span>
                {item.meta && <span className="text-xs text-gray-400">{item.meta}</span>}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setItemMenuFor(itemMenuFor === item.id ? null : item.id)} className="text-gray-300 hover:text-gray-600 p-1"><MoreVertical className="w-4 h-4" /></button>
                  {itemMenuFor === item.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setItemMenuFor(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg w-40 py-1">
                        <MenuButton icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { onEditItem(item.id); setItemMenuFor(null) }}>Edit</MenuButton>
                        <MenuButton icon={<Copy className="w-3.5 h-3.5" />} onClick={() => { onDuplicateItem(item.id); setItemMenuFor(null) }}>Duplicate</MenuButton>
                        <MenuButton icon={<Trash2 className="w-3.5 h-3.5" />} danger onClick={() => { onDeleteItem(item.id, item.title); setItemMenuFor(null) }}>Delete</MenuButton>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topic.expanded && (
        <div className="border-t border-gray-100 dark:border-zinc-700 px-4 py-2.5 flex items-center gap-2 bg-white dark:bg-zinc-800">
          <AddBtn icon={<FileText className="w-3 h-3" />} label="Lesson" onClick={onAddLesson} />
          <AddBtn icon={<Puzzle className="w-3 h-3" />} label="Quiz" onClick={onAddQuiz} />
          <AddBtn icon={<ClipboardCheck className="w-3 h-3" />} label="Assignment" onClick={onAddAssignment} />
        </div>
      )}
    </div>
  )
}

function itemIcon(type: Item['type']) {
  switch (type) {
    case 'lesson': return <FileText className="w-4 h-4" />
    case 'quiz': return <Puzzle className="w-4 h-4" />
    case 'assignment': return <ClipboardCheck className="w-4 h-4" />
  }
}
function itemIconColor(type: Item['type']) {
  switch (type) {
    case 'lesson': return 'text-gray-400'
    case 'quiz': return 'text-amber-500'
    case 'assignment': return 'text-teal-500'
  }
}

// ============================================================
// LESSON MODAL — 2-column: left (Name+Content) + right sidebar (Image/Video/Duration/Drip/Attachments/Preview)
// Source: LessonModal.tsx (760 lines)
// ============================================================
function LessonModal({ topicId, itemId, existing, onClose, onSave }: {
  topicId: string; itemId?: string; existing?: Item; onClose: () => void; onSave: (item: Item) => void
}) {
  const [name, setName] = useState(existing?.title || '')
  const [content, setContent] = useState('')
  const [videoHour, setVideoHour] = useState('0')
  const [videoMin, setVideoMin] = useState('0')
  const [videoSec, setVideoSec] = useState('0')
  const [lessonPreview, setLessonPreview] = useState(false)
  const [dripType, setDripType] = useState<'none' | 'specific_days' | 'unlock_by_date' | 'after_finishing_prerequisites'>('none')
  const [dripDays, setDripDays] = useState('0')
  const [dripDate, setDripDate] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const isDirty = name !== (existing?.title || '') || content !== ''

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ id: itemId || `i${Date.now()}`, type: 'lesson', title: name })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[1070px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-3 border-b border-gray-100 dark:border-zinc-700 flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            {isDirty ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
            {isDirty ? 'Unsaved Changes' : (itemId ? 'Edit Lesson' : 'Add Lesson')}
          </DialogTitle>
          {isDirty && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { if (itemId) { setName(existing?.title || ''); setContent('') } else onClose() }}>
                {itemId ? 'Discard Changes' : 'Cancel'}
              </Button>
              <Button size="sm" onClick={handleSave} data-cy="save-lesson">{itemId ? 'Update' : 'Save'}</Button>
            </div>
          )}
        </DialogHeader>
        <div className="grid grid-cols-[1fr_338px] h-[70vh] overflow-hidden">
          {/* LEFT: Name + Content */}
          <div className="p-8 overflow-y-auto border-r border-gray-100 dark:border-zinc-700 space-y-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Lesson Name"
                className="w-full h-10 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <button className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> WP Editor</button>
              </div>
              <RichTextEditor value={content} onChange={setContent} placeholder="Enter Lesson Description" />
              <button className="text-xs text-blue-600 hover:underline">+ Add H5P Content</button>
            </div>
          </div>
          {/* RIGHT sidebar */}
          <div className="p-5 overflow-y-auto space-y-5 bg-[#fafbfc] dark:bg-zinc-900">
            <SidebarSection label="Featured Image">
              <UploadBox icon={<ImagePlus className="w-6 h-6 text-gray-400" />} buttonText="Upload Image" helper="JPEG, PNG, GIF, and WebP formats, up to 512 MB" />
            </SidebarSection>
            <SidebarSection label="Video">
              <UploadBox icon={<Video className="w-6 h-6 text-gray-400" />} buttonText="Upload Video" secondaryText="Add from URL" helper="MP4, and WebM formats, up to 512 MB" />
            </SidebarSection>
            <SidebarSection label="Video Playback Time">
              <div className="flex items-center gap-2">
                <NumWithLabel value={videoHour} onChange={setVideoHour} unit="hour" />
                <NumWithLabel value={videoMin} onChange={setVideoMin} unit="min" />
                <NumWithLabel value={videoSec} onChange={setVideoSec} unit="sec" />
              </div>
            </SidebarSection>
            <SidebarSection label="Content Drip">
              <Select value={dripType === 'none' ? '' : dripType} onChange={(v) => setDripType(v as any)} options={[
                { value: '', label: 'No drip' },
                { value: 'specific_days', label: 'After X days' },
                { value: 'unlock_by_date', label: 'On specific date' },
                { value: 'after_finishing_prerequisites', label: 'After prerequisites' },
              ]} />
              {dripType === 'specific_days' && (
                <div className="mt-2">
                  <Label icon={<Clock className="w-3 h-3 text-gray-400" />}>Available after days</Label>
                  <input type="number" value={dripDays} onChange={(e) => setDripDays(e.target.value)} className="w-full h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm mt-1 bg-white dark:bg-zinc-900" />
                  <p className="text-[10px] text-gray-400 mt-1">This lesson will be available after the given number of days.</p>
                </div>
              )}
              {dripType === 'unlock_by_date' && (
                <div className="mt-2">
                  <Label icon={<Calendar className="w-3 h-3 text-gray-400" />}>Unlock Date</Label>
                  <input type="date" value={dripDate} onChange={(e) => setDripDate(e.target.value)} className="w-full h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm mt-1 bg-white dark:bg-zinc-900" />
                </div>
              )}
              {dripType === 'after_finishing_prerequisites' && (
                <div className="mt-2">
                  <Label icon={<CheckCircle2 className="w-3 h-3 text-gray-400" />}>Prerequisites</Label>
                  <select className="w-full h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm mt-1 bg-white dark:bg-zinc-900">
                    <option>Select Prerequisite</option>
                  </select>
                </div>
              )}
            </SidebarSection>
            <SidebarSection label="Exercise Files">
              <UploadBox icon={<Paperclip className="w-6 h-6 text-gray-400" />} buttonText="Upload Attachment" helper="Select multiple files" />
            </SidebarSection>
            <SidebarSection label="Lesson Preview">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Allow guest preview</span>
                <Toggle checked={lessonPreview} onChange={setLessonPreview} />
              </div>
              {lessonPreview && <p className="text-[10px] text-blue-600 mt-1">This lesson is now available for preview without enrollment.</p>}
            </SidebarSection>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// QUIZ MODAL — 3-column with Details/Settings tabs
// Source: QuizModal.tsx (577 lines) + QuizSettings.tsx (20+ fields)
// ============================================================
const QUESTION_TYPES = [
  { id: 'multiple-choice', label: 'Multiple Choice', icon: '◉' },
  { id: 'true-false', label: 'True/False', icon: '✓' },
  { id: 'open-ended', label: 'Open-Ended/Essay', icon: '✍' },
  { id: 'fill-blanks', label: 'Fill in the Blanks', icon: '__' },
  { id: 'short-answer', label: 'Short Answer', icon: 'Aa' },
  { id: 'matching', label: 'Matching', icon: '⇄' },
  { id: 'image-answering', label: 'Image Answering', icon: '🖼' },
  { id: 'ordering', label: 'Ordering', icon: '↕' },
  { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
  { id: 'scale', label: 'Scale', icon: '📏' },
  { id: 'coordinates', label: 'Coordinates', icon: '⊕' },
  { id: 'pin-image', label: 'Pin the Answer', icon: '📌' },
  { id: 'draw-image', label: 'Draw on Image', icon: '✏' },
]

function QuizModal({ topicId, itemId, existing, onClose, onSave }: {
  topicId: string; itemId?: string; existing?: Item; onClose: () => void; onSave: (item: Item) => void
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'settings'>('details')
  const [quizTitle, setQuizTitle] = useState(existing?.title || '')
  const [quizDesc, setQuizDesc] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(!itemId)
  const [questions, setQuestions] = useState<{ id: string; type: string; title: string }[]>([
    { id: 'q1', type: 'multiple-choice', title: 'What is social media marketing?' },
  ])
  const [activeQuestion, setActiveQuestion] = useState<string>('q1')
  const [showQuestionPreview, setShowQuestionPreview] = useState(false)

  // Quiz settings (matching QuizSettings.tsx — 20+ fields)
  const [passingGrade, setPassingGrade] = useState('50')
  const [questionOrder, setQuestionOrder] = useState('random')
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(true)
  const [attemptsAllowed, setAttemptsAllowed] = useState('3')
  const [limitMaxQuestions, setLimitMaxQuestions] = useState(false)
  const [maxQuestions, setMaxQuestions] = useState('10')
  const [passRequired, setPassRequired] = useState(true)
  const [enableTimeLimit, setEnableTimeLimit] = useState(true)
  const [timeValue, setTimeValue] = useState('60')
  const [timeType, setTimeType] = useState('minutes')
  const [hideTimer, setHideTimer] = useState(false)
  const [autoStart, setAutoStart] = useState(false)
  const [autoStartDelay, setAutoStartDelay] = useState('5')
  const [layout, setLayout] = useState('single')
  const [showPagination, setShowPagination] = useState(false)
  const [enableAnswerReveal, setEnableAnswerReveal] = useState(false)
  const [hidePrev, setHidePrev] = useState(false)
  const [hideQuestionNum, setHideQuestionNum] = useState(false)
  const [openEndedLimit, setOpenEndedLimit] = useState('500')

  const addQuestion = (type: string) => {
    const newQ = { id: `q${Date.now()}`, type, title: 'New Question' }
    setQuestions([...questions, newQ])
    setActiveQuestion(newQ.id)
  }

  const handleSave = () => {
    if (!quizTitle.trim()) return
    onSave({ id: itemId || `i${Date.now()}`, type: 'quiz', title: quizTitle, meta: `(${questions.length} Questions)` })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-3 border-b border-gray-100 dark:border-zinc-700 flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Puzzle className="w-5 h-5 text-amber-500" />
            {itemId ? 'Edit Quiz' : 'Add Quiz'}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} data-cy="save-quiz">{itemId ? 'Update' : 'Save'}</Button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-zinc-700 px-6">
          <button onClick={() => setActiveTab('details')} className={`px-4 py-2 text-sm ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>Question</button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm ${activeTab === 'settings' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>Settings</button>
        </div>

        {activeTab === 'details' && (
          <div className="grid grid-cols-[400px_1fr_340px] h-[65vh] overflow-hidden">
            {/* LEFT: Quiz title + Question list */}
            <div className="border-r border-gray-100 dark:border-zinc-700 overflow-y-auto p-4 space-y-3">
              <div className="space-y-2">
                <Label>Quiz Title</Label>
                {isEditingTitle ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="Enter Quiz Title"
                      className="flex-1 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900"
                    />
                    <Button size="sm" onClick={() => setIsEditingTitle(false)} data-cy="save-quiz-title">OK</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{quizTitle}</span>
                    <button onClick={() => setIsEditingTitle(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  </div>
                )}
              </div>
              <div>
                <textarea
                  value={quizDesc}
                  onChange={(e) => setQuizDesc(e.target.value)}
                  placeholder="Quiz Description"
                  className="w-full p-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900 h-20"
                />
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <Label>Questions ({questions.length})</Label>
                  <button onClick={() => setShowQuestionPreview(true)} className="text-xs text-blue-600 hover:underline">Preview</button>
                </div>
                <div className="space-y-1">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestion(q.id)}
                      className={`w-full text-left p-2 rounded text-xs border ${activeQuestion === q.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{i + 1}.</span>
                        <span className="font-medium text-gray-700 dark:text-zinc-200">{q.title}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 ml-4">{QUESTION_TYPES.find((t) => t.id === q.type)?.label}</div>
                    </button>
                  ))}
                </div>
                {/* Add question dropdown */}
                <div className="mt-2">
                  <details>
                    <summary className="cursor-pointer text-xs text-blue-600 hover:underline">+ Add Question</summary>
                    <div className="grid grid-cols-2 gap-1 mt-2 p-2 border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900">
                      {QUESTION_TYPES.map((qt) => (
                        <button
                          key={qt.id}
                          onClick={() => addQuestion(qt.id)}
                          className="flex items-center gap-2 p-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-left"
                        >
                          <span>{qt.icon}</span>
                          <span className="text-gray-700 dark:text-zinc-200">{qt.label}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* CENTER: Question form */}
            <div className="overflow-y-auto p-6">
              {activeQuestion ? (
                <QuestionForm question={questions.find((q) => q.id === activeQuestion)!} />
              ) : (
                <div className="text-center text-gray-400 py-12">Select a question or add a new one</div>
              )}
            </div>

            {/* RIGHT: Question conditions */}
            <div className="border-l border-gray-100 dark:border-zinc-700 overflow-y-auto p-4 space-y-3 bg-[#fafbfc] dark:bg-zinc-900">
              <Label>Question Conditions</Label>
              <div className="text-xs text-gray-500 space-y-2">
                <p>Set conditions to show this question based on previous answers.</p>
                <button className="text-blue-600 hover:underline">+ Add Condition</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="overflow-y-auto p-6 h-[65vh] max-w-3xl mx-auto space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-50">Quiz Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <SettingField label="Passing Grade">
                <div className="flex items-center gap-1">
                  <input type="number" value={passingGrade} onChange={(e) => setPassingGrade(e.target.value)} className="w-20 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </SettingField>
              <SettingField label="Question Order">
                <Select value={questionOrder} onChange={setQuestionOrder} options={['random', 'sorting', 'ascending', 'descending']} />
              </SettingField>
            </div>

            <SettingToggle label="Allow multiple attempts" checked={allowMultipleAttempts} onChange={setAllowMultipleAttempts} />
            {allowMultipleAttempts && (
              <SettingField label="Attempts Allowed">
                <input type="number" value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
              </SettingField>
            )}

            <SettingToggle label="Set maximum questions per quiz" checked={limitMaxQuestions} onChange={setLimitMaxQuestions} />
            {limitMaxQuestions && (
              <SettingField label="Max Questions">
                <input type="number" value={maxQuestions} onChange={(e) => setMaxQuestions(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
              </SettingField>
            )}

            <SettingToggle label="Pass is required" checked={passRequired} onChange={setPassRequired} />

            <SettingToggle label="Set time limit" checked={enableTimeLimit} onChange={setEnableTimeLimit} checkbox />
            {enableTimeLimit && (
              <div className="flex gap-2">
                <SettingField label="Time Value">
                  <input type="number" value={timeValue} onChange={(e) => setTimeValue(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
                </SettingField>
                <SettingField label="Time Type">
                  <Select value={timeType} onChange={setTimeType} options={['minutes', 'hours', 'days', 'weeks']} />
                </SettingField>
              </div>
            )}

            <SettingToggle label="Hide countdown timer" checked={hideTimer} onChange={setHideTimer} />
            <SettingToggle label="Auto start quiz" checked={autoStart} onChange={setAutoStart} checkbox />
            {autoStart && (
              <SettingField label="Auto start delay (seconds)">
                <input type="number" value={autoStartDelay} onChange={(e) => setAutoStartDelay(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
              </SettingField>
            )}
            <SettingField label="Layout">
              <Select value={layout} onChange={setLayout} options={['single', 'list']} />
            </SettingField>
            <SettingToggle label="Show pagination" checked={showPagination} onChange={setShowPagination} checkbox />
            <SettingToggle label="Reveal answers after submission" checked={enableAnswerReveal} onChange={setEnableAnswerReveal} checkbox />
            <SettingToggle label="Hide Previous button" checked={hidePrev} onChange={setHidePrev} />
            <SettingToggle label="Hide question number" checked={hideQuestionNum} onChange={setHideQuestionNum} />
            <SettingField label="Open-Ended/Essay Answer (character limit)">
              <input type="number" value={openEndedLimit} onChange={(e) => setOpenEndedLimit(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
            </SettingField>
          </div>
        )}
      </DialogContent>

      {showQuestionPreview && (
        <QuestionPreviewModal
          question={questions.find((q) => q.id === activeQuestion)}
          onClose={() => setShowQuestionPreview(false)}
        />
      )}
    </Dialog>
  )
}

function QuestionForm({ question }: { question: { id: string; type: string; title: string } }) {
  const [title, setTitle] = useState(question.title)
  const qt = QUESTION_TYPES.find((t) => t.id === question.type)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 text-xs">{qt?.icon} {qt?.label}</Badge>
      </div>
      <div className="space-y-2">
        <Label>Question Title</Label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
      </div>
      <div className="space-y-2">
        <Label>Question Description</Label>
        <RichTextEditor value="" onChange={() => {}} placeholder="Enter question description" />
      </div>
      {question.type === 'multiple-choice' && (
        <div className="space-y-2">
          <Label>Answer Options</Label>
          {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" className="w-4 h-4" />
              <input type="text" defaultValue={opt} className="flex-1 h-9 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
              <button className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ))}
          <button className="text-xs text-blue-600 hover:underline">+ Add Option</button>
        </div>
      )}
      {question.type === 'true-false' && (
        <div className="space-y-2">
          <Label>Correct Answer</Label>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="tf" /> True</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="tf" /> False</label>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Points</Label>
        <input type="number" defaultValue="1" className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
      </div>
    </div>
  )
}

// ============================================================
// ASSIGNMENT MODAL — 2-column: left (Title+Content) + right sidebar (Attachments/TimeLimit/Points/FileLimits/Resubmission)
// Source: AssignmentModal.tsx (618 lines)
// ============================================================
function AssignmentModal({ topicId, itemId, existing, onClose, onSave }: {
  topicId: string; itemId?: string; existing?: Item; onClose: () => void; onSave: (item: Item) => void
}) {
  const [title, setTitle] = useState(existing?.title || '')
  const [summary, setSummary] = useState('')
  const [timeValue, setTimeValue] = useState('7')
  const [timeUnit, setTimeUnit] = useState<'weeks' | 'days' | 'hours'>('days')
  const [deadlineFromStart, setDeadlineFromStart] = useState(false)
  const [totalMark, setTotalMark] = useState('100')
  const [passMark, setPassMark] = useState('50')
  const [fileLimit, setFileLimit] = useState('5')
  const [fileSizeLimit, setFileSizeLimit] = useState('10')
  const [retryAllowed, setRetryAllowed] = useState(false)
  const [attemptsAllowed, setAttemptsAllowed] = useState('3')

  const isDirty = title !== (existing?.title || '') || summary !== ''

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ id: itemId || `i${Date.now()}`, type: 'assignment', title })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[1070px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-3 border-b border-gray-100 dark:border-zinc-700 flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            {isDirty ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <ClipboardCheck className="w-5 h-5 text-teal-500" />}
            {isDirty ? 'Unsaved Changes' : (itemId ? 'Edit Assignment' : 'Add Assignment')}
          </DialogTitle>
          {isDirty && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { if (itemId) { setTitle(existing?.title || ''); setSummary('') } else onClose() }}>
                {itemId ? 'Discard Changes' : 'Cancel'}
              </Button>
              <Button size="sm" onClick={handleSave} data-cy="save-assignment">{itemId ? 'Update' : 'Save'}</Button>
            </div>
          )}
        </DialogHeader>
        <div className="grid grid-cols-[1fr_338px] h-[70vh] overflow-hidden">
          {/* LEFT: Title + Content */}
          <div className="p-8 overflow-y-auto border-r border-gray-100 dark:border-zinc-700 space-y-6">
            <div className="space-y-2">
              <Label>Title</Label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter Assignment Title"
                className="w-full h-10 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor value={summary} onChange={setSummary} placeholder="Enter Assignment Content" />
            </div>
          </div>
          {/* RIGHT sidebar */}
          <div className="p-5 overflow-y-auto space-y-5 bg-[#fafbfc] dark:bg-zinc-900">
            <SidebarSection label="Attachments">
              <UploadBox icon={<Paperclip className="w-6 h-6 text-gray-400" />} buttonText="Upload Attachment" helper="Select multiple files" />
            </SidebarSection>
            <SidebarSection label="Time Limit">
              <div className="flex gap-2">
                <input type="number" value={timeValue} onChange={(e) => setTimeValue(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
                <Select value={timeUnit} onChange={(v) => setTimeUnit(v as any)} options={['weeks', 'days', 'hours']} />
              </div>
            </SidebarSection>
            <SidebarSection label="Set Deadline From Assignment Start Time">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Per-student deadline</span>
                <Toggle checked={deadlineFromStart} onChange={setDeadlineFromStart} />
              </div>
              {deadlineFromStart && <p className="text-[10px] text-gray-400 mt-1">Each student will get their own deadline based on when they start.</p>}
            </SidebarSection>
            <SidebarSection label="Total Points">
              <input type="number" value={totalMark} onChange={(e) => setTotalMark(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
            </SidebarSection>
            <SidebarSection label="Minimum Pass Points">
              <input type="number" value={passMark} onChange={(e) => setPassMark(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
              {Number(passMark) > Number(totalMark) && <p className="text-[10px] text-red-500 mt-1">Pass mark cannot be greater than total mark</p>}
            </SidebarSection>
            <SidebarSection label="File Upload Limit">
              <input type="number" value={fileLimit} onChange={(e) => setFileLimit(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
              <p className="text-[10px] text-gray-400 mt-1">Number of files a student can upload. 0 disables uploads.</p>
            </SidebarSection>
            <SidebarSection label="Maximum File Size Limit">
              <div className="flex items-center gap-1">
                <input type="number" value={fileSizeLimit} onChange={(e) => setFileSizeLimit(e.target.value)} className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
                <span className="text-xs text-gray-500">MB</span>
              </div>
            </SidebarSection>
            <SidebarSection label="Allow Assignment Resubmission">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Allow retry after deadline</span>
                <Toggle checked={retryAllowed} onChange={setRetryAllowed} />
              </div>
              {retryAllowed && (
                <div className="mt-2">
                  <Label icon={<Repeat className="w-3 h-3 text-gray-400" />}>Maximum Resubmission Attempts</Label>
                  <input type="number" value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(e.target.value)} min="1" max="20" className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm mt-1 bg-white dark:bg-zinc-900" />
                  <p className="text-[10px] text-gray-400 mt-1">Between 1 and 20 attempts.</p>
                </div>
              )}
            </SidebarSection>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// AI COURSE BUILDER MODAL
// ============================================================
function AICourseBuilderModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('Beginner')
  const [outline, setOutline] = useState('')

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="w-5 h-5 text-pink-500" /> Generate Course with AI
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>What's your course about?</Label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Introduction to Python Programming" className="w-full h-10 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
              </div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={audience} onChange={setAudience} options={['Beginner', 'Intermediate', 'Advanced', 'All Levels']} />
              </div>
            </>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <Label>Generated Outline (edit as needed)</Label>
              <textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                rows={10}
                placeholder="AI will generate a course outline here..."
                className="w-full p-3 border border-gray-200 dark:border-zinc-600 rounded text-sm font-mono bg-white dark:bg-zinc-900"
                defaultValue={`Topic 1: Introduction\n  - Lesson 1: What is ${topic}?\n  - Lesson 2: Why it matters\n  - Quiz: Introduction\n\nTopic 2: Core Concepts\n  - Lesson 3: Fundamentals\n  - Lesson 4: Practical Examples\n  - Assignment: Hands-on practice\n\nTopic 3: Advanced Topics\n  - Lesson 5: Best practices\n  - Lesson 6: Common pitfalls\n  - Quiz: Final assessment`}
              />
            </div>
          )}
          {step === 3 && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-medium">Course Generated!</h3>
              <p className="text-sm text-gray-500">3 topics, 6 lessons, 2 quizzes, 1 assignment added to your curriculum.</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as any)}>Back</Button>}
            {step < 3 && <Button onClick={() => setStep((s) => (s + 1) as any)}>{step === 1 ? 'Generate Outline' : 'Create Course'}</Button>}
            {step === 3 && <Button onClick={onClose}>Done</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// QUESTION PREVIEW MODAL
// ============================================================
function QuestionPreviewModal({ question, onClose }: { question: { id: string; type: string; title: string } | undefined; onClose: () => void }) {
  if (!question) return null
  const qt = QUESTION_TYPES.find((t) => t.id === question.type)
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileQuestion className="w-5 h-5 text-blue-500" /> Question Preview
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600">{qt?.icon} {qt?.label}</Badge>
          <h3 className="text-base font-medium">{question.title}</h3>
          {question.type === 'multiple-choice' && (
            <div className="space-y-2">
              {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, i) => (
                <label key={i} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-zinc-700 rounded text-sm cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="preview" /> {opt}
                </label>
              ))}
            </div>
          )}
          {question.type === 'true-false' && (
            <div className="flex gap-3">
              <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-zinc-700 rounded text-sm cursor-pointer hover:bg-gray-50">
                <input type="radio" name="preview" /> True
              </label>
              <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-zinc-700 rounded text-sm cursor-pointer hover:bg-gray-50">
                <input type="radio" name="preview" /> False
              </label>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// CONTENT BANK CONTENT SELECT MODAL
// ============================================================
function ContentBankContentSelectModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'questions' | 'contents' | 'collections'>('questions')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-3 border-b">
          <DialogTitle className="text-base">Content Bank — Select Content</DialogTitle>
        </DialogHeader>
        <div className="flex border-b px-6">
          {(['questions', 'contents', 'collections'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize ${tab === t ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>{t}</button>
          ))}
        </div>
        <div className="p-6 overflow-y-auto h-[60vh]">
          <div className="flex gap-3 mb-4">
            <input type="text" placeholder="Search..." className="flex-1 h-9 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900" />
            <select className="h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900">
              <option>All Types</option>
              <option>Multiple Choice</option>
              <option>True/False</option>
            </select>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <label key={i} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-zinc-700 rounded text-sm hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" />
                <FileQuestion className="w-4 h-4 text-amber-500" />
                <span className="flex-1">Sample {tab.slice(0, -1)} #{i + 1}</span>
                <Badge variant="outline" className="text-xs">Multiple Choice</Badge>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Add Selected</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// DELETE CONFIRM POPOVER
// ============================================================
function DeleteConfirmPopover({ name, kind, onCancel, onConfirm }: {
  name: string; kind: 'topic' | 'item'; onCancel: () => void; onConfirm: () => void
}) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Delete {kind === 'topic' ? 'Topic' : 'Item'}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <strong>"{name}"</strong>?{kind === 'topic' && ' This will also delete all lessons, quizzes, and assignments inside this topic.'} This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// ADDITIONAL SETTINGS TAB
// ============================================================
function AdditionalSettingsTab({ onBack }: { onBack: () => void }) {
  const [allowQa, setAllowQa] = useState(true)
  const [enableReview, setEnableReview] = useState(true)
  const [disablePreview, setDisablePreview] = useState(false)
  const [requireEnrollment, setRequireEnrollment] = useState(true)

  return (
    <>
      <div className="p-6 bg-[#f9fafb] dark:bg-zinc-900 min-h-[600px]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-100"><ArrowLeft className="w-4 h-4 text-gray-600" /></button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Additional Settings</h2>
        </div>
        <div className="max-w-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg divide-y divide-gray-100 dark:divide-zinc-700">
          <SettingRow label="Course Q&A" description="Allow students to ask questions on lessons. Visible in course Q&A tab." checked={allowQa} onChange={setAllowQa} />
          <SettingRow label="Course Reviews" description="Enable/disable course reviews from students." checked={enableReview} onChange={setEnableReview} />
          <SettingRow label="Disable Course Preview" description="Disable lesson preview for non-enrolled users." checked={disablePreview} onChange={setDisablePreview} />
          <SettingRow label="Require Enrollment" description="Students must be enrolled to access course content." checked={requireEnrollment} onChange={setRequireEnrollment} />
        </div>
      </div>
      <Footer>
        <Button variant="outline" onClick={onBack} className="w-9 h-9 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        <Button className="flex items-center gap-1.5"><ArrowRight className="w-4 h-4" /> Publish Course</Button>
      </Footer>
    </>
  )
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Footer({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end items-center gap-2 px-6 py-3 border-t border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">{children}</div>
}
function Label({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5"><span className="text-sm font-medium text-gray-700 dark:text-zinc-100">{children}</span>{icon}</div>
}
function SidebarSection({ label, aiIcon, children }: { label: string; aiIcon?: boolean; children: React.ReactNode }) {
  return <section className="space-y-1.5"><div className="flex items-center gap-1.5"><label className="text-xs font-semibold text-gray-700 dark:text-zinc-100">{label}</label>{aiIcon && <Sparkles className="w-3 h-3 text-pink-500" />}</div>{children}</section>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center gap-3"><label className="text-xs text-gray-600 flex items-center gap-1 min-w-[120px]"><Info className="w-3.5 h-3.5 text-gray-400" />{label}</label>{children}</div>
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <button onClick={() => onChange(!checked)} className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} /></button>
}
function UploadBox({ icon, buttonText, secondaryText, helper }: { icon: React.ReactNode; buttonText: string; secondaryText?: string; helper: string }) {
  return <div className="border border-dashed border-gray-200 dark:border-zinc-600 rounded-md p-4 text-center space-y-2"><div className="flex justify-center">{icon}</div><button className="text-sm text-blue-600 hover:underline">{buttonText}</button>{secondaryText && <button className="block mx-auto text-xs text-blue-600 hover:underline">{secondaryText}</button>}<p className="text-[10px] text-gray-400">{helper}</p></div>
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 pl-3 pr-8 border border-gray-200 dark:border-zinc-600 rounded text-sm appearance-none bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
        {options.map((o) => { const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label; return <option key={v} value={v}>{l}</option> })}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}
function OptionTabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${active ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 border-l-2 border-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'}`}>{icon}{children}</button>
}
function DripRadio({ label }: { label: string }) {
  return <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="drip-type" className="w-3.5 h-3.5 text-blue-600" /><span className="text-gray-700">{label}</span></label>
}
function NumWithLabel({ value, onChange, unit }: { value: string; onChange: (v: string) => void; unit: string }) {
  return <div className="flex items-center border border-gray-200 dark:border-zinc-600 rounded overflow-hidden"><input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-14 h-9 px-2 text-sm focus:outline-none bg-white dark:bg-zinc-900" /><span className="text-xs text-gray-500 px-2 border-l border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 h-9 flex items-center">{unit}</span></div>
}
function MenuButton({ icon, onClick, danger, children }: { icon: React.ReactNode; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 ${danger ? 'text-red-600' : 'text-gray-700 dark:text-zinc-200'}`}>{icon}{children}</button>
}
function AddBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 dark:border-zinc-600 rounded text-xs text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900">{icon}{label}</button>
}
function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs font-medium text-gray-700 dark:text-zinc-200">{label}</label><div>{children}</div></div>
}
function SettingToggle({ label, checked, onChange, checkbox }: { label: string; checked: boolean; onChange: (v: boolean) => void; checkbox?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-sm text-gray-700 dark:text-zinc-200">{label}</label>
      {checkbox ? (
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
      ) : (
        <Toggle checked={checked} onChange={onChange} />
      )}
    </div>
  )
}
function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between p-4 gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-gray-400" /><h3 className="text-sm font-medium text-gray-800 dark:text-zinc-100">{label}</h3></div>
        <p className="text-xs text-gray-500 mt-1 ml-5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// Rich text editor (simplified WordPress-style)
function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="border border-gray-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 overflow-hidden">
      <div className="flex items-center gap-0 border-b border-gray-100 dark:border-zinc-700 px-2">
        <button className="px-3 py-2 text-xs font-medium border-b-2 border-blue-600 -mb-px">Visual</button>
        <button className="px-3 py-2 text-xs text-gray-500">Text</button>
      </div>
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-700 overflow-x-auto">
        <select className="text-xs bg-transparent border-0 focus:outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 px-1 py-0.5 rounded">
          <option>Paragraph</option><option>Heading 1</option><option>Heading 2</option><option>Heading 3</option>
        </select>
        <ToolbarDivider />
        {[Bold, Italic, Underline].map((Icon, i) => <ToolbarIconBtn key={i} icon={<Icon className="w-3.5 h-3.5" />} />)}
        <ToolbarDivider />
        {[List, ListOrdered, Quote].map((Icon, i) => <ToolbarIconBtn key={i} icon={<Icon className="w-3.5 h-3.5" />} />)}
        <ToolbarDivider />
        {[AlignLeft, AlignCenter, AlignRight, AlignJustify].map((Icon, i) => <ToolbarIconBtn key={i} icon={<Icon className="w-3.5 h-3.5" />} />)}
        <ToolbarDivider />
        {[LinkIcon, Strikethrough, Minus, Code, Table].map((Icon, i) => <ToolbarIconBtn key={i} icon={<Icon className="w-3.5 h-3.5" />} />)}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full h-32 p-3 text-sm focus:outline-none resize-y bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-100" />
    </div>
  )
}
function ToolbarIconBtn({ icon }: { icon: React.ReactNode }) {
  return <button className="p-1 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded">{icon}</button>
}
function ToolbarDivider() {
  return <div className="w-px h-4 bg-gray-200 dark:bg-zinc-600 mx-0.5" />
}

// ============================================================
// FRONTEND APPS LANDING — grid of available apps
// ============================================================
export function FrontendAppsSection({ onLaunch }: { onLaunch: (appId: string) => void }) {
  const apps = [
    { id: 'course-builder', title: 'Course Builder', description: 'Tutor LMS course creation UI — 3-step wizard with Basic Tab, Curriculum Tab (with all 6 modals: Lesson/Quiz/Assignment editors, AI generator, Question Preview, Content Bank), and Additional Settings.', matchScore: 95, referenceDocs: 4, screenshots: 37, status: 'experiment' },
    { id: 'quiz-builder', title: 'Quiz Builder', description: 'Standalone quiz creation interface with 13 question types.', matchScore: 0, referenceDocs: 3, screenshots: 22, status: 'planned' },
    { id: 'student-dashboard', title: 'Student Dashboard', description: 'Frontend student dashboard — home, courses, quizzes, assignments, notes, discussions, calendar.', matchScore: 0, referenceDocs: 3, screenshots: 18, status: 'planned' },
    { id: 'instructor-dashboard', title: 'Instructor Dashboard', description: 'Frontend instructor dashboard — home, courses, announcements, quiz attempts, analytics.', matchScore: 0, referenceDocs: 3, screenshots: 24, status: 'planned' },
    { id: 'certificate-builder', title: 'Certificate Builder', description: 'Visual certificate design canvas with backdrops, layers, media library, templates.', matchScore: 0, referenceDocs: 3, screenshots: 19, status: 'planned' },
    { id: 'native-ecommerce', title: 'Native eCommerce', description: 'Cart, checkout, payment methods, coupons, taxes, orders.', matchScore: 0, referenceDocs: 3, screenshots: 14, status: 'planned' },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <LayoutGrid className="w-8 h-8 text-purple-500 shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Frontend Apps</h1>
          <p className="text-muted-foreground mt-1">Live recreations of Tutor LMS screens. Click any app to launch the full-screen interactive UI with all modals working.</p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600">{apps.length} apps · {apps.filter(a => a.status === 'experiment').length} live</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <Card key={app.id} className={app.status === 'experiment' ? 'border-purple-500/30 cursor-pointer hover:shadow-lg hover:border-purple-500/60 transition-all' : 'opacity-70'}>
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><LayoutGrid className="w-5 h-5 text-purple-600" /></div>
                {app.status === 'experiment' ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">● LIVE</Badge> : <Badge variant="outline" className="bg-gray-500/10 text-gray-500 text-[10px]">PLANNED</Badge>}
              </div>
              <h3 className="font-semibold text-base mb-1">{app.title}</h3>
              <p className="text-xs text-muted-foreground flex-1 mb-3 leading-relaxed">{app.description}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Reference screenshots:</span><Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600">{app.screenshots} imgs</Badge></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Reference docs:</span><span className="font-medium">{app.referenceDocs} pages</span></div>
                {app.matchScore > 0 && <div className="flex items-center justify-between"><span className="text-muted-foreground">VLM accuracy:</span><Badge variant="outline" className={`text-[10px] ${app.matchScore >= 80 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{app.matchScore}/100</Badge></div>}
              </div>
              {app.status === 'experiment' ? <Button onClick={() => onLaunch(app.id)} className="w-full mt-4" size="sm">Launch App <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button> : <Button disabled className="w-full mt-4" size="sm" variant="outline">Coming Soon</Button>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
