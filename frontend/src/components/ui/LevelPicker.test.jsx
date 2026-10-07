import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelPicker, LEVEL_NAMES } from './LevelPicker.jsx';

describe('LevelPicker', () => {
  it('renders all 6 level options (0 to 5)', () => {
    render(<LevelPicker value={0} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(6);
    expect(radios.map((r) => r.textContent)).toEqual(['0', '1', '2', '3', '4', '5']);
  });

  it('displays the correct name for the active level', () => {
    render(<LevelPicker value={3} />);

    expect(screen.getByText(`Lv 3 · ${LEVEL_NAMES[3]}`)).toBeInTheDocument();
  });

  it('calls onChange with the correct number when an option is clicked', async () => {
    const handleChange = vi.fn();
    render(<LevelPicker value={1} onChange={handleChange} />);

    const option4 = screen.getByRole('radio', { name: `4 ${LEVEL_NAMES[4]}` });
    await userEvent.click(option4);

    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('handles arrow key navigation (ArrowRight and ArrowLeft)', () => {
    const handleChange = vi.fn();
    const { container } = render(<LevelPicker value={2} onChange={handleChange} />);

    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup).not.toBeNull();

    // Arrow Right increments
    fireEvent.keyDown(radiogroup, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(3);

    // Arrow Left decrements
    fireEvent.keyDown(radiogroup, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('clamps level values between 0 and 5 when navigating with arrow keys', () => {
    const handleChangeAtMax = vi.fn();
    const { container: containerMax } = render(
      <LevelPicker value={5} onChange={handleChangeAtMax} />,
    );
    const radiogroupMax = containerMax.querySelector('[role="radiogroup"]');
    fireEvent.keyDown(radiogroupMax, { key: 'ArrowRight' });
    expect(handleChangeAtMax).toHaveBeenCalledWith(5);

    const handleChangeAtMin = vi.fn();
    const { container: containerMin } = render(
      <LevelPicker value={0} onChange={handleChangeAtMin} />,
    );
    const radiogroupMin = containerMin.querySelector('[role="radiogroup"]');
    fireEvent.keyDown(radiogroupMin, { key: 'ArrowLeft' });
    expect(handleChangeAtMin).toHaveBeenCalledWith(0);
  });
});
