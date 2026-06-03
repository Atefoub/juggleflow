export type AssignPathStep = 1 | 2 | 3;
export type AssignmentScope = 'class' | 'student';

export function canContinueAssignPath(params: {
  step: AssignPathStep;
  hasSelectedPath: boolean;
  assignmentScope: AssignmentScope;
  hasSelectedClass: boolean;
  hasSelectedStudent: boolean;
}): boolean {
  const { step, hasSelectedPath, assignmentScope, hasSelectedClass, hasSelectedStudent } =
    params;

  if (step === 1) return hasSelectedPath;
  if (step === 2) {
    if (assignmentScope === 'class') return hasSelectedClass;
    return hasSelectedClass && hasSelectedStudent;
  }
  return false;
}

export function isAssignSubmitReady(params: {
  step: AssignPathStep;
  hasSelectedPath: boolean;
  hasSelectedClass: boolean;
  assignmentScope: AssignmentScope;
  hasSelectedStudent: boolean;
}): boolean {
  return (
    params.step === 3 &&
    params.hasSelectedPath &&
    params.hasSelectedClass &&
    (params.assignmentScope === 'class' || params.hasSelectedStudent)
  );
}
