# App Phase 1 — Foundation & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Sarthi Expo app with the full Saffron & Mist design system, component library, navigation shell, and all four auth screens — producing a working app that launches, navigates, and authenticates via Phone OTP, Google, and Email/Password.

**Architecture:** Expo Router v4 for file-based routing with an auth guard at the root layout. NativeWind v4 for styling with a custom Tailwind config mirroring the design token constants. Firebase Auth drives all three login methods; tokens stored in expo-secure-store and injected into every API request via an auth header helper.

**Tech Stack:** Expo SDK 53, Expo Router v4, TypeScript, NativeWind v4, Firebase Auth, Zustand, React Native Testing Library, Jest

**Spec:** `docs/superpowers/specs/2026-04-22-app-phase1-core-shell-design-v2.md`

---

## File Map

```
sarthi-app/
├── app/
│   ├── _layout.tsx                   TASK 5 — root layout, providers, auth guard
│   ├── index.tsx                     TASK 5 — splash redirect
│   ├── (auth)/
│   │   ├── _layout.tsx               TASK 5 — auth layout (no tab bar)
│   │   ├── welcome.tsx               TASK 7
│   │   ├── login.tsx                 TASK 8
│   │   ├── verify-otp.tsx            TASK 9
│   │   └── email.tsx                 TASK 10
│   └── (tabs)/
│       ├── _layout.tsx               TASK 5 — tab bar with warm cream pill
│       ├── search/index.tsx          TASK 5 — placeholder
│       ├── trips/index.tsx           TASK 5 — placeholder
│       └── profile/index.tsx         TASK 5 — placeholder
├── components/
│   ├── ui/
│   │   ├── Button.tsx                TASK 3
│   │   ├── Input.tsx                 TASK 3
│   │   ├── Card.tsx                  TASK 3
│   │   ├── Badge.tsx                 TASK 4
│   │   ├── Chip.tsx                  TASK 4
│   │   ├── OTPInput.tsx              TASK 4
│   │   └── LoadingSpinner.tsx        TASK 4
│   └── auth/
│       ├── PhoneInput.tsx            TASK 8
│       └── GoogleSignInButton.tsx    TASK 8
├── constants/
│   ├── colors.ts                     TASK 2
│   └── typography.ts                 TASK 2
├── config/
│   ├── locale.ts                     TASK 2
│   └── api.ts                        TASK 2
├── stores/
│   ├── auth.store.ts                 TASK 6
│   └── theme.store.ts                TASK 6
├── hooks/
│   ├── useAuth.ts                    TASK 6
│   └── useColorScheme.ts             TASK 6
├── services/
│   └── auth.service.ts               TASK 6
├── locales/
│   └── en.json                       TASK 2
├── __tests__/
│   ├── components/ui/Button.test.tsx         TASK 3
│   ├── components/ui/Input.test.tsx          TASK 3
│   ├── components/ui/OTPInput.test.tsx       TASK 4
│   ├── stores/auth.store.test.ts             TASK 6
│   ├── stores/theme.store.test.ts            TASK 6
│   ├── screens/welcome.test.tsx              TASK 7
│   ├── screens/login.test.tsx                TASK 8
│   ├── screens/verify-otp.test.tsx           TASK 9
│   └── screens/email.test.tsx               TASK 10
├── app.json
├── tailwind.config.js                TASK 2
├── babel.config.js
├── jest.config.js                    TASK 1
└── package.json
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `sarthi-app/` (entire project)
- Create: `sarthi-app/jest.config.js`
- Create: `sarthi-app/jest.setup.js`
- Create: `sarthi-app/babel.config.js`

- [ ] **Step 1: Scaffold Expo project**

```bash
cd /path/to/Sarthi
npx create-expo-app@latest sarthi-app --template blank-typescript
cd sarthi-app
```

- [ ] **Step 2: Install all dependencies**

```bash
npx expo install expo-router expo-secure-store expo-font expo-localization \
  expo-linking expo-splash-screen expo-constants

npx expo install @react-native-firebase/app @react-native-firebase/auth

npm install @tanstack/react-query zustand react-hook-form zod @hookform/resolvers \
  nativewind react-native-reanimated react-native-svg react-native-svg-transformer \
  lottie-react-native @gorhom/bottom-sheet @expo/vector-icons \
  @expo-google-fonts/inter i18next react-i18next \
  react-native-safe-area-context react-native-screens react-native-gesture-handler \
  @react-native-async-storage/async-storage \
  @react-native-google-signin/google-signin

npm install --save-dev @testing-library/react-native @testing-library/jest-native \
  jest-expo jest-fetch-mock @types/jest
```

- [ ] **Step 3: Configure app.json**

```json
{
  "expo": {
    "name": "Sarthi",
    "slug": "sarthi",
    "scheme": "sarthi",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "assetBundlePatterns": ["**/*"],
    "ios": { "supportsTablet": false },
    "android": { "adaptiveIcon": { "backgroundColor": "#FDF8F0" } },
    "web": { "bundler": "metro" },
    "plugins": [
      "expo-router",
      "@react-native-firebase/app",
      "@react-native-firebase/auth"
    ]
  }
}
```

- [ ] **Step 4: Configure babel**

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel', 'react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 5: Configure Jest**

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

```js
// jest.setup.js
import 'react-native-gesture-handler/jestSetup';
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: null,
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

- [ ] **Step 6: Configure metro for SVG**

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 7: Verify Jest runs**

```bash
npx jest --passWithNoTests
```

