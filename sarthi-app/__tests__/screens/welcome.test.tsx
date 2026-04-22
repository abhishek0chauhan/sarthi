import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WelcomeScreen from '@/app/(auth)/welcome';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const renderWithSafeArea = (component: React.ReactElement) => {
  return render(
    <SafeAreaProvider>
      {component}
    </SafeAreaProvider>
  );
};

describe('WelcomeScreen', () => {
  it('renders app name', () => {
    const { getByText } = renderWithSafeArea(<WelcomeScreen />);
    expect(getByText('Sarthi')).toBeTruthy();
  });

  it('renders Get Started button', () => {
    const { getByText } = renderWithSafeArea(<WelcomeScreen />);
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('navigates to login on Get Started press', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push });
    const { getByText } = renderWithSafeArea(<WelcomeScreen />);
    fireEvent.press(getByText('Get Started'));
    expect(push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('renders slide dot indicators', () => {
    const { getAllByTestId } = renderWithSafeArea(<WelcomeScreen />);
    expect(getAllByTestId(/slide-dot-/)).toHaveLength(3);
  });
});
