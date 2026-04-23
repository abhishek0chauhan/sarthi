import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack })
}));

jest.mock('@/services/auth.service', () => ({
  authService: { sendOTP: jest.fn().mockResolvedValue({}) }
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders phone input', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('98765 XXXXX')).toBeTruthy();
  });

  it('renders Send OTP button', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Send OTP →')).toBeTruthy();
  });

  it('renders Google and Email options', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue with Email')).toBeTruthy();
  });

  it('disables Send OTP when phone is empty', () => {
    const { getByTestId } = render(<LoginScreen />);
    const btn = getByTestId('send-otp-btn');
    expect(btn.props.accessibilityState?.disabled).toBeTruthy();
  });

  it('navigates to verify-otp after sending OTP', async () => {
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('98765 XXXXX'), '9876543210');
    fireEvent.press(getByTestId('send-otp-btn'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(auth)/verify-otp' }));
    });
  });

  it('displays error when OTP send fails', async () => {
    const { authService } = require('@/services/auth.service');
    jest.mocked(authService.sendOTP).mockRejectedValueOnce(new Error('Network error'));
    const { getByPlaceholderText, getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('98765 XXXXX'), '9876543210');
    fireEvent.press(getByTestId('send-otp-btn'));
    await waitFor(() => expect(getByText('Failed to send OTP. Please try again.')).toBeTruthy());
  });
});
