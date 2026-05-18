import { api } from './authApi';
import type { TrickResponse } from './catalogueApi';

export const favoritesApi = {
  listIds: async (): Promise<number[]> => {
    const res = await api.get<number[]>('/eleve/favorites/ids');
    return res.data;
  },

  list: async (): Promise<TrickResponse[]> => {
    const res = await api.get<TrickResponse[]>('/eleve/favorites');
    return res.data;
  },

  add: async (trickId: number): Promise<void> => {
    await api.put(`/eleve/favorites/${trickId}`);
  },

  remove: async (trickId: number): Promise<void> => {
    await api.delete(`/eleve/favorites/${trickId}`);
  },
};
