import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import VerifyOTPScreen from '@/app/(auth)/verify-otp';

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ phone: '9876543210' }),
}));

describe('VerifyOTPScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title', () => {
    const { getByText } = render(<VerifyOTPScreen />);
    expect(getByText('Enter OTP')).toBeTruthy();
  });

  it('shows phone number', () => {
    const { getByText } = render(<VerifyOTPScreen />);
    expect(getByText(/9876543210/)).toBeTruthy();
  });

  it('renders 6 OTP boxes', () => {
    const { getAllByTestId } = render(<VerifyOTPScreen />);
    expect(getAllByTestId(/otp-box-/)).toHaveLength(6);
  });

  it('shows resend countdown timer', () => {
    const { getByText } = render(<VerifyOTPScreen />);
    expect(getByText(/Resend code in/)).toBeTruthy();
  });

  it('shows change number link that navigates back', () => {
    const { getByText } = render(<VerifyOTPScreen />);
    fireEvent.press(getByText('Change number'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows error message when submitting without a verified session', async () => {
    const { getByTestId, getByText } = render(<VerifyOTPScreen />);
    fireEvent.changeText(getByTestId('otp-hidden-input'), '123456');
    await waitFor(() => expect(getByText('Incorrect code. Try again.')).toBeTruthy());
  });
});
