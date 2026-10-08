import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Skills } from './Skills.jsx';
import { Relationships } from './Relationships.jsx';
import { Careers } from './Careers.jsx';
import * as adminService from '../../services/adminService.js';
import { ApiError } from '../../services/api.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

function renderWithToast(ui) {
  return render(
    <ToastProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ToastProvider>,
  );
}

describe('Admin Frontend Pages (Skills, Relationships, Careers)', () => {
  describe('Skills Page', () => {
    it('renders skills table and filters by search query', async () => {
      renderWithToast(<Skills />);

      // Wait for skills to load
      await waitFor(() => {
        expect(screen.getByText('Python')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search skills by name/i);
      fireEvent.change(searchInput, { target: { value: 'Docker' } });

      expect(screen.getByText('Docker')).toBeInTheDocument();
      expect(screen.queryByText('Python')).not.toBeInTheDocument();
    });

    it('shows 409 conflict message when skill deletion is blocked', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(adminService, 'deleteSkill').mockRejectedValue(
        new ApiError(
          409,
          'CONFLICT',
          'Cannot delete skill: it is referenced by 3 relationships and 1 career',
        ),
      );

      renderWithToast(<Skills />);

      await waitFor(() => {
        expect(screen.getByText('Python')).toBeInTheDocument();
      });

      const deleteBtns = screen.getAllByTitle('Delete Skill');
      fireEvent.click(deleteBtns[0]);

      await waitFor(() => {
        expect(screen.getByText(/CANNOT DELETE SKILL \(409 CONFLICT\)/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Cannot delete skill: it is referenced/i).length).toBeGreaterThan(0);
      });

      window.confirm.mockRestore();
      adminService.deleteSkill.mockRestore();
    });
  });

  describe('Relationships Page', () => {
    it('renders focal skill and displays cycle error message on cycle creation', async () => {
      vi.spyOn(adminService, 'createRelationship').mockRejectedValue(
        new ApiError(
          422,
          'RULE_VIOLATION',
          'That would create a loop: Python -> Statistics -> Machine Learning -> Python',
        ),
      );

      renderWithToast(<Relationships />);

      await waitFor(() => {
        expect(screen.getByText(/SELECT FOCAL SKILL/i)).toBeInTheDocument();
      });

      // Select target skill so the form can be submitted
      const selects = screen.getAllByRole('combobox');
      // selects: [0] = focal picker, [1] = source select, [2] = target select
      fireEvent.change(selects[2], { target: { value: 'python' } });

      const submitBtn = screen.getByRole('button', { name: /ADD RELATIONSHIP/i });
      await waitFor(() => {
        expect(submitBtn).toBeEnabled();
      });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/CYCLE DETECTED \(422 RULE VIOLATION\)/i)).toBeInTheDocument();
        expect(
          screen.getAllByText(/That would create a loop: Python -> Statistics/i).length,
        ).toBeGreaterThan(0);
      });

      adminService.createRelationship.mockRestore();
    });
  });

  describe('Careers Page', () => {
    it('renders career skills and provides "ADD MISSING PREREQUISITES" button on closure 422', async () => {
      vi.spyOn(adminService, 'updateCareerSkills').mockRejectedValue(
        new ApiError(
          422,
          'RULE_VIOLATION',
          'Career skills violate prerequisite closure rules',
          [
            {
              missingSkillSlug: 'math-prereq',
              requiredBySkillSlug: 'ml-skill',
              message: "Skill 'ml-skill' requires prerequisite 'math-prereq'",
            },
          ],
        ),
      );

      renderWithToast(<Careers />);

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /SAVE CAREER SKILLS/i });
        expect(btn).toBeEnabled();
      });

      const saveBtn = screen.getByRole('button', { name: /SAVE CAREER SKILLS/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/PREREQUISITE CLOSURE VIOLATION \(422 RULE VIOLATION\)/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /ADD MISSING PREREQUISITES/i }),
        ).toBeInTheDocument();
      });

      // Click "ADD MISSING PREREQUISITES"
      const addMissingBtn = screen.getByRole('button', { name: /ADD MISSING PREREQUISITES/i });
      fireEvent.click(addMissingBtn);

      // The closure banner should clear, and the missing skill is appended
      await waitFor(() => {
        expect(
          screen.queryByText(/PREREQUISITE CLOSURE VIOLATION/i),
        ).not.toBeInTheDocument();
        expect(screen.getAllByText(/math-prereq/i).length).toBeGreaterThan(0);
      });

      adminService.updateCareerSkills.mockRestore();
    });
  });
});