Expected: Test suite ran with 0 tests, exit 0.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: scaffold Sarthi Expo app with all dependencies"
```

---

## Task 2: Design Tokens & Locale Config

**Files:**
- Create: `constants/colors.ts`
- Create: `constants/typography.ts`
- Create: `config/locale.ts`
- Create: `config/api.ts`
- Create: `locales/en.json`
- Create: `tailwind.config.js`
- Create: `global.css`

- [ ] **Step 1: Create color constants**

```typescript
// constants/colors.ts
export const lightColors = {
  bgBase:    '#FDF8F0',
  bgSurface: '#F5EFE6',
  bgCard:    '#FFFFFF',

  primary50:  '#FEF0E6',
  primary200: '#FBBF9A',
  primary500: '#E8601C',
  primary600: '#C44E12',
  primary700: '#9E3D0D',

  textPrimary:   '#1A1208',
  textSecondary: '#A0856E',
  textTertiary:  '#C4B5A5',
  textInverse:   '#FFFFFF',

  border:      '#EDE5D8',
  borderFocus: '#E8601C',

  success:   '#2E7D32',
  danger:    '#D32F2F',
  warning:   '#F57C00',
  successBg: '#E8F5E9',
  dangerBg:  '#FFF0F0',
  warningBg: '#FFF8E1',
};

export const darkColors = {
  bgBase:    '#150F08',
  bgSurface: '#1E1610',
  bgCard:    '#2A1E12',

  primary50:  '#3D1A08',
  primary200: '#7A3A10',
  primary400: '#F5926A',
  primary500: '#F07540',
  primary600: '#E8601C',
  primary700: '#C44E12',

  textPrimary:   '#F5E6D3',
  textSecondary: '#8C7260',
  textTertiary:  '#5A4535',
  textInverse:   '#1A1208',

  border:      'rgba(255,255,255,0.08)',
  borderFocus: '#F07540',

  success:   '#4CAF50',
  danger:    '#EF5350',
  warning:   '#FFA726',
  successBg: '#1B3A1D',
  dangerBg:  '#3A1414',
  warningBg: '#3A2A0A',
};

export type Colors = typeof lightColors;
```

- [ ] **Step 2: Create typography constants**

```typescript
// constants/typography.ts
export const fonts = {
  extraBold: 'Inter_800ExtraBold',
  bold:      'Inter_700Bold',
  semiBold:  'Inter_600SemiBold',
  medium:    'Inter_500Medium',
  regular:   'Inter_400Regular',
};

export const type = {
  display:      { fontSize: 32, fontFamily: fonts.extraBold, letterSpacing: -1,   lineHeight: 38 },
  screenTitle:  { fontSize: 24, fontFamily: fonts.extraBold, letterSpacing: -0.5, lineHeight: 30 },
  cardHeading:  { fontSize: 18, fontFamily: fonts.bold,      letterSpacing: -0.3, lineHeight: 24 },
  sectionLabel: { fontSize: 15, fontFamily: fonts.semiBold,  letterSpacing: -0.2, lineHeight: 21 },
  body:         { fontSize: 14, fontFamily: fonts.regular,   letterSpacing: 0,    lineHeight: 22 },
  caption:      { fontSize: 12, fontFamily: fonts.medium,    letterSpacing: 0,    lineHeight: 18 },
  overline:     { fontSize: 10, fontFamily: fonts.bold,      letterSpacing: 1.5,  lineHeight: 14, textTransform: 'uppercase' as const },
};
```

- [ ] **Step 3: Create locale and API config**

```typescript
// config/locale.ts
export interface RegionConfig {
  currency: string;
  currencySymbol: string;
  defaultCountryCode: string;
  defaultDialCode: string;
  measurementSystem: 'metric' | 'imperial';
}

export const DEFAULT_REGION: RegionConfig = {
  currency: 'INR',
  currencySymbol: '₹',
  defaultCountryCode: 'IN',
  defaultDialCode: '+91',
  measurementSystem: 'metric',
};
```

```typescript
// config/api.ts
export const API_BASE = __DEV__
  ? 'http://192.168.1.100:3000'
  : 'https://api.sarthi.app';

export const API_TIMEOUT_MS = 30000;
```

- [ ] **Step 4: Seed locale file**

```json
// locales/en.json
{
  "welcome": {
    "overline": "EXPLORE INDIA YOUR WAY",
    "title": "Your personal travel companion",
    "body": "AI-powered destination finder, itineraries, and food guides — built for Indian travelers.",
    "cta": "Get Started",
    "signIn": "Already have an account? Sign in"
  },
  "login": {
    "title": "Welcome back",
    "body": "Sign in to continue planning your trips",
    "phonePlaceholder": "98765 XXXXX",
    "sendOtp": "Send OTP",
    "orContinueWith": "or continue with",
    "continueGoogle": "Continue with Google",
    "continueEmail": "Continue with Email",
    "terms": "By continuing you agree to our",
    "termsLink": "Terms",
    "privacyLink": "Privacy"
  },
  "otp": {
    "title": "Enter OTP",
    "codeSentTo": "Code sent to",
    "changeNumber": "Change number",
    "verify": "Verify & Continue",
    "resendIn": "Resend code in",
    "resend": "Resend OTP",
    "errorWrong": "Incorrect code. Try again.",
    "errorTooMany": "Too many attempts. Request a new code."
  },
  "email": {
    "title": "Continue with email",
    "emailLabel": "EMAIL",
    "passwordLabel": "PASSWORD",
    "confirmLabel": "CONFIRM PASSWORD",
    "continue": "Continue",
    "signIn": "Sign In",
    "createAccount": "Create Account",
    "forgotPassword": "Forgot password?",
    "resetSent": "Reset email sent"
  },
  "tabs": {
    "search": "Search",
    "trips": "Trips",
    "profile": "Profile"
  }
}
```

- [ ] **Step 5: Configure Tailwind with custom tokens**

```js
// tailwind.config.js
const { lightColors } = require('./constants/colors');

