import { useState } from 'react';
import { ArrowRight, Sparkles, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  Tag,
  Badge,
  Highlight,
  Input,
  Select,
  LevelPicker,
} from '../components/ui';

export default function ComponentKit() {
  const [level, setLevel] = useState(3);
  const [compactLevel, setCompactLevel] = useState(1);
  const [btnLoading, setBtnLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('swe');

  const careerOptions = [
    { value: 'swe', label: 'Software Engineer' },
    { value: 'data-scientist', label: 'Data Scientist' },
    { value: 'devops', label: 'DevOps & Cloud Engineer' },
    { value: 'security', label: 'Security Analyst' },
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

        {/* 2. Buttons */}
        <section className="space-y-4">
          <Tag tone="brand">02 · BUTTONS</Tag>
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
                Loading & Disabled States
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button loading={btnLoading} onClick={() => setBtnLoading(!btnLoading)}>
                  {btnLoading ? 'SAVING...' : 'TOGGLE LOADING'}
                </Button>
                <Button variant="primary" loading={true}>
                  FIXED WIDTH SPINNER
                </Button>
                <Button variant="primary" disabled>
                  DISABLED PRIMARY
                </Button>
                <Button variant="secondary" disabled>
                  DISABLED SECONDARY
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* 3. Cards */}
        <section className="space-y-4">
          <Tag tone="sky">03 · CARDS & TONES</Tag>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card tone="default" hoverable>
              <Tag tone="default" className="mb-3">
                TONE: DEFAULT
              </Tag>
              <h3 className="font-display text-lg uppercase mb-2">Default Card</h3>
              <p className="text-sm text-muted">
                Surface white background with 2px ink border and hard shadow-md. Hoverable!
              </p>
            </Card>

            <Card tone="brand" hoverable>
              <Tag tone="pop" className="mb-3">
                TONE: BRAND
              </Tag>
              <h3 className="font-display text-lg uppercase mb-2">Brand Violet Card</h3>
              <p className="text-sm text-white/90">
                Electric violet background with white text and 2px ink border.
              </p>
            </Card>

            <Card tone="pop" hoverable>
              <Tag tone="default" className="mb-3">
                TONE: POP
              </Tag>
              <h3 className="font-display text-lg uppercase mb-2">Pop Accent Card</h3>
              <p className="text-sm text-ink">
                Hot pink accent tone for highlights, badges, and attention cards.
              </p>
            </Card>

            <Card tone="sky" hoverable>
              <Tag tone="brand" className="mb-3">
                TONE: SKY
              </Tag>
              <h3 className="font-display text-lg uppercase mb-2">Sky Blue Card</h3>
              <p className="text-sm text-ink">
                Soft cyan tone for use cases like open-source contributing and career tracks.
              </p>
            </Card>

            <Card tone="ink" hoverable className="md:col-span-2">
              <Tag tone="pop" className="mb-3">
                TONE: INK (DARK CTA)
              </Tag>
              <h3 className="font-display text-2xl uppercase mb-2 text-paper">
                DARK CTA BAND WITH <Highlight>BRAND SHADOW</Highlight>
              </h3>
              <p className="text-sm text-paper/80 mb-4">
                Black background with electric violet shadow-brand. Used for high-impact footer CTA
                sections.
              </p>
              <div className="flex gap-3">
                <Button variant="primary" icon={<Sparkles size={16} />}>
                  GET STARTED NOW
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* 4. Tags & Badges */}
        <section className="space-y-4">
          <Tag tone="ink">04 · TAGS & STATUS BADGES</Tag>
          <Card tone="default" className="space-y-6">
            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                Square Tags (Section Chips & Labels)
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="default">DEFAULT</Tag>
                <Tag tone="brand">BRAND</Tag>
                <Tag tone="pop">POP ACCENT</Tag>
                <Tag tone="sky">SKY</Tag>
                <Tag tone="ink">DARK INK</Tag>
                <Tag tone="soft">SOFT BRAND</Tag>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                Pill Badges (Always Icon + Text, Never Color Alone)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge status="mastered" />
                <Badge status="partial" />
                <Badge status="missing" />
                <Badge status="next" />
                <Badge status="strong" />
                <Badge status="developing" />
                <Badge status="major" />
                <Badge status="critical" />
                <Badge status="muted" />
              </div>
            </div>
          </Card>
        </section>

        {/* 5. Inputs & Selects */}
        <section className="space-y-4">
          <Tag tone="brand">05 · FORM CONTROLS (48PX HEIGHT)</Tag>
          <Card tone="default" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Target Career or Goal"
                placeholder="e.g. Full Stack Engineer"
                hint="We will tailor your skill graph to this career target."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />

              <Select
                label="Career Pathway"
                hint="Choose from curated industry roles."
                options={careerOptions}
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="OpenRouter API Key"
                placeholder="sk-or-v1-..."
                error="Invalid API key format. Expected sk-or-..."
                defaultValue="invalid_key_sample"
              />

              <Input
                label="Disabled Input"
                disabled
                defaultValue="System generated username"
                hint="This field cannot be edited."
              />
            </div>
          </Card>
        </section>

        {/* 6. Signature Control: LevelPicker */}
        <section className="space-y-4">
          <Tag tone="pop">06 · LEVEL PICKER (SIGNATURE CONTROL)</Tag>
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

            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-muted mb-3">
                All 6 Distinct Levels (0 to 5)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[0, 1, 2, 3, 4, 5].map((lvl) => (
                  <div key={lvl} className="p-3 border-2 border-line bg-surface text-center">
                    <LevelPicker value={lvl} compact />
                  </div>
                ))}
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
