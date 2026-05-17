import { api } from './authApi';

export type ResourceAudience = 'TEACHER' | 'STUDENT';

export type ResourceType =
  | 'STUDY_PDF'
  | 'TEACHER_VIDEO'
  | 'TEACHER_GUIDE'
  | 'STUDENT_VIDEO'
  | 'STUDENT_EXERCISE'
  | 'BRAIN_MODULE';

export interface PedagogicalResource {
  id: number;
  audience: ResourceAudience;
  resourceType: ResourceType;
  title: string;
  subtitle: string | null;
  metaLabel: string | null;
  resourceUrl: string | null;
  tags: string[];
}

export const resourcesApi = {
  list: async (
    audience: ResourceAudience,
    type?: ResourceType,
  ): Promise<PedagogicalResource[]> => {
    const { data } = await api.get<PedagogicalResource[]>('/resources', {
      params: { audience, ...(type ? { type } : {}) },
    });
    return data;
  },
};