module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-base':    lightColors.bgBase,
        'bg-surface': lightColors.bgSurface,
        'bg-card':    lightColors.bgCard,
        'primary':    lightColors.primary500,
        'primary-50': lightColors.primary50,
        'primary-200':lightColors.primary200,
        'primary-600':lightColors.primary600,
        'text-primary':   lightColors.textPrimary,
        'text-secondary': lightColors.textSecondary,
        'text-tertiary':  lightColors.textTertiary,
        'border-default': lightColors.border,
        'border-focus':   lightColors.borderFocus,
      },
    },
  },
};
```

```css
/* global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Commit**

```bash
git add constants/ config/ locales/ tailwind.config.js global.css
git commit -m "feat: add design tokens, typography scale, and locale config"
```

---

## Task 3: Base UI Components — Button, Input, Card

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Card.tsx`
- Create: `__tests__/components/ui/Button.test.tsx`
- Create: `__tests__/components/ui/Input.test.tsx`

- [ ] **Step 1: Write Button tests**

```typescript
// __tests__/components/ui/Button.test.tsx
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
```

- [ ] **Step 2: Run Button tests — expect FAIL**

```bash
npx jest __tests__/components/ui/Button.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/ui/Button'`

- [ ] **Step 3: Implement Button**

```typescript
// components/ui/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, testID }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      style={[styles.base, styles[variant], isDisabled && styles.disabled]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : lightColors.primary500} size="small" />
      ) : null}
      <Text style={[styles.label, styles[`${variant}Label`]]}>
        {loading ? `${label}...` : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  disabled: { opacity: 0.7 },

  primary:     { backgroundColor: lightColors.primary500, shadowColor: lightColors.primary500, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  secondary:   { backgroundColor: lightColors.primary50, borderWidth: 1.5, borderColor: lightColors.primary200 },
  ghost:       { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: lightColors.border },
  destructive: { backgroundColor: lightColors.dangerBg, borderWidth: 1.5, borderColor: '#FFCDD2' },

  label:            { ...type.body, fontFamily: 'Inter_700Bold' },
  primaryLabel:     { color: '#fff' },
  secondaryLabel:   { color: lightColors.primary500 },
  ghostLabel:       { color: lightColors.textPrimary },
  destructiveLabel: { color: lightColors.danger },
});
```

- [ ] **Step 4: Run Button tests — expect PASS**

```bash
npx jest __tests__/components/ui/Button.test.tsx --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Write Input tests**

```typescript
// __tests__/components/ui/Input.test.tsx
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
```

- [ ] **Step 6: Run Input tests — expect FAIL**

```bash
npx jest __tests__/components/ui/Input.test.tsx --no-coverage
```

Expected: FAIL

- [ ] **Step 7: Implement Input**

```typescript
// components/ui/Input.tsx
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  testID?: string;
}

export function Input({ label, error, style, testID, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, focused && styles.labelFocused, error && styles.labelError]}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={lightColors.textTertiary}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { ...type.overline, color: lightColors.textSecondary, marginBottom: 6 },
  labelFocused: { color: lightColors.primary500 },
  labelError:   { color: lightColors.danger },
  input: {
    backgroundColor: lightColors.bgCard,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...type.body,
    color: lightColors.textPrimary,
  },
  inputFocused: {
    borderColor: lightColors.borderFocus,
    shadowColor: lightColors.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputError: { borderColor: lightColors.danger },
  errorText: { ...type.caption, color: lightColors.danger, marginTop: 4 },
});
```

- [ ] **Step 8: Write Card tests**

```typescript
// __tests__/components/ui/Card.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(<Card><Text>Hello</Text></Card>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies testID', () => {
    const { getByTestId } = render(<Card testID="my-card"><Text>x</Text></Card>);
    expect(getByTestId('my-card')).toBeTruthy();
  });
});
```

```bash
npx jest __tests__/components/ui/Card.test.tsx --no-coverage
```

Expected: FAIL

- [ ] **Step 9: Implement Card**

```typescript
// components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { lightColors } from '@/constants/colors';

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.bgCard,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
});
```

- [ ] **Step 10: Run all UI tests — expect PASS**

```bash
npx jest __tests__/components/ui/ --no-coverage
```

Expected: PASS — 11 tests (5 Button + 4 Input + 2 Card)

- [ ] **Step 11: Commit**

```bash
git add components/ui/Button.tsx components/ui/Input.tsx components/ui/Card.tsx \
  __tests__/components/ui/
git commit -m "feat: add Button, Input, Card base UI components with tests"
```

---

## Task 4: UI Components — Badge, Chip, OTPInput, LoadingSpinner

**Files:**
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Chip.tsx`
- Create: `components/ui/OTPInput.tsx`
- Create: `components/ui/LoadingSpinner.tsx`
- Create: `__tests__/components/ui/OTPInput.test.tsx`

- [ ] **Step 1: Write OTPInput tests**

```typescript
// __tests__/components/ui/OTPInput.test.tsx
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
```

- [ ] **Step 2: Write Badge and Chip tests**

```typescript
// __tests__/components/ui/Badge.test.tsx
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
```

```typescript
// __tests__/components/ui/Chip.test.tsx
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
```

```bash
npx jest __tests__/components/ui/Badge.test.tsx __tests__/components/ui/Chip.test.tsx --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Run OTPInput tests — expect FAIL**

```bash
npx jest __tests__/components/ui/OTPInput.test.tsx --no-coverage
```

- [ ] **Step 4: Implement OTPInput**

```typescript
// components/ui/OTPInput.tsx
import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

const OTP_LENGTH = 6;

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  testID?: string;
}

export function OTPInput({ value, onChange, hasError, testID }: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);

  const digits = value.split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <View style={styles.row}>
        {Array.from({ length: OTP_LENGTH }).map((_, i) => {
          const filled = i < digits.length;
          const active = i === digits.length;
          return (
            <View
              key={i}
              testID={`${testID}-box-${i}`}
              style={[
                styles.box,
                (filled || active) && !hasError && styles.boxActive,
                hasError && styles.boxError,
              ]}
            >
              {filled ? (
                <Text style={styles.digit}>{digits[i]}</Text>
              ) : active ? (
                <View style={styles.cursor} />
              ) : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        testID={`${testID}-hidden-input`}
        value={value}
        onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box: {
    width: 46, height: 54,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: {
    borderColor: lightColors.primary500,
    shadowColor: lightColors.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  boxError: { borderColor: lightColors.danger },
  digit: { ...type.screenTitle, color: lightColors.textPrimary },
  cursor: { width: 2, height: 26, borderRadius: 2, backgroundColor: lightColors.primary500 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
```

- [ ] **Step 5: Implement Badge**

```typescript
// components/ui/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

type BadgeVariant = 'match' | 'gem' | 'success' | 'missing' | 'warning' | 'dietary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  match:    { bg: lightColors.primary50,  text: lightColors.primary500 },
  gem:      { bg: lightColors.primary500, text: '#fff' },
  success:  { bg: lightColors.successBg,  text: lightColors.success },
  missing:  { bg: lightColors.bgSurface,  text: lightColors.textTertiary },
  warning:  { bg: lightColors.warningBg,  text: lightColors.warning },
  dietary:  { bg: '#FFF3E0',              text: '#E65100' },
};

export function Badge({ label, variant = 'match', style }: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  label: { ...type.caption, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Step 6: Implement Chip**

```typescript
// components/ui/Chip.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: lightColors.bgCard,
    borderWidth: 1.5, borderColor: lightColors.border,
  },
  chipSelected: {
    backgroundColor: lightColors.primary500, borderColor: lightColors.primary500,
    shadowColor: lightColors.primary500,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
  label:         { ...type.caption, fontFamily: 'Inter_500Medium', color: lightColors.textSecondary },
  labelSelected: { color: '#fff', fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Step 7: Implement LoadingSpinner**

```typescript
// components/ui/LoadingSpinner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface LoadingSpinnerProps {
  message?: string;
  subtitle?: string;
}

export function LoadingSpinner({ message = 'Sarthi is thinking...', subtitle }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.emoji}>🧭</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24 },
  icon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: lightColors.primary50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emoji: { fontSize: 32 },
  message:  { ...type.sectionLabel, color: lightColors.textPrimary, marginBottom: 6, textAlign: 'center' },
  subtitle: { ...type.body, color: lightColors.textSecondary, textAlign: 'center' },
});
```

- [ ] **Step 8: Run all Task 4 tests — expect PASS**

```bash
npx jest __tests__/components/ui/OTPInput.test.tsx __tests__/components/ui/Badge.test.tsx __tests__/components/ui/Chip.test.tsx --no-coverage
```

Expected: PASS — 8 tests

- [ ] **Step 9: Commit**

```bash
git add components/ui/ __tests__/components/ui/OTPInput.test.tsx \
  __tests__/components/ui/Badge.test.tsx __tests__/components/ui/Chip.test.tsx
git commit -m "feat: add Badge, Chip, OTPInput, LoadingSpinner components with tests"
```

---

## Task 5: Navigation Shell

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/index.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/search/index.tsx`
- Create: `app/(tabs)/trips/index.tsx`
- Create: `app/(tabs)/profile/index.tsx`

- [ ] **Step 1: Root layout with providers**

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium,
  Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium,
    Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Root index — stub redirect (will be upgraded in Task 6)**

Task 5 runs before auth.store exists, so use a simple redirect to welcome for now. Task 6 Step 8 replaces this with the real auth guard.

```typescript
// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
```

- [ ] **Step 3: Auth layout**

```typescript
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { lightColors } from '@/constants/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: lightColors.bgBase },
      }}
    />
  );
}
```

- [ ] **Step 4: Tabs layout with Warm Cream Pill nav**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

const TABS = [
  { name: 'search/index', label: 'SEARCH', icon: '🧭' },
  { name: 'trips/index',  label: 'TRIPS',  icon: '🗺' },
  { name: 'profile/index',label: 'PROFILE',icon: '👤' },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <View style={[styles.pillWrapper, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.pill}>
            {TABS.map((tab, i) => {
              const focused = state.index === i;
              return (
                <Pressable
                  key={tab.name}
                  onPress={() => navigation.navigate(tab.name)}
                  style={[styles.tabItem, focused && styles.tabItemActive]}
                >
                  <Text style={styles.icon}>{tab.icon}</Text>
                  <Text style={[styles.label, focused && styles.labelActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pillWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 0,
  },
  pill: {
    backgroundColor: lightColors.bgSurface,
    borderRadius: 32, flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 8,
    shadowColor: lightColors.primary500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    flexDirection: 'column', alignItems: 'center', gap: 3,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    opacity: 0.4,  // inactive tabs at 40% opacity per spec
  },
  tabItemActive: { backgroundColor: lightColors.primary500, opacity: 1 },
  icon:  { fontSize: 16 },
  label: { ...type.overline, color: lightColors.textSecondary, letterSpacing: 0.5 },
  labelActive: { color: '#fff' },
});
```

- [ ] **Step 5: Placeholder tab screens**

```typescript
// app/(tabs)/search/index.tsx
import { View, Text } from 'react-native';
export default function SearchScreen() {
  return <View style={{ flex: 1 }}><Text>Search — coming soon</Text></View>;
}
```

Repeat for `trips/index.tsx` and `profile/index.tsx` with matching placeholder content.

- [ ] **Step 6: Add auth placeholder screens (welcome, login, verify-otp, email)**

Each file just renders a placeholder `Text` for now — real screens come in Tasks 7–10.

```typescript
// app/(auth)/welcome.tsx
import { View, Text } from 'react-native';
export default function WelcomeScreen() {
  return <View style={{ flex: 1 }}><Text>Welcome</Text></View>;
}
```

- [ ] **Step 7: Run project in simulator**

```bash
npx expo start --ios
```

Expected: App launches, shows welcome placeholder, tab bar visible after navigating to tabs. No crashes.

- [ ] **Step 8: Commit**

```bash
git add app/
git commit -m "feat: navigation shell with auth guard, tab bar warm cream pill"
```

---

## Task 6: Auth Store, Theme Store & Firebase Service

**Files:**
- Create: `stores/auth.store.ts`
- Create: `stores/theme.store.ts`
- Create: `hooks/useAuth.ts`
- Create: `hooks/useColorScheme.ts`
- Create: `services/auth.service.ts`
- Create: `__tests__/stores/auth.store.test.ts`
- Create: `__tests__/stores/theme.store.test.ts`

- [ ] **Step 1: Write auth store tests**

```typescript
// __tests__/stores/auth.store.test.ts
import { useAuthStore } from '@/stores/auth.store';

beforeEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
});

describe('auth store', () => {
  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('sets user and marks authenticated', () => {
    const mockUser = { uid: '123', email: 'a@b.com' } as any;
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('clears user on sign out', () => {
    useAuthStore.getState().setUser({ uid: '123' } as any);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
```

- [ ] **Step 2: Run auth store tests — expect FAIL**

```bash
npx jest __tests__/stores/auth.store.test.ts --no-coverage
```

- [ ] **Step 3: Implement auth store**

```typescript
// stores/auth.store.ts
import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

- [ ] **Step 4: Write theme store tests**

```typescript
// __tests__/stores/theme.store.test.ts
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
```

- [ ] **Step 5: Implement theme store**

```typescript
// stores/theme.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeOverride = 'light' | 'dark' | 'system';

interface ThemeState {
  override: ThemeOverride;
  setOverride: (o: ThemeOverride) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      override: 'system',
      setOverride: (override) => set({ override }),
    }),
    { name: 'sarthi-theme', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

- [ ] **Step 6: Implement useColors and useAuth hooks**

```typescript
// hooks/useColorScheme.ts  (named useColorScheme.ts to match spec file map)
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '@/constants/colors';
import { useThemeStore } from '@/stores/theme.store';

export function useColors() {
  const systemScheme = useColorScheme();
  const override = useThemeStore(s => s.override);
  const effective = override === 'system' ? systemScheme : override;
  return effective === 'dark' ? darkColors : lightColors;
}
```

```typescript
// hooks/useAuth.ts
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';

export function useAuth() {
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  return { user, isAuthenticated, isLoading, signOut: authService.signOut };
}
```

> **Note on dark mode wiring:** Plan A components use hardcoded `lightColors` in `StyleSheet.create()`. StyleSheets are static — to fully wire dark mode per component, colors must be applied via `useColors()` inline. This architectural upgrade is deferred to Plan B when the component library is stabilized. The `theme.store` + `useColors` infrastructure is ready; dark mode in individual components is Plan B scope.

- [ ] **Step 7: Implement auth service**

```typescript
// services/auth.service.ts
import auth from '@react-native-firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/auth.store';

const TOKEN_KEY = 'sarthi_firebase_token';

export const authService = {
  init() {
    return auth().onAuthStateChanged(async (user) => {
      useAuthStore.getState().setUser(user);
      if (user) {
        const token = await user.getIdToken();
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      useAuthStore.getState().setLoading(false);
    });
  },

  async getToken(): Promise<string | null> {
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken();
  },

  async sendOTP(phoneNumber: string) {
    return auth().signInWithPhoneNumber(phoneNumber);
  },

  async signInWithGoogle(idToken: string) {
    const credential = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(credential);
  },

  async signInWithEmail(email: string, password: string) {
    return auth().signInWithEmailAndPassword(email, password);
  },

  async createAccount(email: string, password: string) {
    return auth().createUserWithEmailAndPassword(email, password);
  },

  async sendPasswordReset(email: string) {
    return auth().sendPasswordResetEmail(email);
  },

  async signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return auth().signOut();
  },
};
```

- [ ] **Step 8: Wire auth init into root layout + upgrade index.tsx**

Replace the stub `app/index.tsx` with the real auth guard:

```typescript
// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function Index() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  if (isLoading) return null;
  return <Redirect href={isAuthenticated ? '/(tabs)/search' : '/(auth)/welcome'} />;
}
```

In `app/_layout.tsx`, add the auth init effect and isLoading guard. Add these imports:
```typescript
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
```

Inside the `RootLayout` component, before the `if (!fontsLoaded) return null;` line:
```typescript
  const isAuthLoading = useAuthStore(s => s.isLoading);

  useEffect(() => {
    const unsubscribe = authService.init();
    return unsubscribe;
  }, []);

  if (!fontsLoaded || isAuthLoading) return null;
```

Remove the original `if (!fontsLoaded) return null;` line since it's now combined above.

- [ ] **Step 9: Run store tests — expect PASS**

```bash
npx jest __tests__/stores/ --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 10: Commit**

```bash
git add stores/ hooks/ services/ __tests__/stores/
git commit -m "feat: auth store, theme store, useColors hook, Firebase auth service"
```

---

## Task 7: Welcome Screen

**Files:**
- Modify: `app/(auth)/welcome.tsx`
- Create: `__tests__/screens/welcome.test.tsx`

- [ ] **Step 1: Write welcome screen tests**

```typescript
// __tests__/screens/welcome.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WelcomeScreen from '@/app/(auth)/welcome';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('WelcomeScreen', () => {
  it('renders app name', () => {
    const { getByText } = render(<WelcomeScreen />);
    expect(getByText('Sarthi')).toBeTruthy();
  });

  it('renders Get Started button', () => {
    const { getByText } = render(<WelcomeScreen />);
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('navigates to login on Get Started press', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push });
    const { getByText } = render(<WelcomeScreen />);
    fireEvent.press(getByText('Get Started'));
    expect(push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('renders slide dot indicators', () => {
    const { getAllByTestId } = render(<WelcomeScreen />);
    expect(getAllByTestId(/slide-dot-/)).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run welcome tests — expect FAIL**

```bash
npx jest __tests__/screens/welcome.test.tsx --no-coverage
```

- [ ] **Step 3: Implement Welcome screen**

```typescript
// app/(auth)/welcome.tsx
import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  { emoji: '🏔', label: 'Traveler on mountain' },
  { emoji: '🚂', label: 'Train through landscape' },
  { emoji: '🏕', label: 'Campfire with friends' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: any) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(slide);
  };

  const goToSlide = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
    setActiveSlide(i);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Logo */}
      <View style={styles.logo}>
        <View style={styles.logoIcon}><Text style={styles.logoEmoji}>🧭</Text></View>
        <Text style={styles.logoText}>Sarthi</Text>
      </View>

      {/* Illustration carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={onScroll} scrollEventThrottle={16}
        style={styles.carousel}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_WIDTH - 40 }]}>
            <Text style={styles.slideEmoji}>{slide.emoji}</Text>
            <Text style={styles.slideLabel}>{slide.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} testID={`slide-dot-${i}`} onPress={() => goToSlide(i)}>
            <View style={[styles.dot, activeSlide === i && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={styles.overline}>EXPLORE INDIA YOUR WAY</Text>
        <Text style={styles.title}>Your personal travel companion</Text>
        <Text style={styles.body}>
          AI-powered destination finder, itineraries, and food guides — built for Indian travelers.
        </Text>
      </View>

      {/* CTA */}
      <Button label="Get Started" onPress={() => router.push('/(auth)/login')} />
      <Pressable onPress={() => router.push('/(auth)/login')} style={styles.signInRow}>
        <Text style={styles.signInText}>
          Already have an account? <Text style={styles.signInLink}>Sign in</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.bgBase, paddingHorizontal: 20 },
  circle1: { position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(232,96,28,0.06)' },
  circle2: { position: 'absolute', bottom: 80, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(232,96,28,0.04)' },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32, marginTop: 8 },
  logoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: lightColors.primary500, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 20 },
  logoText: { ...type.cardHeading, fontFamily: 'Inter_800ExtraBold', color: lightColors.textPrimary },
  carousel: { flexGrow: 0, marginBottom: 16, marginHorizontal: -20 },
  slide: { marginHorizontal: 20, height: 200, backgroundColor: lightColors.bgSurface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  slideEmoji: { fontSize: 48 },
  slideLabel: { ...type.caption, color: lightColors.textSecondary },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: lightColors.border },
  dotActive: { width: 20, height: 8, borderRadius: 4, backgroundColor: lightColors.primary500 },
  textBlock: { marginBottom: 28 },
  overline: { ...type.overline, color: lightColors.textSecondary, marginBottom: 6 },
  title: { ...type.screenTitle, color: lightColors.textPrimary, marginBottom: 10 },
  body: { ...type.body, color: lightColors.textSecondary, lineHeight: 22 },
  signInRow: { alignItems: 'center', marginTop: 12 },
  signInText: { ...type.caption, color: lightColors.textSecondary },
  signInLink: { color: lightColors.primary500, fontFamily: 'Inter_600SemiBold' },
});
```

- [ ] **Step 4: Run welcome tests — expect PASS**

```bash
npx jest __tests__/screens/welcome.test.tsx --no-coverage
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/welcome.tsx __tests__/screens/welcome.test.tsx
git commit -m "feat: welcome screen with carousel and CTA"
```

---

## Task 8: Login Screen

**Files:**
- Modify: `app/(auth)/login.tsx`
- Create: `components/auth/PhoneInput.tsx`
- Create: `components/auth/GoogleSignInButton.tsx`
- Create: `__tests__/screens/login.test.tsx`

- [ ] **Step 1: Write login screen tests**

```typescript
// __tests__/screens/login.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('@/services/auth.service', () => ({ authService: { sendOTP: jest.fn().mockResolvedValue({}) } }));

