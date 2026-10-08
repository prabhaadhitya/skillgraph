import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Network,
  Target,
  Milestone,
  Compass,
  Bot,
  Key,
  ArrowRight,
  LogIn,
  CheckCircle2,
} from 'lucide-react';

import { Navbar } from '../../components/layout/Navbar.jsx';
import { Footer } from '../../components/layout/Footer.jsx';
import {
  Button,
  Card,
  Tag,
  Highlight,
  Select,
  Accordion,
  Marquee,
  StatBox,
  StatBoxGroup,
} from '../../components/ui';
import { api, USE_MOCKS } from '../../services/api.js';
import { MiniGraphIllustration } from './MiniGraphIllustration.jsx';

export const CAREER_OPTIONS = [
  { value: 'software-developer', label: 'Software Developer' },
  { value: 'full-stack-developer', label: 'Full Stack Developer' },
  { value: 'data-analyst', label: 'Data Analyst' },
  { value: 'data-scientist', label: 'Data Scientist' },
  { value: 'machine-learning-engineer', label: 'Machine Learning Engineer' },
];

export const CAREER_LIST = [
  {
    slug: 'software-developer',
    name: 'Software Developer',
    description:
      'Master core algorithms, data structures, and computer science engineering fundamentals.',
    tone: 'default',
  },
  {
    slug: 'full-stack-developer',
    name: 'Full Stack Developer',
    description:
      'Architect complete end-to-end applications spanning responsive frontends, APIs, and databases.',
    tone: 'sky',
  },
  {
    slug: 'data-analyst',
    name: 'Data Analyst',
    description:
      'Transform complex business datasets into structured queries and actionable visual dashboards.',
    tone: 'default',
  },
  {
    slug: 'data-scientist',
    name: 'Data Scientist',
    description:
      'Uncover predictive patterns through statistical modeling, mathematical rigor, and machine learning.',
    tone: 'default',
  },
  {
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    description:
      'Design, train, and deploy production-grade machine learning pipelines and intelligent models.',
    tone: 'default',
  },
];

