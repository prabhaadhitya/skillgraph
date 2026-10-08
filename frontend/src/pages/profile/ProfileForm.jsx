import { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { patchMe } from '../../services/userService.js';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';

const SEMESTER_OPTIONS = [
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
 * ProfileForm lets the student update basic academic metadata (name, college, branch, semester).
 * Calls PATCH /users/me.
 */
export function ProfileForm() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [college, setCollege] = useState(user?.college || '');
  const [degree, setDegree] = useState(user?.degree || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [semester, setSemester] = useState(user?.semester ? String(user.semester) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setIsSaved(false);

    try {
      const payload = {
        name: name.trim() || undefined,
        college: college.trim() || undefined,
        degree: degree.trim() || undefined,
        branch: branch.trim() || undefined,
        semester: semester ? Number(semester) : undefined,
      };

      const res = await patchMe(payload);
      if (setUser) {
        setUser((prev) => ({
          ...prev,
          ...res?.user,
          ...payload,
        }));
      }

      setIsSaved(true);
      toast.success('Profile updated successfully');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 space-y-6 bg-surface border-2 border-ink shadow-md">
      <div className="border-b-2 border-line pb-4">
        <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold block">
          STUDENT DETAILS
        </span>
        <h2 className="font-display text-xl text-ink uppercase tracking-tight font-bold">
          Academic Information
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border-2 border-state-missing text-xs text-ink font-mono">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="profile-name"
            label="Full Name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            id="profile-college"
            label="College / University"
            placeholder="Institution name"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
          />

          <Input
            id="profile-degree"
            label="Degree Program"
            placeholder="e.g. B.Tech, B.S., B.E."
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
          />

          <Input
            id="profile-branch"
            label="Branch / Major"
            placeholder="e.g. Computer Science, IT, ECE"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />

          <div className="md:col-span-2">
            <Select
              id="profile-semester"
              label="Current Semester (1-8)"
              options={SEMESTER_OPTIONS}
              placeholder="Select current semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            icon={isSaved ? <Check size={18} /> : <Save size={18} />}
          >
            {isSaved ? 'SAVED' : 'SAVE PROFILE'}
          </Button>

          {isSaved && (
            <span className="text-xs font-mono font-bold text-emerald-600">
              ✓ All changes saved
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

export default ProfileForm;
