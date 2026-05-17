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

  /** Télécharge un PDF via l'API (envoie le JWT). */
  download: async (resourceId: number, filename: string): Promise<void> => {
    const { data } = await api.get<Blob>(`/resources/${resourceId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  uploadPdf: async (resourceId: number, file: File): Promise<PedagogicalResource> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<PedagogicalResource>(
      `/admin/resources/${resourceId}/file`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
