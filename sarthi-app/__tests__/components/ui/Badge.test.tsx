import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders label', () => {
    const { getByText } = render(<Badge label="82% match" />);
    expect(getByText('82% match')).toBeTruthy();
  });

  it('renders gem variant', () => {
    const { getByText } = render(<Badge label="Hidden Gem" variant="gem" />);
    expect(getByText('Hidden Gem')).toBeTruthy();
  });
});
