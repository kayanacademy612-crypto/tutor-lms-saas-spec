'use client'

// ============================================================
// COURSE BUILDER — ported from tailux experiment to main webapp
// Recreates Tutor LMS Course Builder UI pixel-perfectly
// Reference: Tutor-LMS-Course-Builder-Basics-Section-scaled.jpg
// ============================================================

import { useState } from 'react'
import {
  GraduationCap, Sparkles, CloudUpload, ChevronDown, X, ArrowLeft, ArrowRight,
  Info, Eye, Image as ImageIcon, Film, Plus, Search, Link as LinkIcon,
  Bold, Italic, Underline, List, ListOrdered, Quote, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Strikethrough, Code, Table, Minus,
  GripVertical, MoreVertical, FileText, Puzzle, ClipboardCheck,
  Settings, Clock, User, LayoutGrid, ArrowLeft as ArrowBack,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Step = 1 | 2 | 3

export function CourseBuilder({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [title, setTitle] = useState('New Course')

  return (
    <div className="fixed inset-0 z-50 bg-[#8da4ff] dark:bg-[#3f4d8a] overflow-auto">
      <div className="min-h-full p-4 sm:p-8 flex items-start justify-center">
        <div className="w-full max-w-[1280px] bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative my-4">
          {/* ============= HEADER ============= */}
          <header className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 dark:border-zinc-700">
            <div className="flex items-center gap-2 shrink-0">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-gray-800 dark:text-zinc-100 text-lg leading-none">
                tutor <span className="font-light">LMS</span>
              </span>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 mx-1" />

            <span className="text-sm font-medium text-gray-700 dark:text-zinc-100 shrink-0">
              Course Builder
            </span>

            <div className="flex items-center gap-2 ml-2">
              <StepIndicator n={1} label="Basics" active={step === 1} onClick={() => setStep(1)} />
              <span className="text-gray-300 dark:text-zinc-600">—</span>
              <StepIndicator n={2} label="Curriculum" active={step === 2} onClick={() => setStep(2)} />
              <span className="text-gray-300 dark:text-zinc-600">—</span>
              <StepIndicator n={3} label="Additional" active={step === 3} onClick={() => setStep(3)} />
            </div>

            <button className="ml-auto flex items-center gap-1.5 text-sm font-medium text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors">
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 mx-1" />

            <button className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-1.5 rounded-md transition-colors">
              <CloudUpload className="w-4 h-4" />
              Save as Draft
            </button>

            <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors">
              Publish
              <ChevronDown className="w-4 h-4" />
            </button>

            <button onClick={onExit} className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-100 transition-colors p-1" title="Exit to Frontend Apps">
              <X className="w-5 h-5" />
            </button>
          </header>

          {/* ============= BODY ============= */}
          {step === 1 && <BasicTab title={title} setTitle={setTitle} onNext={() => setStep(2)} />}
          {step === 2 && <CurriculumTab onBack={() => setStep(1)} onNext={() => setStep(3)} />}
          {step === 3 && <AdditionalSettingsTab onBack={() => setStep(2)} />}

          {/* Notebook vertical tab on right edge */}
          <button
            className="absolute top-1/2 -right-3 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-r-md py-3 px-1 shadow-md hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            title="Open Notebook"
          >
            <span
              className="text-xs font-bold text-gray-700 dark:text-zinc-100 tracking-wider"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              📒 Notebook
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ n, label, active, onClick }: { n: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 group">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-zinc-600 text-gray-500 dark:text-zinc-300 group-hover:bg-gray-300 dark:group-hover:bg-zinc-500'
      }`}>{n}</span>
      <span className={`text-xs ${active ? 'text-gray-900 dark:text-zinc-50 font-medium' : 'text-gray-500 dark:text-zinc-300'}`}>{label}</span>
    </button>
  )
}

// ============================================================
// BASIC TAB
// ============================================================
function BasicTab({ title, setTitle, onNext }: { title: string; setTitle: (t: string) => void; onNext: () => void }) {
  const [optionTab, setOptionTab] = useState<'general' | 'content-drip'>('general')
  const [maxStudents, setMaxStudents] = useState('0')
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [isPublic, setIsPublic] = useState(false)
  const [schedule, setSchedule] = useState(false)
  const [pricing, setPricing] = useState<'free' | 'paid'>('free')

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] divide-x divide-gray-100 dark:divide-zinc-700">
        {/* LEFT COLUMN */}
        <div className="p-8 bg-[#f9fafb] dark:bg-zinc-900 space-y-6">
          {/* Title + URL */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-100">Title</label>
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3 pr-9 border border-gray-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              {title && (
                <button onClick={() => setTitle('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-100">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-zinc-300">Course URL:</span>
              <a className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                https://tutor.hellotutorlms.com/courses/{title.toLowerCase().replace(/\s+/g, '-')}
                <LinkIcon className="w-3 h-3" />
              </a>
            </div>
          </section>

          {/* Description */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-100">Description</label>
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            </div>
            <button className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500/40 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
              <ImageIcon className="w-3.5 h-3.5" />
              Add media
            </button>
            <div className="border border-gray-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 overflow-hidden">
              <div className="flex items-center gap-0 border-b border-gray-100 dark:border-zinc-700 px-2">
                <button className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-zinc-50 border-b-2 border-blue-600 -mb-px">Visual</button>
                <button className="px-3 py-2 text-xs text-gray-500 dark:text-zinc-300 hover:text-gray-700 dark:hover:text-zinc-100">Text</button>
              </div>
              <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-700 overflow-x-auto">
                <select className="text-xs bg-transparent border-0 focus:outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 px-1 py-0.5 rounded">
                  <option>Paragraph</option>
                  <option>Heading 1</option>
                  <option>Heading 2</option>
                  <option>Heading 3</option>
                </select>
                <ToolbarDivider />
                <ToolbarIconBtn icon={<Bold className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<Italic className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<Underline className="w-3.5 h-3.5" />} />
                <ToolbarDivider />
                <ToolbarIconBtn icon={<List className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<ListOrdered className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<Quote className="w-3.5 h-3.5" />} />
                <ToolbarDivider />
                <ToolbarIconBtn icon={<AlignLeft className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<AlignCenter className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<AlignRight className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<AlignJustify className="w-3.5 h-3.5" />} />
                <ToolbarDivider />
                <ToolbarIconBtn icon={<LinkIcon className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<Strikethrough className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<Minus className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<Code className="w-3.5 h-3.5" />} />
                <ToolbarIconBtn icon={<Table className="w-3.5 h-3.5" />} />
              </div>
              <textarea
                className="w-full h-32 p-3 text-sm focus:outline-none resize-y bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-100"
                placeholder="Write your course description..."
              />
            </div>
          </section>

          {/* Options */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-50">Options</h3>
            <div className="grid grid-cols-[140px_1fr] border border-gray-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 overflow-hidden">
              <nav className="border-r border-gray-100 dark:border-zinc-700 py-2">
                <button
                  onClick={() => setOptionTab('general')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${
                    optionTab === 'general'
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 font-medium'
                      : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 border-l-2 border-transparent'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  General
                </button>
                <button
                  onClick={() => setOptionTab('content-drip')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${
                    optionTab === 'content-drip'
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 font-medium'
                      : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 border-l-2 border-transparent'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Content Drip
                </button>
              </nav>
              <div className="p-4 space-y-4">
                {optionTab === 'general' && (
                  <>
                    <Field label="Maximum Students">
                      <input
                        type="number"
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(e.target.value)}
                        className="w-24 h-9 px-2 border border-gray-200 dark:border-zinc-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white dark:bg-zinc-900"
                      />
                    </Field>
                    <Field label="Difficulty Level">
                      <div className="relative">
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="w-48 h-9 pl-3 pr-8 border border-gray-200 dark:border-zinc-600 rounded text-sm appearance-none bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option>All Levels</option>
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Expert</option>
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </Field>
                    <Field label="Public Course">
                      <ToggleSwitch checked={isPublic} onChange={setIsPublic} />
                    </Field>
                  </>
                )}
                {optionTab === 'content-drip' && (
                  <div className="text-xs text-gray-500 dark:text-zinc-300 py-4 space-y-2">
                    <DripTypeRadio label="Unlock on a specific date" />
                    <DripTypeRadio label="Unlock X days after enrollment" />
                    <DripTypeRadio label="Unlock after completing previous lesson" />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="p-6 bg-white dark:bg-zinc-800 space-y-5">
          <SidebarSection label="Visibility">
            <div className="relative">
              <select className="w-full h-9 pl-9 pr-8 border border-gray-200 dark:border-zinc-600 rounded text-sm appearance-none bg-white dark:bg-zinc-900">
                <option>Public</option>
                <option>Private</option>
                <option>Password protected</option>
              </select>
              <Eye className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-400 mt-1.5">Last updated on 27th November, 2024</p>
          </SidebarSection>

          <SidebarSection label="Schedule">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-zinc-300">Schedule course launch</span>
              <ToggleSwitch checked={schedule} onChange={setSchedule} />
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
                <input type="radio" checked={pricing === 'free'} onChange={() => setPricing('free')} className="w-4 h-4 text-blue-600 focus:ring-blue-500/30" />
                <span className="text-gray-700 dark:text-zinc-100">Free</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={pricing === 'paid'} onChange={() => setPricing('paid')} className="w-4 h-4 text-blue-600 focus:ring-blue-500/30" />
                <span className="text-gray-700 dark:text-zinc-100">Paid</span>
              </label>
            </div>
          </SidebarSection>

          <SidebarSection label="Categories">
            <button className="w-full h-9 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm text-left text-gray-500 dark:text-zinc-300 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Add
            </button>
          </SidebarSection>

          <SidebarSection label="Tags">
            <input type="text" placeholder="Add tags" className="w-full h-9 px-3 border border-gray-200 dark:border-zinc-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white dark:bg-zinc-900" />
          </SidebarSection>

          <SidebarSection label="Author">
            <button className="w-full flex items-center gap-2 p-2 border border-gray-200 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-zinc-600 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-zinc-100">tutor</div>
                <div className="text-[10px] text-gray-500 dark:text-zinc-400 truncate">admin@tutor.hellotutorlms.com</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </SidebarSection>

          <SidebarSection label="Instructors">
            <div className="relative">
              <input type="text" placeholder="Search to add instructor" className="w-full h-9 pl-9 pr-3 border border-gray-200 dark:border-zinc-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white dark:bg-zinc-900" />
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </SidebarSection>
        </aside>
      </div>

      <div className="flex justify-end items-center gap-2 px-6 py-3 border-t border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <button onClick={onNext} className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md text-sm text-gray-700 dark:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  )
}

// ============================================================
// CURRICULUM TAB
// ============================================================
type Item = { id: string; type: 'lesson' | 'quiz' | 'assignment'; title: string; meta?: string }
type Topic = { id: string; title: string; items: Item[]; expanded?: boolean }

const INITIAL_TOPICS: Topic[] = [
  {
    id: 't1', title: 'Introduction to Social Media Marketing', expanded: true,
    items: [
      { id: 'i1', type: 'lesson', title: 'What is Social Media Marketing?' },
      { id: 'i2', type: 'lesson', title: 'Why Social Media Matters for Business' },
      { id: 'i3', type: 'quiz', title: 'Introduction Quiz', meta: '(5 Questions)' },
      { id: 'i4', type: 'assignment', title: 'Set up your social media accounts' },
    ],
  },
  { id: 't2', title: 'Understanding Social Media Platforms', items: [] },
  { id: 't3', title: 'Creating Effective Social Media Content', items: [] },
  { id: 't4', title: 'Building Your Brand on Social Media', items: [] },
  { id: 't5', title: 'Social Media Analytics & Measurement', items: [] },
]

function CurriculumTab({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS)

  const toggleExpand = (id: string) => setTopics((ts) => ts.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t)))
  const expandAll = () => setTopics((ts) => ts.map((t) => ({ ...t, expanded: true })))
  const addTopic = () => setTopics((ts) => [...ts, { id: `t${Date.now()}`, title: 'New Topic', items: [], expanded: true }])
  const addItem = (topicId: string, type: Item['type']) =>
    setTopics((ts) => ts.map((t) => t.id === topicId ? {
      ...t,
      items: [...t.items, {
        id: `i${Date.now()}`,
        type,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        meta: type === 'quiz' ? '(0 Questions)' : undefined,
      }],
    } : t))

  return (
    <>
      <div className="p-6 bg-[#f9fafb] dark:bg-zinc-900 min-h-[600px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Curriculum</h2>
          </div>
          <button onClick={expandAll} className="text-xs text-gray-500 dark:text-zinc-300 hover:text-gray-700 dark:hover:text-zinc-100 hover:underline">Expand All</button>
        </div>

        <div className="space-y-3">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onToggle={() => toggleExpand(topic.id)}
              onAddLesson={() => addItem(topic.id, 'lesson')}
              onAddQuiz={() => addItem(topic.id, 'quiz')}
              onAddAssignment={() => addItem(topic.id, 'assignment')}
            />
          ))}
        </div>

        <button
          onClick={addTopic}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-[#ebf4ff] dark:bg-blue-500/10 hover:bg-[#d8e8ff] dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-md transition-colors"
        >
          <span className="w-5 h-5 bg-blue-600 text-white rounded flex items-center justify-center">
            <Plus className="w-3.5 h-3.5" />
          </span>
          Add Topic
        </button>
      </div>

      <div className="flex justify-end items-center gap-2 px-6 py-3 border-t border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
        </button>
        <button onClick={onNext} className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md text-sm text-gray-700 dark:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  )
}

function TopicCard({ topic, onToggle, onAddLesson, onAddQuiz, onAddAssignment }: {
  topic: Topic; onToggle: () => void; onAddLesson: () => void; onAddQuiz: () => void; onAddAssignment: () => void;
}) {
  return (
    <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
        <button className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-zinc-500 hover:text-gray-500 dark:hover:text-zinc-300">
          <GripVertical className="w-4 h-4" />
        </button>
        <button onClick={onToggle} className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-zinc-100">
          {topic.title}
        </button>
        <button className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-100 p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {topic.expanded && topic.items.length > 0 && (
        <div className="border-t border-gray-100 dark:border-zinc-700 bg-[#fafbfc] dark:bg-zinc-900">
          <div className="pl-12 pr-4 py-2 space-y-1">
            {topic.items.map((item) => <ItemRow key={item.id} item={item} />)}
          </div>
        </div>
      )}

      {topic.expanded && (
        <div className="border-t border-gray-100 dark:border-zinc-700 px-4 py-2.5 flex items-center gap-2 bg-white dark:bg-zinc-800">
          <AddButton icon="lesson" label="Lesson" onClick={onAddLesson} />
          <AddButton icon="quiz" label="Quiz" onClick={onAddQuiz} />
          <AddButton icon="assignment" label="Assignment" onClick={onAddAssignment} />
        </div>
      )}
    </div>
  )
}

function ItemRow({ item }: { item: Item }) {
  const { icon, color } = itemIcon(item.type)
  return (
    <div className="flex items-center gap-3 px-2 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer">
      <span className="text-gray-300 dark:text-zinc-500 cursor-grab">
        <GripVertical className="w-3.5 h-3.5" />
      </span>
      <span className={color}>{icon}</span>
      <span className="text-sm text-gray-700 dark:text-zinc-100 flex-1">{item.title}</span>
      {item.meta && <span className="text-xs text-gray-400 dark:text-zinc-400">{item.meta}</span>}
    </div>
  )
}

function AddButton({ icon, label, onClick }: { icon: 'lesson' | 'quiz' | 'assignment'; label: string; onClick: () => void }) {
  const { icon: IconEl, color } = itemIcon(icon)
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 dark:border-zinc-600 rounded text-xs text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
      <Plus className={`w-3 h-3 ${color}`} />
      {label}
    </button>
  )
}

function itemIcon(type: 'lesson' | 'quiz' | 'assignment') {
  switch (type) {
    case 'lesson': return { icon: <FileText className="w-4 h-4" />, color: 'text-gray-400' }
    case 'quiz': return { icon: <Puzzle className="w-4 h-4" />, color: 'text-amber-500' }
    case 'assignment': return { icon: <ClipboardCheck className="w-4 h-4" />, color: 'text-teal-500' }
  }
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
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-100 dark:hover:bg-zinc-800">
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Additional Settings</h2>
        </div>
        <div className="max-w-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg divide-y divide-gray-100 dark:divide-zinc-700">
          <SettingRow label="Course Q&A" description="Allow students to ask questions on lessons. Visible in course Q&A tab." checked={allowQa} onChange={setAllowQa} />
          <SettingRow label="Course Reviews" description="Enable/disable course reviews from students." checked={enableReview} onChange={setEnableReview} />
          <SettingRow label="Disable Course Preview" description="Disable lesson preview for non-enrolled users." checked={disablePreview} onChange={setDisablePreview} />
          <SettingRow label="Require Enrollment" description="Students must be enrolled to access course content." checked={requireEnrollment} onChange={setRequireEnrollment} />
        </div>
      </div>
      <div className="flex justify-end items-center gap-2 px-6 py-3 border-t border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-900">
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
          <ArrowRight className="w-4 h-4" />
          Publish Course
        </button>
      </div>
    </>
  )
}

// ============================================================
// SHARED HELPERS
// ============================================================
function SidebarSection({ label, aiIcon, children }: { label: string; aiIcon?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-semibold text-gray-700 dark:text-zinc-100">{label}</label>
        {aiIcon && <Sparkles className="w-3 h-3 text-pink-500" />}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-gray-600 dark:text-zinc-300 flex items-center gap-1 min-w-[120px]">
        <Info className="w-3.5 h-3.5 text-gray-400" />
        {label}
      </label>
      {children}
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}

function UploadBox({ icon, buttonText, secondaryText, helper }: { icon: React.ReactNode; buttonText: string; secondaryText?: string; helper: string }) {
  return (
    <div className="border border-dashed border-gray-200 dark:border-zinc-600 rounded-md p-4 text-center space-y-2">
      <div className="flex justify-center">{icon}</div>
      <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{buttonText}</button>
      {secondaryText && <button className="block mx-auto text-xs text-blue-600 dark:text-blue-400 hover:underline">{secondaryText}</button>}
      <p className="text-[10px] text-gray-400 dark:text-zinc-400">{helper}</p>
    </div>
  )
}

function ToolbarIconBtn({ icon }: { icon: React.ReactNode }) {
  return <button className="p-1 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded">{icon}</button>
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-gray-200 dark:bg-zinc-600 mx-0.5" />
}

function DripTypeRadio({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer">
      <input type="radio" name="drip-type" className="w-3.5 h-3.5 text-blue-600" />
      <span className="text-gray-700 dark:text-zinc-100">{label}</span>
    </label>
  )
}

function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between p-4 gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-800 dark:text-zinc-100">{label}</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 ml-5">{description}</p>
      </div>
      <button onClick={() => onChange(!checked)} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  )
}

// ============================================================
// FRONTEND APPS LANDING — grid of available apps
// ============================================================
export function FrontendAppsSection({ onLaunch }: { onLaunch: (appId: string) => void }) {
  const apps = [
    {
      id: 'course-builder',
      title: 'Course Builder',
      description: 'Tutor LMS course creation UI — 3-step wizard with Basic Tab (title, description, options, sidebar metadata), Curriculum Tab (topics, lessons, quizzes, assignments), and Additional Settings.',
      matchScore: 78,
      referenceDocs: ['tutor-lms-course-builder-basic', 'tutor-lms-course-builder-curriculum', 'tutor-lms-course-builder-additional-settings'],
      screenshots: 37,
      status: 'experiment',
    },
    {
      id: 'quiz-builder',
      title: 'Quiz Builder',
      description: 'Tutor LMS quiz creation interface with 13 question types (multiple choice, true/false, open-ended, fill-in-the-blank, matching, image answering, ordering, etc.).',
      matchScore: 0,
      referenceDocs: ['tutor-lms-quiz-creation', 'tutor-lms-quiz-settings', 'tutor-lms-ai-studio-quiz-builder'],
      screenshots: 22,
      status: 'planned',
    },
    {
      id: 'student-dashboard',
      title: 'Student Dashboard',
      description: 'Frontend student dashboard — home screen, my courses, quiz attempts, assignments, notes, discussions, calendar, profile menu.',
      matchScore: 0,
      referenceDocs: ['student-dashboard-overview', 'student-dashboard-home-screen', 'student-dashboard-courses'],
      screenshots: 18,
      status: 'planned',
    },
    {
      id: 'instructor-dashboard',
      title: 'Instructor Dashboard',
      description: 'Frontend instructor dashboard — home, courses, announcements, quiz attempts, assignments, discussions, live classes, certificate, analytics.',
      matchScore: 0,
      referenceDocs: ['instructor-dashboard-overview', 'instructor-dashboard-home', 'instructor-dashboard-courses'],
      screenshots: 24,
      status: 'planned',
    },
    {
      id: 'certificate-builder',
      title: 'Certificate Builder',
      description: 'Visual certificate design canvas with backdrops, layers, media library, templates, and keyboard shortcuts.',
      matchScore: 0,
      referenceDocs: ['certificate-builder-installation', 'certificate-builder-templates', 'certificate-builder-layers'],
      screenshots: 19,
      status: 'planned',
    },
    {
      id: 'native-ecommerce',
      title: 'Native eCommerce',
      description: 'Cart, checkout, payment methods, coupons, taxes, orders — Tutor LMS native eCommerce flow.',
      matchScore: 0,
      referenceDocs: ['native-ecommerce-overview', 'native-ecommerce-checkout', 'native-ecommerce-orders'],
      screenshots: 14,
      status: 'planned',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <LayoutGrid className="w-8 h-8 text-purple-500 shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Frontend Apps</h1>
          <p className="text-muted-foreground mt-1">
            Live recreations of Tutor LMS screens built on tailux template. Click any app to launch the full-screen interactive UI. Each app is benchmarked against real Tutor LMS screenshots via VLM analysis.
          </p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
          {apps.length} apps · {apps.filter(a => a.status === 'experiment').length} live
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app, i) => (
          <Card key={app.id} className={`flex flex-col ${app.status === 'experiment' ? 'border-purple-500/30 cursor-pointer hover:shadow-lg hover:border-purple-500/60 transition-all' : 'opacity-70'}`}>
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                {app.status === 'experiment' ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">● LIVE</Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/10 text-gray-500 dark:text-gray-400 text-[10px]">PLANNED</Badge>
                )}
              </div>
              <h3 className="font-semibold text-base mb-1">{app.title}</h3>
              <p className="text-xs text-muted-foreground flex-1 mb-3 leading-relaxed">{app.description}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reference screenshots:</span>
                  <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600 dark:text-pink-400">{app.screenshots} imgs</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reference docs:</span>
                  <span className="font-medium">{app.referenceDocs.length} pages</span>
                </div>
                {app.matchScore > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">VLM accuracy:</span>
                    <Badge variant="outline" className={`text-[10px] ${app.matchScore >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : app.matchScore >= 60 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>{app.matchScore}/100</Badge>
                  </div>
                )}
              </div>
              {app.status === 'experiment' && (
                <Button onClick={() => onLaunch(app.id)} className="w-full mt-4" size="sm">
                  Launch App <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
              {app.status !== 'experiment' && (
                <Button disabled className="w-full mt-4" size="sm" variant="outline">Coming Soon</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="font-semibold text-blue-600 dark:text-blue-400">How this works</div>
          <ul className="space-y-1 text-muted-foreground list-disc pl-4">
            <li>Each app is a real, interactive React component built into this webapp — no localhost needed.</li>
            <li>Click <strong>Launch App</strong> to open it full-screen. Click the X button in the app header to return here.</li>
            <li>Apps are benchmarked against real Tutor LMS screenshots using VLM (vision language model) analysis.</li>
            <li>Reference docs and screenshots come from the 291-page Tutor LMS docs bundle you provided.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
