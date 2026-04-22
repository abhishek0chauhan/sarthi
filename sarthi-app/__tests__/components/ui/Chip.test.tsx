import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Chip } from '@/components/ui/Chip';

describe('Chip', () => {
  it('renders label', () => {
    const { getByText } = render(<Chip label="Nature" onPress={() => {}} />);
    expect(getByText('Nature')).toBeTruthy();
  });

  it('calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Chip label="Nature" onPress={onPress} />);
    fireEvent.press(getByText('Nature'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