describe('LoginScreen', () => {
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
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push, back: jest.fn() });
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('98765 XXXXX'), '9876543210');
    fireEvent.press(getByTestId('send-otp-btn'));
    await new Promise(r => setTimeout(r, 0));
    expect(push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(auth)/verify-otp' }));
  });
});
```

- [ ] **Step 2: Run login tests — expect FAIL**

```bash
npx jest __tests__/screens/login.test.tsx --no-coverage
```

- [ ] **Step 3: Implement PhoneInput component**

```typescript
// components/auth/PhoneInput.tsx
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  dialCode?: string;
  flag?: string;
}

export function PhoneInput({ value, onChangeText, dialCode = '+91', flag = '🇮🇳' }: PhoneInputProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.dialCode}>
        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.code}>{dialCode}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <View style={styles.divider} />
      <TextInput
        value={value}
        onChangeText={text => onChangeText(text.replace(/\D/g, '').slice(0, 10))}
        placeholder="98765 XXXXX"
        placeholderTextColor={lightColors.textTertiary}
        keyboardType="phone-pad"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: lightColors.bgCard,
    borderRadius: 12, borderWidth: 1.5, borderColor: lightColors.border,
    paddingHorizontal: 14, height: 50,
  },
  dialCode: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 },
  flag: { fontSize: 18 },
  code: { ...type.body, fontFamily: 'Inter_600SemiBold', color: lightColors.textPrimary },
  chevron: { ...type.caption, color: lightColors.textTertiary },
  divider: { width: 1, height: 20, backgroundColor: lightColors.border, marginRight: 12 },
  input: { flex: 1, ...type.body, color: lightColors.textPrimary },
});
```

- [ ] **Step 4: Implement GoogleSignInButton component**

```typescript
// components/auth/GoogleSignInButton.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export function GoogleSignInButton({ onPress, loading }: GoogleSignInButtonProps) {
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={[styles.btn, loading && styles.disabled]}
    >
      <Text style={styles.label}>G  Continue with Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 48, borderRadius: 12, borderWidth: 1.5,
    borderColor: lightColors.border, backgroundColor: lightColors.bgCard,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  disabled: { opacity: 0.7 },
  label: { ...type.body, fontFamily: 'Inter_600SemiBold', color: lightColors.textPrimary },
});
```

- [ ] **Step 5: Implement Login screen**

```typescript
// app/(auth)/login.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { authService } from '@/services/auth.service';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError('');
    try {
      const confirmation = await authService.sendOTP(`+91${phone}`);
      router.push({ pathname: '/(auth)/verify-otp', params: { phone, confirmation: JSON.stringify(confirmation) } });
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backIcon}>←</Text>
      </Pressable>
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}><Text>🧭</Text></View>
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.body}>Sign in to continue planning your trips</Text>

      <Text style={styles.label}>PHONE NUMBER</Text>
      <PhoneInput value={phone} onChangeText={setPhone} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        testID="send-otp-btn"
        label="Send OTP →"
        onPress={handleSendOTP}
        loading={loading}
        disabled={phone.length < 10}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleSignInButton onPress={() => {}} />
      <Pressable style={styles.altBtn} onPress={() => router.push('/(auth)/email')}>
        <Text style={styles.altBtnText}>✉️  Continue with Email</Text>
      </Pressable>

      <Text style={styles.terms}>
        By continuing you agree to our{' '}
        <Text style={styles.termsLink}>Terms</Text> &{' '}
        <Text style={styles.termsLink}>Privacy</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: lightColors.bgBase, paddingHorizontal: 20 },
  back: { width: 36, height: 36, borderRadius: 10, backgroundColor: lightColors.bgSurface, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  backIcon: { fontSize: 16, color: lightColors.textPrimary },
  logoRow: { alignItems: 'center', marginBottom: 28 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: lightColors.primary500, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.screenTitle, color: lightColors.textPrimary, marginBottom: 6 },
  body: { ...type.body, color: lightColors.textSecondary, marginBottom: 24 },
  label: { ...type.overline, color: lightColors.textSecondary, marginBottom: 6 },
  error: { ...type.caption, color: lightColors.danger, marginTop: -8, marginBottom: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: lightColors.border },
  dividerText: { ...type.caption, color: lightColors.textTertiary },
  altBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: lightColors.border, backgroundColor: lightColors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  altBtnText: { ...type.body, fontFamily: 'Inter_600SemiBold', color: lightColors.textPrimary },
  terms: { ...type.caption, color: lightColors.textTertiary, textAlign: 'center', marginTop: 'auto', paddingTop: 24 },
  termsLink: { color: lightColors.primary500 },
});
```

- [ ] **Step 6: Run login tests — expect PASS**

```bash
npx jest __tests__/screens/login.test.tsx --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 7: Commit**

