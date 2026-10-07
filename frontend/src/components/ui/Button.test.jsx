import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button.jsx';

describe('Button', () => {
  it('renders children properly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('is disabled and shows a spinner when loading is true', () => {
    render(<Button loading>Submit Action</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    const spinner = screen.getByTestId('button-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('triggers onClick when clicked in normal state', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Action</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClick when disabled', async () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
