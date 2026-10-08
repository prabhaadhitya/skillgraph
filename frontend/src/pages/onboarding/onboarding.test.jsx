import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthContext } from '../../context/AuthContext.jsx';
import { ToastProvider } from '../../components/ui/Toast.jsx';
import { OnboardingPage } from './OnboardingPage.jsx';
import * as catalogService from '../../services/catalogService.js';
import * as userService from '../../services/userService.js';

vi.mock('../../services/catalogService.js', () => ({
  getCareers: vi.fn(),
  getCareerDetail: vi.fn(),
  getSkills: vi.fn(),
}));

vi.mock('../../services/userService.js', () => ({
  patchMe: vi.fn(),
  putSkills: vi.fn(),
}));

const mockCareersList = [
  {
    id: 'car_1',
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    description: 'Build and deploy ML models',
    category: 'ai',
    skillCount: 25,
  },
  {
    id: 'car_2',
    slug: 'data-analyst',
    name: 'Data Analyst',
    description: 'Analyze data with SQL and dashboards',
    category: 'data',
    skillCount: 20,
  },
];

const mockSkillsList = [
  {
    slug: 'python',
    name: 'Python',
    category: 'programming',
    difficulty: 2,
  },
  {
    slug: 'sql',
    name: 'SQL',
    category: 'database',
    difficulty: 2,
  },
];

describe('OnboardingPage Wizard', () => {
  let mockUser = null;
  let mockSetUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'usr_newbie',
      name: 'Newbie Student',
      email: 'newbie@demo.skillgraph.dev',
      role: 'student',
      onboardingCompleted: false,
    };
    mockSetUser = vi.fn();

    catalogService.getCareers.mockResolvedValue(mockCareersList);
    catalogService.getCareerDetail.mockResolvedValue({
      career: mockCareersList[0],
      skills: [{ skill: mockSkillsList[0], importance: 0.9, requiredLevel: 4 }],
    });
    catalogService.getSkills.mockResolvedValue(mockSkillsList);
    userService.patchMe.mockResolvedValue({ user: { ...mockUser, onboardingCompleted: true } });
    userService.putSkills.mockResolvedValue({ items: [] });
  });

  const renderOnboarding = (initialEntries = ['/onboarding']) => {
    const authValue = {
      user: mockUser,
      setUser: mockSetUser,
      isLoading: false,
      logout: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={authValue}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <OnboardingPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>,
    );
  };

  it('Next is disabled on About until a semester is chosen', () => {
    renderOnboarding();

    // Verify on Step 1 (About)
    expect(screen.getByRole('heading', { name: /Tell Us About Yourself/i })).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /NEXT/i });
    // Initially semester is empty, so Next must be disabled
    expect(nextButton).toBeDisabled();

    // Select a semester
    const semesterSelect = screen.getByLabelText(/Current Semester/i);
    fireEvent.change(semesterSelect, { target: { value: '3' } });

    // Now Next button should be enabled
    expect(nextButton).not.toBeDisabled();
  });

  it('Next is disabled on Career until a career is chosen', async () => {
    renderOnboarding();

    // Fill semester on Step 1 to move to Step 2
    const semesterSelect = screen.getByLabelText(/Current Semester/i);
    fireEvent.change(semesterSelect, { target: { value: '4' } });

    const nextButton = screen.getByRole('button', { name: /NEXT/i });
    fireEvent.click(nextButton);

    // Now on Step 2 (Career)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Choose Your Target Career/i })).toBeInTheDocument();
    });

    const nextButtonStep2 = screen.getByRole('button', { name: /NEXT/i });
    // No career chosen yet, so Next must be disabled
    expect(nextButtonStep2).toBeDisabled();

    // Select a career card
    const careerCard = await screen.findByText('Machine Learning Engineer');
    fireEvent.click(careerCard);

    // Next button should now be enabled
    expect(nextButtonStep2).not.toBeDisabled();
  });

  it('rating a skill 0 removes it from the review', async () => {
    renderOnboarding();

    // 1. Step 1: Select semester and click NEXT
    fireEvent.change(screen.getByLabelText(/Current Semester/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    // 2. Step 2: Select a career and click NEXT
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Choose Your Target Career/i })).toBeInTheDocument();
    });
    fireEvent.click(await screen.findByText('Machine Learning Engineer'));
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    // 3. Step 3: Select skills (e.g. Python and SQL) and click NEXT
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Select Any Skills You Already Know/i })).toBeInTheDocument();
    });

    const pythonChips = await screen.findAllByRole('button', { name: /Python/i });
    fireEvent.click(pythonChips[0]); // Select Python

    const sqlChip = await screen.findByRole('button', { name: /SQL/i });
    fireEvent.click(sqlChip); // Select SQL

    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    // 4. Step 4: Rating page
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Rate Your Current Proficiency/i })).toBeInTheDocument();
    });

    // Verify both skills are present in rating step
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();

    // Change SQL level to 0 (segment '0' in LevelPicker for SQL)
    const zeroButtons = screen.getAllByRole('radio', { name: /0 Not Started/i });
    // Click level 0 for the second skill (SQL)
    fireEvent.click(zeroButtons[1]);

    // SQL should be removed immediately from rating step
    expect(screen.queryByText('SQL')).not.toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();

    // Move to Step 5 (Review)
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    // 5. Step 5: Review page
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Review Your Setup/i })).toBeInTheDocument();
    });

    // Python must be in the review summary, SQL must NOT be in the review summary
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.queryByText('SQL')).not.toBeInTheDocument();
  });

  it('submits onboarding successfully and calls patchMe and putSkills on BUILD MY GRAPH', async () => {
    renderOnboarding();

    // Step 1: About
    fireEvent.change(screen.getByLabelText(/Current Semester/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/College/i), { target: { value: 'Engineering College' } });
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    // Step 2: Career
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Choose Your Target Career/i })).toBeInTheDocument();
    });
    fireEvent.click(await screen.findByText('Data Analyst'));
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    // Step 3: Skills (continue with zero skills)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Select Any Skills You Already Know/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    // Step 4: Rating (zero skills)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Rate Your Current Proficiency/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

    // Step 5: Review
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Review Your Setup/i })).toBeInTheDocument();
    });

    // Click BUILD MY GRAPH
    const buildButton = screen.getByRole('button', { name: /BUILD MY GRAPH/i });
    fireEvent.click(buildButton);

    await waitFor(() => {
      expect(userService.patchMe).toHaveBeenCalledWith({
        name: 'Newbie Student',
        college: 'Engineering College',
        degree: undefined,
        branch: undefined,
        semester: 2,
        targetCareerSlug: 'data-analyst',
        onboardingCompleted: true,
      });
      expect(userService.putSkills).toHaveBeenCalledWith([]);
    });
  });
});