```bash
git add app/(auth)/login.tsx components/auth/ __tests__/screens/login.test.tsx
git commit -m "feat: login screen with phone OTP, Google, and email options"
```

---

## Task 9: OTP Verify Screen

**Files:**
- Modify: `app/(auth)/verify-otp.tsx`
- Create: `__tests__/screens/verify-otp.test.tsx`

- [ ] **Step 1: Write OTP screen tests**

```typescript
// __tests__/screens/verify-otp.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import VerifyOTPScreen from '@/app/(auth)/verify-otp';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ phone: '9876543210' }),
}));

describe('VerifyOTPScreen', () => {
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

  it('shows error on wrong OTP', async () => {
    const confirmMock = { confirm: jest.fn().mockRejectedValue(new Error('bad code')) };
    jest.mock('@/services/auth.service', () => ({
      authService: { sendOTP: jest.fn().mockResolvedValue(confirmMock) },
    }));
    const { getByText, getByTestId } = render(<VerifyOTPScreen />);
    fireEvent.changeText(getByTestId('otp-hidden-input'), '123456');
    await waitFor(() => expect(getByText('Incorrect code. Try again.')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run OTP screen tests — expect FAIL**

```bash
npx jest __tests__/screens/verify-otp.test.tsx --no-coverage
```

- [ ] **Step 3: Implement OTP Verify screen**

```typescript
// app/(auth)/verify-otp.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { OTPInput } from '@/components/ui/OTPInput';
import { Button } from '@/components/ui/Button';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 3;

