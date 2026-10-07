import { useState } from 'react';
import { ArrowRight, Sparkles, Trash2, Layers, Bell } from 'lucide-react';
import {
  Button,
  Card,
  Tag,
  Badge,
  Highlight,
  Input,
  Select,
  LevelPicker,
  Modal,
  Accordion,
  Marquee,
  StatBox,
  StatBoxGroup,
  ProgressBar,
  Tabs,
  Skeleton,
  EmptyState,
  ErrorState,
  useToast,
} from '../components/ui';

export default function ComponentKit() {
  const [level, setLevel] = useState(3);
  const [compactLevel, setCompactLevel] = useState(1);
  const [btnLoading, setBtnLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('swe');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [progressVal, setProgressVal] = useState(65);

  const { toast } = useToast();

  const careerOptions = [
    { value: 'swe', label: 'Software Engineer' },
    { value: 'data-scientist', label: 'Data Scientist' },
    { value: 'devops', label: 'DevOps & Cloud Engineer' },
    { value: 'security', label: 'Security Analyst' },
  ];

  const accordionItems = [
    {
      id: 'faq-1',
      title: 'Is SkillGraph free for students?',
      content: 'Yes! SkillGraph is completely free and designed for engineering and CS students.',
    },
    {
      id: 'faq-2',
      title: 'How is estimated career alignment calculated?',
      content: 'Alignment combines skill coverage (85%) and prerequisite readiness (15%) into a 0-100 score.',
    },
    {
      id: 'faq-3',
      title: 'Is my OpenRouter API key safe?',
      content: 'Your key is encrypted on our server with AES-256-GCM and never returned to the browser.',
    },
  ];

  const tabItems = [
    { id: 'all', label: 'ALL SKILLS', icon: <Layers size={14} /> },
    { id: 'core', label: 'CORE PREREQUISITES' },
    { id: 'recommended', label: 'RECOMMENDED' },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="border-b-2 border-ink pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Tag tone="brand">DEV ONLY · DESIGN SYSTEM</Tag>
              <h1 className="font-display uppercase text-3xl md:text-5xl mt-3 tracking-tight">
                UI COMPONENT <Highlight>KIT</Highlight>
              </h1>
              <p className="font-sans text-muted mt-2 text-base">
                Neo-brutalist design tokens and interactive primitives for SkillGraph.
              </p>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink hover:text-brand"
            >
              ← Back to Home
            </a>
          </div>
        </header>

        {/* 1. Highlight & Typography */}
        <section className="space-y-4">
          <Tag tone="pop">01 · TYPOGRAPHY & HIGHLIGHT</Tag>
          <Card tone="default">
            <h2 className="font-display uppercase text-2xl md:text-3xl tracking-tight mb-4">
              YOUR SKILLS. <Highlight>YOUR PATH.</Highlight>
            </h2>
            <p className="font-sans text-base text-ink mb-2">
              Body text uses Inter font (400 / 500 / 600) for calm readability across desktop and
              mobile views.
            </p>
            <p className="font-mono text-xs text-muted">
              JetBrains Mono for tags, numbers, and code chips: LV 3 / 4 · FIT 78% · 2026-Q1
            </p>
          </Card>
        </section>

        {/* 2. Marquee */}
        <section className="space-y-4">
          <Tag tone="brand">02 · MARQUEE STRIP</Tag>
          <Marquee />
        </section>

        {/* 3. Buttons */}
        <section className="space-y-4">
          <Tag tone="brand">03 · BUTTONS</Tag>
          <Card tone="default" className="space-y-6">
            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                Variants (Primary, Secondary, Danger, Ghost)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">BUILD MY GRAPH</Button>
                <Button variant="secondary">VIEW DEMO</Button>
                <Button variant="danger" icon={<Trash2 size={16} />}>
                  DELETE SKILL
                </Button>
                <Button variant="ghost">CANCEL</Button>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                Sizes (sm 36px, md 44px, lg 52px)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">SMALL (36PX)</Button>
                <Button size="md">MEDIUM (44PX)</Button>
                <Button size="lg" icon={<ArrowRight size={18} />}>
                  LARGE (52PX)
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                Interactive Loading Toggle
              </h3>
              <div className="flex items-center gap-4">
                <Button
                  loading={btnLoading}
                  onClick={() => setBtnLoading(!btnLoading)}
                  icon={<Sparkles size={16} />}
                >
                  {btnLoading ? 'SAVING...' : 'TEST LOADING STATE'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBtnLoading(!btnLoading)}
                >
                  TOGGLE SPINNER
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* 4. Badges & Tags */}
        <section className="space-y-4">
          <Tag tone="pop">04 · BADGES & TAGS</Tag>
          <Card tone="default" className="space-y-4">
            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-2">
                Status Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge status="mastered" />
                <Badge status="partial" />
                <Badge status="missing" />
                <Badge status="next" />
                <Badge status="strong" />
                <Badge status="developing" />
                <Badge status="major" />
                <Badge status="critical" />
              </div>
            </div>
          </Card>
        </section>

        {/* 5. Inputs & Select */}
        <section className="space-y-4">
          <Tag tone="brand">05 · FORM INPUTS & SELECTS</Tag>
          <Card tone="default" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="e.g. Prabha"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Select
                label="Target Career"
                options={careerOptions}
                value={selectValue}
                onChange={setSelectValue}
              />
            </div>
          </Card>
        </section>

        {/* 6. Cards & Tones */}
        <section className="space-y-4">
          <Tag tone="pop">06 · CARDS & COLOR TONES</Tag>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Card tone="default" hoverable>
              <h3 className="font-display uppercase text-base mb-1">DEFAULT SURFACE</h3>
              <p className="text-xs text-muted">White background with hard ink shadow-md.</p>
            </Card>

            <Card tone="brand" hoverable>
              <h3 className="font-display uppercase text-base mb-1">BRAND VIOLET</h3>
              <p className="text-xs text-white/80">Signature primary CTA card with white text.</p>
            </Card>

            <Card tone="pop" hoverable>
              <h3 className="font-display uppercase text-base mb-1">POP PINK</h3>
              <p className="text-xs text-ink/80">High-energy highlight card for special notices.</p>
            </Card>

            <Card tone="sky" hoverable>
              <h3 className="font-display uppercase text-base mb-1">SKY BLUE</h3>
              <p className="text-xs text-ink/80">Open-source & career track reference tone.</p>
            </Card>

            <Card tone="ink" hoverable>
              <h3 className="font-display uppercase text-base mb-1">DEEP INK</h3>
              <p className="text-xs text-paper/80">Dark CTA band styling with shadow-brand.</p>
            </Card>
          </div>
        </section>

        {/* 7. StatBox Group */}
        <section className="space-y-4">
          <Tag tone="brand">07 · STAT BOXES (SHARED BORDERS)</Tag>
          <StatBoxGroup>
            <StatBox value="5" label="CAREERS" />
            <StatBox value="71" label="SKILLS" />
            <StatBox value="1" label="GRAPH CANVAS" />
            <StatBox value="0" label="GUESSWORK" />
          </StatBoxGroup>
        </section>

        {/* 8. Progress Bar */}
        <section className="space-y-4">
          <Tag tone="pop">08 · PROGRESS BAR (24PX HARD-EDGED)</Tag>
          <Card tone="default" className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span>ESTIMATED ALIGNMENT</span>
              <span>{progressVal}%</span>
            </div>
            <ProgressBar value={progressVal} showLabel />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setProgressVal(35)}>
                35%
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setProgressVal(65)}>
                65%
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setProgressVal(90)}>
                90%
              </Button>
            </div>
          </Card>
        </section>

        {/* 9. Tabs */}
        <section className="space-y-4">
          <Tag tone="brand">09 · TABS (UNDERLINE-LESS)</Tag>
          <Card tone="default">
            <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />
            <div className="p-4 bg-paper border-2 border-line text-sm font-medium">
              Currently viewing tab: <strong className="uppercase font-bold text-brand">{activeTab}</strong>
            </div>
          </Card>
        </section>

        {/* 10. Accordion */}
        <section className="space-y-4">
          <Tag tone="pop">10 · ACCORDION (FAQ BORDERED CARDS)</Tag>
          <Accordion items={accordionItems} defaultOpenId="faq-1" />
        </section>

        {/* 11. Modal Dialog */}
        <section className="space-y-4">
          <Tag tone="brand">11 · MODAL DIALOG</Tag>
          <Card tone="default">
            <p className="text-sm text-ink mb-4">
              Centered modal dialog with focus trapping, Escape key listener, and focus restoration.
            </p>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              OPEN DEMO MODAL
            </Button>
          </Card>
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="OPENROUTER API KEY"
          >
            <div className="space-y-4 text-sm text-ink">
              <p>
                Use your own key so the assistant works without limits. Your key is encrypted on our server and never shown again.
              </p>
              <Input label="Paste Your Key" type="password" placeholder="sk-or-..." />
              <div className="flex justify-end gap-2 pt-2 border-t-2 border-line">
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  CANCEL
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
                  SAVE KEY
                </Button>
              </div>
            </div>
          </Modal>
        </section>

        {/* 12. Toast Notifications */}
        <section className="space-y-4">
          <Tag tone="pop">12 · TOAST NOTIFICATIONS (BOTTOM-RIGHT 4S)</Tag>
          <Card tone="default">
            <p className="text-sm text-ink mb-4">
              Trigger neo-brutalist toast notifications that automatically disappear after 4 seconds.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                icon={<Bell size={16} />}
                onClick={() => toast.success('Your graph is ready!')}
              >
                SUCCESS TOAST
              </Button>
              <Button
                variant="danger"
                onClick={() => toast.error('We could not reach the server.')}
              >
                ERROR TOAST
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast.info('Statistics updated to Intermediate')}
              >
                INFO TOAST
              </Button>
            </div>
          </Card>
        </section>

        {/* 13. EmptyState & ErrorState */}
        <section className="space-y-4">
          <Tag tone="brand">13 · DATA VIEW STATES</Tag>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              title="NO SKILLS YET"
              text="Add a few skills in your profile and your graph will light up with personalized pathways."
              actionLabel="ADD SKILLS"
              onAction={() => alert('Add skills clicked')}
            />

            <ErrorState
              title="COULD NOT LOAD GRAPH"
              message="The server took too long to calculate your alignment. Please check your connection."
              onRetry={() => alert('Retry clicked')}
            />
          </div>
        </section>

        {/* 14. Skeletons */}
        <section className="space-y-4">
          <Tag tone="pop">14 · SKELETON LOADERS</Tag>
          <Card tone="default" className="space-y-4">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          </Card>
        </section>

        {/* 15. Signature Control: LevelPicker */}
        <section className="space-y-4">
          <Tag tone="brand">15 · LEVEL PICKER (SIGNATURE CONTROL)</Tag>
          <Card tone="default" className="space-y-8">
            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                Standard LevelPicker (Click segments or use ← → arrow keys)
              </h3>
              <div className="flex items-center justify-center p-6 border-2 border-line bg-paper">
                <LevelPicker value={level} onChange={setLevel} />
              </div>
              <p className="text-center font-mono text-xs text-muted mt-2">
                Current State: Level {level}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-line">
              <div>
                <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                  Compact Mode
                </h3>
                <div className="flex items-center justify-center p-4 border-2 border-line bg-paper">
                  <LevelPicker value={compactLevel} onChange={setCompactLevel} compact />
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                  Disabled Mode
                </h3>
                <div className="flex items-center justify-center p-4 border-2 border-line bg-paper">
                  <LevelPicker value={4} disabled />
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t-2 border-ink text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
            SkillGraph Design System · Team SkillGraph 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
