jest.mock('expo-linking');

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { MapLinkButton } from '@/components/trip/MapLinkButton';

const mockOpenURL = jest.fn();
(Linking.openURL as jest.Mock) = mockOpenURL;

describe('MapLinkButton', () => {
  it('renders label', () => {
    const { getByText } = render(<MapLinkButton mapQuery="Amber Fort, Jaipur" />);
    expect(getByText('📍 Open in Maps')).toBeTruthy();
  });

  it('opens Google Maps URL on press', () => {
    const { getByText } = render(<MapLinkButton mapQuery="Amber Fort, Jaipur" />);
    fireEvent.press(getByText('📍 Open in Maps'));
    expect(mockOpenURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Amber%20Fort%2C%20Jaipur'
    );
  });
});
