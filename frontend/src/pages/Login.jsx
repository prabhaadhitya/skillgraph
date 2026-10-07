import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Tag } from '../components/ui/Tag.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDestination = useCallback(
    (loggedInUser) => {
      const nextParam = searchParams.get('next');
      if (nextParam) return nextParam;
      if (loggedInUser?.role === 'admin') return '/admin';
      if (loggedInUser?.onboardingCompleted) return '/app/dashboard';
      return '/onboarding';
    },
    [searchParams],
  );

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(getDestination(user), { replace: true });
    }
  }, [user, getDestination, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors = {};
    if (!email.trim()) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email: email.trim().toLowerCase(), password });
      navigate(getDestination(loggedInUser), { replace: true });
    } catch (err) {
      if (err.details && Array.isArray(err.details) && err.details.length > 0) {
        const detailsMap = {};
        err.details.forEach((d) => {
          if (d.field) detailsMap[d.field] = d.message;
        });
        setFieldErrors(detailsMap);
      }
      setFormError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Tag tone="brand">STUDENT & ADMIN PORTAL</Tag>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink tracking-tight mt-3">
            LOG IN TO <span className="text-brand">SKILLGRAPH</span>
          </h1>
          <p className="text-sm text-muted mt-1.5 font-sans">
            Welcome back! Enter your details to continue.
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
                label="Email Address"
                id="login-email"
                type="email"
                placeholder="you@example.com"
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
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
              icon={<ArrowRight size={18} />}
            >
              LOG IN
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-line text-center">
            <p className="text-xs md:text-sm text-muted">
              Don&apos;t have an account?{' '}
              <Link
                to={`/register${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                className="font-bold text-ink underline hover:text-brand transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
