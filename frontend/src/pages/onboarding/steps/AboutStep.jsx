import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Card } from '../../../components/ui/Card.jsx';

const SEMESTER_OPTIONS = [
  { value: '', label: 'Select your semester (1 - 8)' },
  { value: '1', label: 'Semester 1' },
  { value: '2', label: 'Semester 2' },
  { value: '3', label: 'Semester 3' },
  { value: '4', label: 'Semester 4' },
  { value: '5', label: 'Semester 5' },
  { value: '6', label: 'Semester 6' },
  { value: '7', label: 'Semester 7' },
  { value: '8', label: 'Semester 8' },
];

/**
 * Step 1: Academic and student background details.
 * Semester 1-8 is strictly required; other fields are optional.
 */
export function AboutStep({ state, dispatch, headingRef }) {
  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">
          Step 1 of 5
        </span>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight outline-none"
        >
          Tell Us About Yourself
        </h2>
        <p className="text-sm text-muted">
          Your academic details help us contextualize your progress and benchmarks.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
        <div className="sm:col-span-2">
          <Input
            id="onboarding-name"
            label="Full Name"
            value={state.name}
            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'name', value: e.target.value })}
            placeholder="e.g. Prabha Adhitya"
          />
        </div>

        <div>
          <Input
            id="onboarding-college"
            label="College / University"
            value={state.college}
            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'college', value: e.target.value })}
            placeholder="e.g. Chaitanya Institute of Technology"
          />
        </div>

        <div>
          <Input
            id="onboarding-degree"
            label="Degree Program"
            value={state.degree}
            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'degree', value: e.target.value })}
            placeholder="e.g. B.Tech, B.E., B.Sc"
          />
        </div>

        <div>
          <Input
            id="onboarding-branch"
            label="Branch / Major"
            value={state.branch}
            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'branch', value: e.target.value })}
            placeholder="e.g. Computer Science, IT, ECE"
          />
        </div>

        <div>
          <Select
            id="onboarding-semester"
            label="Current Semester (Required)"
            value={state.semester ? String(state.semester) : ''}
            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'semester', value: e.target.value })}
            options={SEMESTER_OPTIONS}
            placeholder="Select your semester (1 - 8)"
            required
          />
        </div>
      </div>
    </Card>
  );
}

export default AboutStep;