export default function VerifyOTPScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const confirmationRef = useRef<any>(null);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 60 }), withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }), withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const handleOTPChange = (value: string) => {
    setOtp(value);
    setError('');
    if (value.length === 6) verify(value);
  };

  const verify = async (code: string) => {
    if (!confirmationRef.current || attempts >= MAX_ATTEMPTS) return;
    setLoading(true);
    try {
      await confirmationRef.current.confirm(code);
      router.replace('/(tabs)/search');
    } catch {
      const next = attempts + 1;
      setAttempts(next);
      triggerShake();
      if (next >= MAX_ATTEMPTS) {
        setError('Too many attempts. Request a new code.');
        setOtp('');
        setSeconds(0);
      } else {
        setError('Incorrect code. Try again.');
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backIcon}>←</Text>
      </Pressable>

      <View style={styles.iconWrapper}>
        <Text style={styles.icon}>📱</Text>
      </View>

      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.sent}>Code sent to <Text style={styles.phone}>+91 {phone}</Text></Text>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.changeNumber}>Change number</Text>
      </Pressable>

      <Animated.View style={[styles.otpWrapper, shakeStyle]}>
        <OTPInput
          testID="otp"
          value={otp}
          onChange={handleOTPChange}
          hasError={!!error}
        />
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button label="Verify & Continue" onPress={() => verify(otp)} loading={loading} disabled={otp.length < 6 || attempts >= MAX_ATTEMPTS} />

      <View style={styles.resendRow}>
        {seconds > 0 ? (
          <Text style={styles.resendTimer}>
            Resend code in <Text style={styles.resendCount}>0:{String(seconds).padStart(2, '0')}</Text>
          </Text>
        ) : (
          <Pressable onPress={() => { setSeconds(RESEND_SECONDS); setAttempts(0); setOtp(''); setError(''); }}>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.bgBase, paddingHorizontal: 20 },
  back: { width: 36, height: 36, borderRadius: 10, backgroundColor: lightColors.bgSurface, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  backIcon: { fontSize: 16, color: lightColors.textPrimary },
  iconWrapper: { width: 72, height: 72, borderRadius: 36, backgroundColor: lightColors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  icon: { fontSize: 32 },
  title: { ...type.screenTitle, color: lightColors.textPrimary, marginBottom: 6 },
  sent: { ...type.body, color: lightColors.textSecondary, marginBottom: 4 },
  phone: { color: lightColors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  changeNumber: { ...type.body, color: lightColors.primary500, fontFamily: 'Inter_600SemiBold', marginBottom: 28 },
  otpWrapper: { marginBottom: 16 },
  errorText: { ...type.caption, color: lightColors.danger, textAlign: 'center', marginBottom: 16 },
  resendRow: { alignItems: 'center', marginTop: 16 },
  resendTimer: { ...type.caption, color: lightColors.textSecondary },
  resendCount: { fontFamily: 'Inter_700Bold', color: lightColors.textPrimary },
  resendLink: { ...type.body, color: lightColors.primary500, fontFamily: 'Inter_600SemiBold' },
});
```

- [ ] **Step 4: Run OTP screen tests — expect PASS**

```bash
npx jest __tests__/screens/verify-otp.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/verify-otp.tsx __tests__/screens/verify-otp.test.tsx
git commit -m "feat: OTP verify screen with error handling, retry limit, resend timer"
```

---

## Task 10: Email/Password Screen

**Files:**
- Create: `app/(auth)/email.tsx`
- Create: `__tests__/screens/email.test.tsx`

- [ ] **Step 1: Write email screen tests**

```typescript
// __tests__/screens/email.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EmailScreen from '@/app/(auth)/email';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/services/auth.service', () => ({
  authService: {
    signInWithEmail: jest.fn().mockResolvedValue({}),
    createAccount: jest.fn().mockResolvedValue({}),
    sendPasswordReset: jest.fn().mockResolvedValue({}),
  },
}));

