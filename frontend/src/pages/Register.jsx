import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { AlertCircle, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Tag } from '../components/ui/Tag.jsx';
import { validatePassword } from '../utils/passwordRules.js';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordEvaluation = validatePassword(password);

  // Destination after registration
  const getDestination = useCallback(() => {
    const career = searchParams.get('career');
    return career ? `/onboarding?career=${encodeURIComponent(career)}` : '/onboarding';
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.onboardingCompleted) {
        navigate('/app/dashboard', { replace: true });
      } else {
        navigate(getDestination(), { replace: true });
      }
    }
  }, [user, getDestination, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors = {};
    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.trim().length < 2 || name.trim().length > 80) {
      errors.name = 'Name must be between 2 and 80 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!passwordEvaluation.isValid) {
      errors.password = 'Password does not meet complexity requirements';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate(getDestination(), { replace: true });
    } catch (err) {
      if (err.details && Array.isArray(err.details) && err.details.length > 0) {
        const detailsMap = {};
        err.details.forEach((d) => {
          if (d.field) detailsMap[d.field] = d.message;
        });
        setFieldErrors(detailsMap);
      }
      setFormError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Tag tone="pop">FREE FOR STUDENTS</Tag>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink tracking-tight mt-3">
            CREATE YOUR <span className="text-brand">ACCOUNT</span>
          </h1>
          <p className="text-sm text-muted mt-1.5 font-sans">
            Start modeling your career skill graph in minutes.
          </p>
        </div>

        <div className="border-2 border-ink bg-surface shadow-md p-6 md:p-8 rounded-none">
          {formError && (
            <div
              role="alert"
              className="border-2 border-state-missing bg-state-missing/15 p-3.5 mb-5 flex items-start gap-2.5 text-xs md:text-sm font-semibold text-ink"
            >
              <AlertCircle size={18} className="text-state-missing shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Input
                label="Full Name"
                id="register-name"
                type="text"
                placeholder="e.g. Prabha Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name}
                disabled={isSubmitting}
                autoComplete="name"
              />
            </div>

            <div>
              <Input
                label="Email Address"
                id="register-email"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>

            <div>
              <Input
                label="Password"
                id="register-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                disabled={isSubmitting}
                autoComplete="new-password"
              />

              {/* Live Password Rules Checklist */}
              <div className="mt-2.5 p-3 border-2 border-line bg-paper/60 rounded-none text-xs space-y-1.5">
                <p className="font-mono text-[11px] uppercase tracking-wider font-bold text-muted mb-1">
                  PASSWORD REQUIREMENTS
                </p>
                {passwordEvaluation.rules.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 font-medium transition-colors ${
                      r.passed ? 'text-ink font-semibold' : 'text-muted'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-none border border-ink flex items-center justify-center shrink-0 ${
                        r.passed ? 'bg-state-mastered text-ink' : 'bg-surface'
                      }`}
                    >
                      {r.passed && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
              icon={<ArrowRight size={18} />}
            >
              CREATE ACCOUNT
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-line text-center">
            <p className="text-xs md:text-sm text-muted">
              Already have an account?{' '}
              <Link
                to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                className="font-bold text-ink underline hover:text-brand transition-colors"
              >
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
