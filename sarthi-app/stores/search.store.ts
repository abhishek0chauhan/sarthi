import { create } from 'zustand';
import type { SearchDto } from '@/types/search.types';

type PartialSearchDto = Partial<SearchDto>;

interface SearchState {
  formValues: PartialSearchDto;
  setFormValues: (values: PartialSearchDto) => void;
  updateFormValues: (values: PartialSearchDto) => void;
  resetForm: () => void;
}

const initialFormValues: PartialSearchDto = {
  experienceTypes: [],
  group: { size: 2, type: 'friends' },
  hiddenGem: false,
};

export const useSearchStore = create<SearchState>((set) => ({
  formValues: initialFormValues,
  setFormValues: (formValues) => set({ formValues }),
  updateFormValues: (values) =>
    set((state) => ({ formValues: { ...state.formValues, ...values } })),
  resetForm: () => set({ formValues: initialFormValues }),
}));
