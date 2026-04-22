import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { OTPInput } from '@/components/ui/OTPInput';

describe('OTPInput', () => {
  it('renders 6 boxes', () => {
    const { getAllByTestId } = render(
      <OTPInput value="" onChange={() => {}} testID="otp" />
    );
    expect(getAllByTestId(/otp-box-/)).toHaveLength(6);
  });

  it('calls onChange with entered digits', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <OTPInput value="" onChange={onChange} testID="otp" />
    );
    fireEvent.changeText(getByTestId('otp-hidden-input'), '472');
    expect(onChange).toHaveBeenCalledWith('472');
  });

  it('caps input at 6 digits', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <OTPInput value="" onChange={onChange} testID="otp" />
    );
    fireEvent.changeText(getByTestId('otp-hidden-input'), '1234567');
    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('shows error state on all boxes when hasError is true', () => {
    const { getAllByTestId } = render(
      <OTPInput value="123" onChange={() => {}} hasError testID="otp" />
    );
    const boxes = getAllByTestId(/otp-box-/);
    boxes.forEach(box => {
      expect(box.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderColor: expect.any(String) })])
      );
    });
  });
});
