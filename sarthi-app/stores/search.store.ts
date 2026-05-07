import { create } from 'zustand';
import type { SearchDto, SearchResponse, PlanConfirmedResponse } from '@/types/search.types';

type PartialSearchDto = Partial<SearchDto>;
type SearchResultType = SearchResponse | PlanConfirmedResponse;

interface SearchState {
  formValues: PartialSearchDto;
  searchResults: SearchResultType | null;
  setFormValues: (values: PartialSearchDto) => void;
  updateFormValues: (values: PartialSearchDto) => void;
  setSearchResults: (results: SearchResultType) => void;
  resetForm: () => void;
}

const initialFormValues: PartialSearchDto = {
  mode: 'find',
  experienceTypes: [],
  group: { type: 'friends' },
  budget: { min: 2000, max: 20000 },
  hiddenGem: false,
};

export const useSearchStore = create<SearchState>((set) => ({
  formValues: initialFormValues,
  searchResults: null,
  setFormValues: (formValues) => set({ formValues }),
  updateFormValues: (values) =>
    set((state) => ({ formValues: { ...state.formValues, ...values } })),
  setSearchResults: (searchResults) => set({ searchResults }),
  resetForm: () => set({ formValues: initialFormValues }),
}));
