import { classesApi } from './classesApi';
import { pathsApi } from './pathsApi';
import { studentsApi } from './studentsApi';

export * from './types';
export { classesApi } from './classesApi';
export { pathsApi } from './pathsApi';
export { studentsApi } from './studentsApi';

/** Façade rétrocompatible — préférer classesApi / pathsApi / studentsApi. */
export const teacherApi = {
  ...classesApi,
  ...pathsApi,
  ...studentsApi,
};
