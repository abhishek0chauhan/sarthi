import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders primary label', () => {
    const { getByText } = render(<Button label="Find Destinations" onPress={() => {}} />);
    expect(getByText('Find Destinations')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Tap me" onPress={onPress} />);
    fireEvent.press(getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Loading" onPress={onPress} loading />);
    fireEvent.press(getByText('Loading...'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Disabled" onPress={onPress} disabled />);
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders secondary variant', () => {
    const { getByTestId } = render(
      <Button label="Secondary" onPress={() => {}} variant="secondary" testID="btn" />
    );
    expect(getByTestId('btn')).toBeTruthy();
  });
});