describe('EmailScreen', () => {
  it('renders email input', () => {
    const { getByPlaceholderText } = render(<EmailScreen />);
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('renders Continue button initially', () => {
    const { getByText } = render(<EmailScreen />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('shows password field after entering email', () => {
    const { getByPlaceholderText, getByText } = render(<EmailScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(getByText('Continue'));
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('shows email format error', async () => {
    const { getByPlaceholderText, getByText } = render(<EmailScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'notanemail');
    fireEvent.press(getByText('Continue'));
    await waitFor(() => expect(getByText('Enter a valid email address')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run email tests — expect FAIL**

```bash
npx jest __tests__/screens/email.test.tsx --no-coverage
```

- [ ] **Step 3: Implement Email screen**

```typescript
// app/(auth)/email.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

type Step = 'email' | 'password' | 'register';

export default function EmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleContinue = async () => {
    if (step === 'email') {
      if (!isValidEmail(email)) { setError('Enter a valid email address'); return; }
      setStep('password');
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (step === 'password') {
        await authService.signInWithEmail(email, password);
      } else {
        if (password !== confirm) { setError('Passwords do not match'); setLoading(false); return; }
        await authService.createAccount(email, password);
      }
      router.replace('/(tabs)/search');
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') { setStep('register'); setError(''); }
      else if (e.code === 'auth/wrong-password') setError('Incorrect password.');
      else if (e.code === 'auth/email-already-in-use') setError('Email already in use.');
      else setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    await authService.sendPasswordReset(email);
    setResetSent(true);
    setLoading(false);
  };

  const ctaLabel = step === 'email' ? 'Continue' : step === 'password' ? 'Sign In' : 'Create Account';

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backIcon}>←</Text>
      </Pressable>

      <Text style={styles.title}>Continue with email</Text>

      <Input
        label="EMAIL"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={step === 'email'}
        error={step === 'email' ? error : undefined}
      />

      {step !== 'email' && (
        <Input
          label="PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          error={step === 'password' ? error : undefined}
        />
      )}

      {step === 'register' && (
        <Input
          label="CONFIRM PASSWORD"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="••••••••"
          secureTextEntry
          error={error}
        />
      )}

      {resetSent && <Text style={styles.resetSent}>Reset email sent ✓</Text>}

      <Button label={ctaLabel} onPress={handleContinue} loading={loading} />

      {step === 'password' && (
        <Pressable onPress={handleForgotPassword} style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: lightColors.bgBase, paddingHorizontal: 20 },
  back: { width: 36, height: 36, borderRadius: 10, backgroundColor: lightColors.bgSurface, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  backIcon: { fontSize: 16, color: lightColors.textPrimary },
  title: { ...type.screenTitle, color: lightColors.textPrimary, marginBottom: 24 },
  resetSent: { ...type.caption, color: lightColors.success, marginBottom: 12 },
  forgotRow: { alignItems: 'center', marginTop: 12 },
  forgotText: { ...type.body, color: lightColors.primary500, fontFamily: 'Inter_600SemiBold' },
});
```

- [ ] **Step 4: Run email tests — expect PASS**

```bash
npx jest __tests__/screens/email.test.tsx --no-coverage
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/email.tsx __tests__/screens/email.test.tsx
git commit -m "feat: email/password screen with sign-in, register, and password reset flows"
```

---

## Task 11: Full Test Run & QA Pass

**Goal:** Everything green, app runs end-to-end on simulator.

- [ ] **Step 1: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests PASS. Zero failures.

- [ ] **Step 2: Run on iOS simulator**

```bash
npx expo start --ios
```

Manual verification checklist:
- App launches to Welcome screen
- Carousel swipes between 3 slides, dots update
- "Get Started" navigates to Login
- Login shows phone input with +91 flag
- "Continue with Email" navigates to email screen
- Email screen validates email format
- After valid email, password input appears
- Tab bar shows Search / Trips / Profile with warm cream pill
- Active tab highlights in saffron

- [ ] **Step 3: Run on Android simulator**

```bash
npx expo start --android
```

Same manual checklist as iOS.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: Plan A complete — Foundation & Auth fully implemented and tested"
```

---

## Definition of Done

- [ ] All Jest tests pass (`npx jest`)
- [ ] App launches on both iOS and Android simulators without crashes
- [ ] All 4 auth screens render and navigate correctly
- [ ] Tab bar shows warm cream pill with saffron active state
- [ ] Firebase auth integration accepts valid phone OTP (tested with real device if needed)
- [ ] Dark mode togglable from theme store (verify colors swap in `useColors`)
