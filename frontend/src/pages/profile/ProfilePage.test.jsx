import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillsEditor } from './SkillsEditor.jsx';
import { ProfileForm } from './ProfileForm.jsx';
import { ToastProvider } from '../../components/ui/Toast.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import * as catalogService from '../../services/catalogService.js';
import * as userService from '../../services/userService.js';
import * as useUserSkillsHook from '../../hooks/useUserSkills.js';

vi.mock('../../services/catalogService.js', () => ({
  getSkills: vi.fn(),
}));

vi.mock('../../services/userService.js', () => ({
  patchMe: vi.fn(),
  getUserSkills: vi.fn(),
  patchSkill: vi.fn(),
  putSkills: vi.fn(),
}));

vi.mock('../../hooks/useUserSkills.js', () => ({
  useUserSkills: vi.fn(),
}));

describe('Profile and SkillsEditor Components', () => {
  const mockCatalog = [
    {
      slug: 'python',
      name: 'Python',
      category: 'programming',
      description: 'General purpose language',
    },
    {
      slug: 'sql',
      name: 'SQL',
      category: 'database',
      description: 'Structured Query Language',
    },
  ];

  const mockUserSkills = [
    {
      skill: { slug: 'python', name: 'Python' },
      proficiency: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    catalogService.getSkills.mockResolvedValue(mockCatalog);
    useUserSkillsHook.useUserSkills.mockReturnValue({
      skills: mockUserSkills,
      isLoading: false,
      error: null,
      updateSkill: vi.fn(),
    });
  });

  it('SkillsEditor calls the update handler on skill level change', async () => {
    const handleUpdate = vi.fn().mockResolvedValue({});

    render(
      <ToastProvider>
        <SkillsEditor onUpdateSkill={handleUpdate} />
      </ToastProvider>,
    );

    // Wait for skills to load
    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('SQL')).toBeInTheDocument();
    });

    // Find radio options for SQL (current level is 0)
    // SQL has 6 radio buttons (0 to 5)
    // Level 3 is "3 Intermediate"
    const radio3List = screen.getAllByRole('radio', { name: /3 Intermediate/i });
    // Click Level 3 on SQL (second skill)
    fireEvent.click(radio3List[1]);

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith('sql', 3, 'SQL');
    });
  });

  it('SkillsEditor shows the revert on error when update handler fails', async () => {
    const handleUpdate = vi.fn().mockRejectedValue(new Error('Network error updating skill'));

    render(
      <ToastProvider>
        <SkillsEditor onUpdateSkill={handleUpdate} />
      </ToastProvider>,
    );

    // Wait for skills to load
    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument();
    });

    // Python currently has proficiency 2 ("2 Basic")
    const radioButtons = screen.getAllByRole('radio', { name: /4 Advanced/i });
    // Click Level 4 on Python (first skill)
    fireEvent.click(radioButtons[0]);

    // Update handler is called
    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith('python', 4, 'Python');
    });

    // Because handleUpdate rejects, the radio selection reverts back to 2
    await waitFor(() => {
      const pythonRadio2 = screen.getAllByRole('radio', { name: /2 Basic/i })[0];
      expect(pythonRadio2).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('ProfileForm edits and saves student metadata', async () => {
    userService.patchMe.mockResolvedValue({
      user: { name: 'Jane Student', college: 'Tech University', semester: 4 },
    });

    const mockAuth = {
      user: { name: 'Jane Doe', college: 'Old College', semester: 3 },
      setUser: vi.fn(),
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={mockAuth}>
        <ToastProvider>
          <ProfileForm />
        </ToastProvider>
      </AuthContext.Provider>,
    );

    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Jane Student' } });

    const submitBtn = screen.getByRole('button', { name: /SAVE PROFILE/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(userService.patchMe).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Student',
        }),
      );
    });
  });
});
