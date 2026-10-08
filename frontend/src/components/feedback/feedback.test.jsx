import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';
import { ForbiddenPage } from './ForbiddenPage.jsx';

function BuggyComponent() {
  throw new Error('Test exploding error');
}

describe('Feedback Components', () => {
  it('ErrorBoundary renders friendly UI with reload button when a child throws', () => {
    // Suppress React error boundary console.error during test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('SOMETHING UNEXPECTED HAPPENED')).toBeInTheDocument();
    expect(screen.getByText(/Test exploding error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RELOAD/i })).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('NotFoundPage renders 404 and navigation actions', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('PAGE NOT FOUND')).toBeInTheDocument();
    expect(screen.getByText('404 ERROR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /HOME/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GO TO DASHBOARD/i })).toBeInTheDocument();
  });

  it('ForbiddenPage renders 403 and informs student about admin privileges', () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('THIS AREA IS FOR ADMINS')).toBeInTheDocument();
    expect(screen.getByText('403 FORBIDDEN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /BACK TO DASHBOARD/i })).toBeInTheDocument();
  });
});
