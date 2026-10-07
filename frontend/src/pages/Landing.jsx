import { useState } from 'react';
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
} from 'lucide-react';

import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
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
} from '../components/ui';
import { api, USE_MOCKS } from '../services/api.js';

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

export default function Landing() {
  const navigate = useNavigate();
  const [selectedCareer, setSelectedCareer] = useState('software-developer');

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

  const skillsCount =
    metaData?.counts?.skills || metaData?.skills || 71;
  const careersCount =
    metaData?.counts?.careers || metaData?.careers || 5;

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
              FREE FOR STUDENTS - AI-POWERED
            </Tag>
          </div>

          <h1
            id="hero-heading"
            className="font-display uppercase text-[38px] sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.08] text-ink mb-6"
          >
            YOUR SKILLS.
            <br />
            <Highlight>YOUR PATH.</Highlight>
          </h1>

          <p className="font-sans text-muted text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Turn what you know into a graph, see what is missing, and get a
            step-by-step path to the career you want.
          </p>

          {/* Hero Card */}
          <div className="bg-surface border-2 border-ink shadow-lg p-6 sm:p-8 max-w-xl mx-auto text-left">
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
                size="lg"
                icon={<ArrowRight size={18} />}
                className="w-full font-display uppercase tracking-wider py-3.5"
                onClick={() => handleCareerSelect(selectedCareer)}
              >
                BUILD MY GRAPH
              </Button>
            </div>

            {/* Career Chips */}
            <div className="mt-5 pt-4 border-t-2 border-line">
              <p className="text-xs font-mono font-bold uppercase text-muted mb-2.5 tracking-wider">
                Try these careers:
              </p>
              <div className="flex flex-wrap gap-2">
                {CAREER_OPTIONS.map((career) => (
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

        {/* Section D: How It Works */}
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
            <Card tone="default" hoverable className="flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-pop mb-2">
                  STEP 01
                </div>
                <h3 className="font-display uppercase text-xl text-ink mb-3">
                  01 PICK A CAREER
                </h3>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Choose from high-demand tech tracks to benchmark the exact skills and depths required.
                </p>
              </div>
            </Card>

            <Card tone="default" hoverable className="flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-pop mb-2">
                  STEP 02
                </div>
                <h3 className="font-display uppercase text-xl text-ink mb-3">
                  02 RATE YOUR SKILLS
                </h3>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Assess your current proficiency across core computer science competencies with zero friction.
                </p>
              </div>
            </Card>

            <Card tone="default" hoverable className="flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-pop mb-2">
                  STEP 03
                </div>
                <h3 className="font-display uppercase text-xl text-ink mb-3">
                  03 FOLLOW YOUR PATH
                </h3>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Get an ordered, prerequisite-aware sequence generated by our deterministic rule engine.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Section E: Features */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="max-w-5xl mx-auto px-4 md:px-6 my-20"
        >
          <div className="text-center mb-12">
            <Tag tone="brand">CAPABILITIES</Tag>
            <h2
              id="features-heading"
              className="font-display uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink mt-3"
            >
              EVERYTHING YOU NEED TO <Highlight>GROW</Highlight>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Interactive skill graph (brand tone with CORE sticker) */}
            <Card
              tone="brand"
              hoverable
              className="relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <Network size={32} className="text-white" />
                  <Tag tone="pop" className="text-[10px] px-1.5 py-0.5">
                    CORE
                  </Tag>
                </div>
                <h3 className="font-display uppercase text-lg text-white mb-2">
                  Interactive skill graph
                </h3>
                <p className="text-sm text-white/90 font-sans leading-relaxed">
                  Explore your visual knowledge network with live prerequisite dependencies and mastery states.
                </p>
              </div>
            </Card>

            {/* 2. Skill gap analysis */}
            <Card tone="default" hoverable className="flex flex-col justify-between">
              <div>
                <Target size={32} className="text-brand mb-4" />
                <h3 className="font-display uppercase text-lg text-ink mb-2">
                  Skill gap analysis
                </h3>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Pinpoint missing skills and required level gaps for your target career in seconds.
                </p>
              </div>
            </Card>

            {/* 3. Learning path */}
            <Card tone="default" hoverable className="flex flex-col justify-between">
              <div>
                <Milestone size={32} className="text-brand mb-4" />
                <h3 className="font-display uppercase text-lg text-ink mb-2">
                  Learning path
                </h3>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Follow an ordered, topologically sorted roadmap that respects strict skill prerequisites.
                </p>
              </div>
            </Card>

            {/* 4. Career explorer and What-if */}
            <Card tone="default" hoverable className="flex flex-col justify-between">
              <div>
                <Compass size={32} className="text-brand mb-4" />
                <h3 className="font-display uppercase text-lg text-ink mb-2">
                  Career explorer and What-if
                </h3>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Compare fit across tech roles and simulate the impact of learning new skills on your alignment.
                </p>
              </div>
            </Card>

            {/* 5. AI assistant grounded in your data */}
            <Card tone="default" hoverable className="flex flex-col justify-between">
              <div>
                <Bot size={32} className="text-brand mb-4" />
                <h3 className="font-display uppercase text-lg text-ink mb-2">
                  AI assistant grounded in your data
                </h3>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Receive clear explanations from an assistant bound strictly to the skill graph and rule engine.
                </p>
              </div>
            </Card>

            {/* 6. Bring your own API key */}
            <Card tone="default" hoverable className="flex flex-col justify-between">
              <div>
                <Key size={32} className="text-brand mb-4" />
                <h3 className="font-display uppercase text-lg text-ink mb-2">
                  Bring your own API key
                </h3>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Connect your OpenRouter key with AES-256-GCM encryption at rest, never exposed in client bundles.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Section F: Careers */}
        <section
          id="careers"
          aria-labelledby="careers-heading"
          className="max-w-5xl mx-auto px-4 md:px-6 my-20"
        >
          <div className="text-center mb-12">
            <Tag tone="sky">PATHWAYS</Tag>
            <h2
              id="careers-heading"
              className="font-display uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink mt-3"
            >
              FIVE CAREERS TO START
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAREER_LIST.map((career) => (
              <Card
                key={career.slug}
                tone={career.tone}
                hoverable
                onClick={() => handleCareerSelect(career.slug)}
                className="flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                      CAREER TRACK
                    </span>
                    <ArrowRight
                      size={16}
                      className="text-ink group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                  <h3 className="font-display uppercase text-lg text-ink mb-2">
                    {career.name}
                  </h3>
                  <p
                    className={`text-sm font-sans leading-relaxed ${
                      career.tone === 'sky' ? 'text-ink/80' : 'text-muted'
                    }`}
                  >
                    {career.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-ink/15 text-xs font-mono font-bold uppercase tracking-wider text-brand">
                  Explore graph →
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Section G: FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="max-w-3xl mx-auto px-4 md:px-6 my-20"
        >
          <div className="text-center mb-12">
            <Tag tone="pop">GOT QUESTIONS?</Tag>
            <h2
              id="faq-heading"
              className="font-display uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink mt-3"
            >
              QUESTIONS, <Highlight>ANSWERED</Highlight>
            </h2>
          </div>

          <Accordion items={FAQ_ITEMS} defaultOpenId="faq-1" />
        </section>

        {/* Section H: Dark CTA Band */}
        <section
          id="cta"
          aria-labelledby="cta-heading"
          className="max-w-5xl mx-auto px-4 md:px-6 my-20"
        >
          <div className="border-2 border-ink bg-ink text-paper shadow-brand p-8 md:p-14 text-center">
            <h2
              id="cta-heading"
              className="font-display uppercase text-3xl sm:text-4xl md:text-5xl text-paper tracking-tight mb-4"
            >
              MAP YOUR NEXT <Highlight>CAREER</Highlight>
            </h2>
            <p className="font-sans text-paper/80 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Turn your existing competencies into a clear visual roadmap and
              accelerate your learning journey with zero guesswork.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight size={18} />}
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto font-display uppercase tracking-wider"
              >
                GET STARTED
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto font-display uppercase tracking-wider bg-surface text-ink hover:bg-paper"
              >
                LOG IN
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
