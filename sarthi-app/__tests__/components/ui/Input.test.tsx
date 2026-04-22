import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renders label', () => {
    const { getByText } = render(<Input label="PHONE NUMBER" value="" onChangeText={() => {}} />);
    expect(getByText('PHONE NUMBER')).toBeTruthy();
  });

  it('renders placeholder', () => {
    const { getByPlaceholderText } = render(
      <Input label="EMAIL" value="" onChangeText={() => {}} placeholder="you@example.com" />
    );
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('calls onChangeText on input', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <Input label="NAME" value="" onChangeText={onChangeText} testID="input" />
    );
    fireEvent.changeText(getByTestId('input'), 'Abhishek');
    expect(onChangeText).toHaveBeenCalledWith('Abhishek');
  });

  it('shows error message', () => {
    const { getByText } = render(
      <Input label="PHONE" value="" onChangeText={() => {}} error="Enter a valid number" />
    );
    expect(getByText('Enter a valid number')).toBeTruthy();
  });
});
