import { useThemeStore } from '@/stores/theme.store';

beforeEach(() => useThemeStore.setState({ override: 'system' }));

describe('theme store', () => {
  it('defaults to system', () => {
    expect(useThemeStore.getState().override).toBe('system');
  });

  it('updates override', () => {
    useThemeStore.getState().setOverride('dark');
    expect(useThemeStore.getState().override).toBe('dark');
  });
});