export const FAQ_ITEMS = [
  {
    id: 'faq-1',
    title: 'Is SkillGraph free?',
    content:
      'Yes, SkillGraph is completely free for students. All graph exploration, gap analysis, and learning path planning features are available without charge.',
  },
  {
    id: 'faq-2',
    title: 'How is career alignment calculated?',
    content:
      'A weighted match of your levels against what the career needs; an estimate, not a prediction.',
  },
  {
    id: 'faq-3',
    title: 'Is my API key safe?',
    content:
      'Encrypted on the server, never shown again, removable any time.',
  },
  {
    id: 'faq-4',
    title: 'Is the AI always right?',
    content:
      'Facts come from the skill graph and rules; the AI only explains them.',
  },
  {
    id: 'faq-5',
    title: 'Which careers are supported?',
    content:
      'We currently support Software Developer, Full Stack Developer, Data Analyst, Data Scientist, and Machine Learning Engineer.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [selectedCareer, setSelectedCareer] = useState('software-developer');

  useEffect(() => {
    document.title = 'SkillGraph — See the skills between you and your dream job';
  }, []);

  // Fetch metadata counts with TanStack Query
  const { data: metaData } = useQuery({
    queryKey: ['meta'],
    queryFn: async () => {
      if (USE_MOCKS) {
        return { counts: { skills: 71, careers: 5 } };
      }
      return api.get('/meta');
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Fetch live careers list if available
  const { data: careersData } = useQuery({
    queryKey: ['careers-list'],
    queryFn: async () => {
      if (USE_MOCKS) {
        return CAREER_OPTIONS;
      }
      return api.get('/careers').catch(() => CAREER_OPTIONS);
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const skillsCount = metaData?.counts?.skills || metaData?.skills || 71;
  const careersCount = metaData?.counts?.careers || metaData?.careers || 5;

  const careerChips = Array.isArray(careersData)
    ? careersData.map((c) => ({
        value: c.slug || c.value,
        label: c.name || c.label,
      }))
    : CAREER_OPTIONS;

  const handleCareerSelect = (slug) => {
    navigate(`/register?career=${encodeURIComponent(slug)}`);
  };

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-hidden flex flex-col font-sans selection:bg-brand selection:text-white">
      {/* Floating Pill Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* Section A: Hero */}
        <section
          id="hero"
          aria-labelledby="hero-heading"
          className="pt-28 sm:pt-32 pb-16 px-4 md:px-6 text-center max-w-5xl mx-auto"
        >
          <div className="mb-6 flex justify-center">
            <Tag tone="brand" className="tracking-widest">
              FREE FOR STUDENTS · AI-POWERED
            </Tag>
          </div>

          <h1
            id="hero-heading"
            className="font-display uppercase text-[34px] sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.08] text-ink mb-4"
          >
            YOUR SKILLS.
            <br />
            <Highlight>YOUR PATH.</Highlight>
            <span className="block text-2xl sm:text-3xl md:text-4xl text-ink font-display uppercase tracking-tight mt-3">
              See the skills between you and your dream job
            </span>
          </h1>

          <p className="font-sans text-muted text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
            Turn what you know into a visual prerequisite graph, discover what is missing,
            and follow an ordered path to career readiness.
          </p>

          {/* Action Buttons: GET STARTED -> /register, LOG IN -> /login */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 max-w-md mx-auto">
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={18} />}
              className="w-full sm:w-auto font-display uppercase tracking-wider px-8"
              onClick={() => navigate('/register')}
            >
              GET STARTED
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={<LogIn size={18} />}
              className="w-full sm:w-auto font-display uppercase tracking-wider px-8"
              onClick={() => navigate('/login')}
            >
              LOG IN
            </Button>
          </div>

          {/* Hero Card + SVG Illustration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto text-left items-center">
            {/* Left: Quick Career Picker Card */}
            <div className="lg:col-span-5 bg-surface border-2 border-ink shadow-lg p-6 sm:p-7">
              <div className="space-y-4">
                <Select
                  id="hero-career-select"
                  label="TARGET CAREER"
                  value={selectedCareer}
                  onChange={(e) => setSelectedCareer(e.target.value)}
                  options={CAREER_OPTIONS}
                />

                <Button
                  variant="primary"
                  size="md"
                  icon={<ArrowRight size={18} />}
                  className="w-full font-display uppercase tracking-wider py-3.5"
                  onClick={() => handleCareerSelect(selectedCareer)}
                >
                  BUILD MY GRAPH
                </Button>
              </div>

              {/* 5 Career Chips */}
              <div className="mt-5 pt-4 border-t-2 border-line">
                <p className="text-xs font-mono font-bold uppercase text-muted mb-2.5 tracking-wider">
                  Select a target career:
                </p>
                <div className="flex flex-wrap gap-2">
                  {careerChips.slice(0, 5).map((career) => (
                    <button
                      key={career.value}
                      type="button"
                      onClick={() => handleCareerSelect(career.value)}
                      className="px-2.5 py-1 text-xs font-sans font-bold border-2 border-ink bg-paper hover:bg-brand hover:text-white transition-all duration-120 cursor-pointer shadow-sm active:translate-y-0.5 focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {career.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Decorative Neo-Brutalist Mini Graph Illustration */}
            <div className="lg:col-span-7 bg-surface border-2 border-ink shadow-lg p-4 sm:p-6 flex flex-col justify-center">
              <div className="flex items-center justify-between border-b-2 border-line pb-2 mb-3">
                <span className="font-mono text-xs font-bold uppercase text-muted tracking-wider">
                  Live Prerequisite Topology
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-brand-soft border border-ink text-brand">
                  GRAPH VISUALIZER
                </span>
              </div>
              <MiniGraphIllustration />
            </div>
          </div>
        </section>

        {/* Section B: Marquee Strip */}
        <div className="py-4">
          <Marquee
            items={[
              'SKILL GRAPH',
              'SKILL GAPS',
              'LEARNING PATH',
              'CAREER ALIGNMENT',
              'ASK THE AI',
              'BRING YOUR OWN KEY',
            ]}
          />
        </div>

        {/* Section C: Stats Row */}
        <section
          aria-label="SkillGraph Statistics"
          className="max-w-4xl mx-auto px-4 my-14"
        >
          <StatBoxGroup>
            <StatBox value={skillsCount} label="SKILLS" />
            <StatBox value={careersCount} label="CAREERS" />
            <StatBox value="1" label="GRAPH" />
            <StatBox value="0" label="GUESSWORK" />
          </StatBoxGroup>
        </section>

        {/* Section D: 3-Step How It Works Row */}
        <section
          id="how-it-works"
          aria-labelledby="hiw-heading"
          className="max-w-5xl mx-auto px-4 md:px-6 my-20"
        >
          <div className="text-center mb-10">
            <Tag tone="pop">HOW IT WORKS</Tag>
            <h2
              id="hiw-heading"
              className="font-display uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink mt-3"
            >
              FROM SKILLS TO <Highlight>PATH</Highlight>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Tell us your skills */}
            <Card className="p-6 border-2 border-ink shadow-md bg-surface flex flex-col justify-between">
              <div>
                <span className="font-display text-4xl text-brand block mb-3">
                  01
                </span>
                <h3 className="font-display uppercase text-lg text-ink mb-2">
                  TELL US YOUR SKILLS
                </h3>
                <p className="font-sans text-sm text-muted">
                  Rate what you already know from Beginner to Advanced across programming,
                  data, tools, and systems.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t-2 border-line flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <CheckCircle2 size={14} className="text-state-mastered" />
                <span>5-minute onboarding</span>
              </div>
            </Card>

            {/* Step 2: See your skill graph */}
            <Card className="p-6 border-2 border-ink shadow-md bg-surface flex flex-col justify-between">
              <div>
                <span className="font-display text-4xl text-brand block mb-3">
                  02
                </span>
                <h3 className="font-display uppercase text-lg text-ink mb-2">
                  SEE YOUR SKILL GRAPH
                </h3>
                <p className="font-sans text-sm text-muted">
                  Watch your target career subgraph light up with color-coded masteries,
                  open gaps, and prerequisite unlocks.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t-2 border-line flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <CheckCircle2 size={14} className="text-state-mastered" />
                <span>Real DAG topological order</span>
              </div>
            </Card>

            {/* Step 3: Follow your path */}
            <Card className="p-6 border-2 border-ink shadow-md bg-surface flex flex-col justify-between">
              <div>
                <span className="font-display text-4xl text-brand block mb-3">
                  03
                </span>
                <h3 className="font-display uppercase text-lg text-ink mb-2">
                  FOLLOW YOUR PATH
                </h3>
                <p className="font-sans text-sm text-muted">
                  Tackle ready-now recommendations in topological order, raise proficiencies,
                  and monitor career alignment rise.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t-2 border-line flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <CheckCircle2 size={14} className="text-state-mastered" />
                <span>No skipped prerequisites</span>
              </div>
            </Card>
          </div>
        </section>

        {/* Section E: Feature Showcase */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="max-w-5xl mx-auto px-4 md:px-6 my-20"
        >
          <div className="text-center mb-10">
            <Tag tone="brand">PLATFORM CAPABILITIES</Tag>
            <h2
              id="features-heading"
              className="font-display uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink mt-3"
            >
              EVERYTHING YOU NEED TO <Highlight>SUCCEED</Highlight>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 border-2 border-ink shadow-md bg-surface">
              <div className="p-2.5 w-fit border-2 border-ink bg-brand-soft text-brand mb-4">
                <Network size={22} />
              </div>
              <h3 className="font-display uppercase text-base text-ink mb-2">
                TOPOLOGICAL GRAPH
              </h3>
              <p className="font-sans text-sm text-muted">
                Interactive DAG layout powered by xyflow and dagre. Inspect prerequisites
                and downstream dependents.
              </p>
            </Card>

            <Card className="p-6 border-2 border-ink shadow-md bg-surface">
              <div className="p-2.5 w-fit border-2 border-ink bg-brand-soft text-brand mb-4">
                <Target size={22} />
              </div>
              <h3 className="font-display uppercase text-base text-ink mb-2">
                CAREER FIT SCORING
              </h3>
              <p className="font-sans text-sm text-muted">
                Weighted alignment calculated with mathematical rigor from skill coverage
                and prerequisite readiness ratios.
              </p>
            </Card>

            <Card className="p-6 border-2 border-ink shadow-md bg-surface">
              <div className="p-2.5 w-fit border-2 border-ink bg-brand-soft text-brand mb-4">
                <Milestone size={22} />
              </div>
              <h3 className="font-display uppercase text-base text-ink mb-2">
                ORDERED ROADMAP
              </h3>
              <p className="font-sans text-sm text-muted">
                Never get stuck learning advanced topics before mastering the foundational
                building blocks they depend on.
              </p>
            </Card>

            <Card className="p-6 border-2 border-ink shadow-md bg-surface">
              <div className="p-2.5 w-fit border-2 border-ink bg-brand-soft text-brand mb-4">
                <Compass size={22} />
              </div>
              <h3 className="font-display uppercase text-base text-ink mb-2">
                WHAT-IF SIMULATION
              </h3>
              <p className="font-sans text-sm text-muted">
                Thinking of pivoting? Compare careers side-by-side and simulate how your
                skills translate without changing your profile.
              </p>
            </Card>

            <Card className="p-6 border-2 border-ink shadow-md bg-surface">
              <div className="p-2.5 w-fit border-2 border-ink bg-brand-soft text-brand mb-4">
                <Bot size={22} />
              </div>
              <h3 className="font-display uppercase text-base text-ink mb-2">
                GROUNDED AI ASSISTANT
              </h3>
              <p className="font-sans text-sm text-muted">
                Our assistant is anchored to real graph facts. It explains recommendations,
                timelines, and prerequisites without hallucinations.
              </p>
            </Card>

            <Card className="p-6 border-2 border-ink shadow-md bg-surface">
              <div className="p-2.5 w-fit border-2 border-ink bg-brand-soft text-brand mb-4">
                <Key size={22} />
              </div>
              <h3 className="font-display uppercase text-base text-ink mb-2">
                BRING YOUR OWN KEY
              </h3>
              <p className="font-sans text-sm text-muted">
                Connect your OpenRouter API key for unlimited private queries, encrypted
                at rest and decrypted only in memory.
              </p>
            </Card>
          </div>
        </section>

        {/* Section F: Career Catalog */}
        <section
          id="careers"
          aria-labelledby="careers-heading"
          className="max-w-5xl mx-auto px-4 md:px-6 my-20"
        >
          <div className="text-center mb-10">
            <Tag tone="pop">SUPPORTED PATHWAYS</Tag>
            <h2
              id="careers-heading"
              className="font-display uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink mt-3"
            >
              FIVE CAREERS TO START <Highlight>EXPLORING</Highlight>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAREER_LIST.map((career) => (
              <Card
                key={career.slug}
                className="p-6 border-2 border-ink shadow-md bg-surface flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-display uppercase text-lg text-ink mb-2">
                    {career.name}
                  </h3>
                  <p className="font-sans text-sm text-muted mb-4">
                    {career.description}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleCareerSelect(career.slug)}
                >
                  START PATHWAY
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* Section G: FAQ Accordion */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="max-w-4xl mx-auto px-4 md:px-6 my-20"
        >
          <div className="text-center mb-10">
            <Tag tone="brand">CLEAR ANSWERS</Tag>
            <h2
              id="faq-heading"
              className="font-display uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink mt-3"
            >
              FREQUENTLY ASKED <Highlight>QUESTIONS</Highlight>
            </h2>
          </div>

          <Accordion items={FAQ_ITEMS} />
        </section>

        {/* Section H: Bottom CTA */}
        <section className="bg-ink text-white py-16 px-4 md:px-8 border-y-2 border-ink shadow-brand my-12">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight">
              MAP YOUR NEXT <span className="text-brand-soft">SKILL MOVE</span>
            </h2>
            <p className="font-sans text-line text-sm sm:text-base max-w-xl mx-auto">
              Join students modeling their career readiness. Free, grounded, and
              built for practical learning.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight size={18} />}
                className="px-8 font-display uppercase tracking-wider"
                onClick={() => navigate('/register')}
              >
                GET STARTED FOR FREE
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Section I: Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;
