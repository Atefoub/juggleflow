import { describe, expect, it } from 'vitest';
import { canContinueAssignPath, isAssignSubmitReady } from './assignPathWizard';

describe('assignPathWizard', () => {
  it('step 1 requires a selected path', () => {
    expect(
      canContinueAssignPath({
        step: 1,
        hasSelectedPath: false,
        assignmentScope: 'class',
        hasSelectedClass: true,
        hasSelectedStudent: false,
      }),
    ).toBe(false);
    expect(
      canContinueAssignPath({
        step: 1,
        hasSelectedPath: true,
        assignmentScope: 'class',
        hasSelectedClass: false,
        hasSelectedStudent: false,
      }),
    ).toBe(true);
  });

  it('step 2 class scope requires class only', () => {
    expect(
      canContinueAssignPath({
        step: 2,
        hasSelectedPath: true,
        assignmentScope: 'class',
        hasSelectedClass: true,
        hasSelectedStudent: false,
      }),
    ).toBe(true);
  });

  it('step 2 student scope requires class and student', () => {
    expect(
      canContinueAssignPath({
        step: 2,
        hasSelectedPath: true,
        assignmentScope: 'student',
        hasSelectedClass: true,
        hasSelectedStudent: false,
      }),
    ).toBe(false);
    expect(
      canContinueAssignPath({
        step: 2,
        hasSelectedPath: true,
        assignmentScope: 'student',
        hasSelectedClass: true,
        hasSelectedStudent: true,
      }),
    ).toBe(true);
  });

  it('isAssignSubmitReady on step 3', () => {
    expect(
      isAssignSubmitReady({
        step: 3,
        hasSelectedPath: true,
        hasSelectedClass: true,
        assignmentScope: 'class',
        hasSelectedStudent: false,
      }),
    ).toBe(true);
    expect(
      isAssignSubmitReady({
        step: 2,
        hasSelectedPath: true,
        hasSelectedClass: true,
        assignmentScope: 'student',
        hasSelectedStudent: true,
      }),
    ).toBe(false);
  });
});
