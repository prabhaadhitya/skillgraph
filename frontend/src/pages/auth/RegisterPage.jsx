import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { AlertCircle, Check, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Tag } from '../../components/ui/Tag.jsx';
import { validatePassword } from '../../utils/passwordRules.js';

/**
 * Register Page component.
 * Supports:
 * - Redirecting logged-in users away.
 * - Field-level errors from server validation.
 * - Loading state on submission button.
 * - "Show password" toggle.
 * - Password rule helper text and visual checklist.
 * - Pre-selected career forwarding from query params.
 */
export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordEvaluation = validatePassword(password);

  useEffect(() => {
    document.title = 'SkillGraph — Create Account';
  }, []);

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
            Start modeling your skill graph and exploring your path.
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
                placeholder="Jane Doe"
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
                placeholder="you@university.edu"
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                hint="Minimum 8 characters with upper, lower, number, and symbol"
                disabled={isSubmitting}
                autoComplete="new-password"
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="p-1 text-muted hover:text-ink cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              {/* Password strength checklist */}
              {password && (
                <div className="mt-3 p-3 bg-paper border border-line text-xs space-y-1.5 font-sans">
                  <p className="font-bold uppercase tracking-wider text-muted text-[10px] mb-1">
                    Password requirements:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <span
                      className={`flex items-center gap-1.5 ${passwordEvaluation.hasMinLength ? 'text-state-mastered font-bold' : 'text-muted'}`}
                    >
                      <Check size={13} className={passwordEvaluation.hasMinLength ? 'text-state-mastered' : 'opacity-30'} />
                      8+ characters
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${passwordEvaluation.hasUpper ? 'text-state-mastered font-bold' : 'text-muted'}`}
                    >
                      <Check size={13} className={passwordEvaluation.hasUpper ? 'text-state-mastered' : 'opacity-30'} />
                      Uppercase letter
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${passwordEvaluation.hasLower ? 'text-state-mastered font-bold' : 'text-muted'}`}
                    >
                      <Check size={13} className={passwordEvaluation.hasLower ? 'text-state-mastered' : 'opacity-30'} />
                      Lowercase letter
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${passwordEvaluation.hasNumber ? 'text-state-mastered font-bold' : 'text-muted'}`}
                    >
                      <Check size={13} className={passwordEvaluation.hasNumber ? 'text-state-mastered' : 'opacity-30'} />
                      Number (0-9)
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${passwordEvaluation.hasSpecial ? 'text-state-mastered font-bold' : 'text-muted'}`}
                    >
                      <Check size={13} className={passwordEvaluation.hasSpecial ? 'text-state-mastered' : 'opacity-30'} />
                      Special character
                    </span>
                  </div>
                </div>
              )}
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

export default RegisterPage;
