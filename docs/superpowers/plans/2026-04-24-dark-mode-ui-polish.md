# Dark Mode, Bug Fixes & UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix remaining bugs, implement system-wide dark mode via the `useColors()` hook pattern, and refine 5 screens to match approved mockups.

**Architecture:** Every file that imports `lightColors` is refactored to call `const colors = useColors()` inside the component and pass colors into a `makeStyles(colors)` factory function at the bottom of the file. The `useColors()` hook already exists at `hooks/useColorScheme.ts` and reads from `useThemeStore`. UI refinements are additive changes to existing screens — no files are deleted or renamed.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router v4, Zustand, TypeScript, `StyleSheet.create`

**Spec:** `docs/superpowers/specs/2026-04-24-dark-mode-ui-polish-design.md`

---

## File Map

**Created:**
- `utils/destinationGradient.ts` — deterministic gradient colour from destination name

**Modified (foundation):**
- `constants/colors.ts` — add `primary400` to lightColors
- `types/trip.types.ts` — extend ItineraryData with `tripReadiness?` and `highlights?`

**Modified (dark mode pattern — 35 files):**
All files listed in Workstream 2 of the spec. Pattern is identical in each.

**Modified (UI refinements):**
- `app/(tabs)/profile/index.tsx` — dark gradient header, stats, Switch toggles
- `app/(tabs)/trips/index.tsx` — gradient hero cards
- `app/(tabs)/search/index.tsx` — greeting header wrapper
- `components/search/SearchForm.tsx` — remove label overlap, improve layout
- `components/search/DestinationCard.tsx` — gradient hero image, mockup layout
- `app/trip/[id]/index.tsx` — hero gradient, readiness score, highlights, share row

---

## Task 1: Foundation — colors type, ItineraryData extension, gradient utility

**Files:**
- Modify: `sarthi-app/constants/colors.ts`
- Modify: `sarthi-app/types/trip.types.ts`
- Create: `sarthi-app/utils/destinationGradient.ts`

- [ ] **Step 1: Add `primary400` to `lightColors`**

In `constants/colors.ts`, add one line to `lightColors` (after `primary200`):

```typescript
primary400: '#F5A07A',
```

The full object should then read:
```typescript
export const lightColors = {
  bgBase:    '#FDF8F0',
  bgSurface: '#F5EFE6',
  bgCard:    '#FFFFFF',
  primary50:  '#FEF0E6',
  primary200: '#FBBF9A',
  primary400: '#F5A07A',   // ← add this
  primary500: '#E8601C',
  primary600: '#C44E12',
  primary700: '#9E3D0D',
  // ... rest unchanged
};
```

- [ ] **Step 2: Extend `ItineraryData` type**

In `types/trip.types.ts`, add two optional fields to `ItineraryData`:

```typescript
export interface ItineraryData {
  days: ItineraryDay[];
  costBreakdown: { transport: string; stay: string; food: string; activities: string; total: string };
  packingList: string[];
  permits?: { required: boolean; details?: string; estimatedCost?: string };
  healthAdvisory: { suitability: string; physicalDemand: string; considerations: string[]; recommendations: string[] };
  tripReadiness?: number;    // 0–100, placeholder until backend populates
  highlights?: string[];     // key destination highlights
}
```

- [ ] **Step 3: Create gradient utility**

Create `sarthi-app/utils/destinationGradient.ts`:

```typescript
const GRADIENTS: string[][] = [
  ['#1B4332', '#2D6A4F', '#52B788'], // forest
  ['#1A3A5C', '#2E5F8A', '#5B8DB8'], // ocean
  ['#3B2314', '#6B3F22', '#A0622F'], // desert
  ['#2C3E50', '#3D5166', '#5D7A8A'], // mountain
  ['#4A1942', '#7B2D7B', '#B05BB0'], // sunset
  ['#0D3B2E', '#1A6B52', '#2D9E7A'], // jungle
];

export function destinationGradient(name: string): string[] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd sarthi-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 5: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 6: Commit**

```bash
git add sarthi-app/constants/colors.ts sarthi-app/types/trip.types.ts sarthi-app/utils/destinationGradient.ts
git commit -m "feat: add primary400 to Colors type, extend ItineraryData, add gradient utility"
```

---

## Task 2: Bug fixes — OTP "Change number" + SearchForm label overlap

**Files:**
- Modify: `sarthi-app/app/(auth)/verify-otp.tsx`
- Modify: `sarthi-app/components/search/SearchForm.tsx`

- [ ] **Step 1: Add "Change number" to verify-otp screen**

In `app/(auth)/verify-otp.tsx`, find the block that shows the phone number (it shows `phone` from params). Add a tappable "Change number" link directly below it:

```typescript
// After the line showing the phone number, add:
<Pressable onPress={() => router.back()}>
  <Text style={styles.changeNumber}>Change number</Text>
</Pressable>
```

Add to the styles object (use `lightColors` here as a temporary placeholder — Task 5 will convert this file to the full `makeStyles(colors)` pattern, at which point it becomes `colors.primary500`):
```typescript
changeNumber: {
  ...type.body,
  color: lightColors.primary500,
  fontFamily: 'Inter_600SemiBold',
  marginBottom: 28,
},
```

- [ ] **Step 2: Remove label from multiline Input in SearchForm**

In `components/search/SearchForm.tsx`, the first `Input` is the multiline freetext one. Remove the `label` prop from it. Add a `Text` label above it manually instead so it matches the other section headers:

```typescript
// Replace:
<Input
  label="Describe your trip"
  placeholder="Describe your dream trip... beaches, mountains, culture?"
  value={formValues.freeText ?? ''}
  onChangeText={(v) => updateFormValues({ freeText: v })}
  multiline
  numberOfLines={3}
/>

// With:
<Text style={styles.label}>DESCRIBE YOUR TRIP</Text>
<Input
  placeholder="Describe your dream trip... beaches, mountains, culture?"
  value={formValues.freeText ?? ''}
  onChangeText={(v) => updateFormValues({ freeText: v })}
  multiline
  numberOfLines={3}
/>
```

- [ ] **Step 3: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 4: Commit**

```bash
git add sarthi-app/app/\(auth\)/verify-otp.tsx sarthi-app/components/search/SearchForm.tsx
git commit -m "fix: add OTP change number link and remove floating label overlap on search form"
```

---

## Task 3: Dark mode — UI components (batch 1 of 2)

**The makeStyles pattern — apply this identically to every file in this task:**

```typescript
// 1. Remove at top:
import { lightColors } from '@/constants/colors';

// 2. Add at top:
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';

// 3. Inside the component function, add as FIRST line:
const colors = useColors();
const styles = makeStyles(colors);

// 4. At the BOTTOM of the file, rename StyleSheet.create({...}) to:
function makeStyles(colors: Colors) {
  return StyleSheet.create({
    // ... exact same style definitions, but replace every lightColors.xxx with colors.xxx
  });
}
```

**Files in this batch:**
- `sarthi-app/components/ui/Button.tsx`
- `sarthi-app/components/ui/Input.tsx`
- `sarthi-app/components/ui/Card.tsx`
- `sarthi-app/components/ui/Badge.tsx`
- `sarthi-app/components/ui/Chip.tsx`
- `sarthi-app/components/ui/LoadingSpinner.tsx`
- `sarthi-app/components/ui/EmptyState.tsx`
- `sarthi-app/components/ui/SkeletonCard.tsx`
- `sarthi-app/components/ui/OTPInput.tsx`

- [ ] **Step 1: Apply makeStyles pattern to all 9 component files above**

For each file: (a) swap the import, (b) add `const colors = useColors(); const styles = makeStyles(colors);` at the top of the component function, (c) wrap the bottom StyleSheet.create in `function makeStyles(colors: Colors) { return StyleSheet.create({...}); }`, (d) replace all `lightColors.xxx` with `colors.xxx` inside the styles.

Note for `SkeletonCard.tsx`: it uses Reanimated — keep the animation logic unchanged, only swap the color references.

- [ ] **Step 2: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/components/ui/
git commit -m "feat: apply dark mode makeStyles pattern to ui/ components"
```

---

## Task 4: Dark mode — UI components (batch 2 of 2)

**Same makeStyles pattern as Task 3.**

**Files:**
- `sarthi-app/components/auth/GoogleSignInButton.tsx`
- `sarthi-app/components/auth/PhoneInput.tsx`
- `sarthi-app/components/search/SearchForm.tsx`
- `sarthi-app/components/search/FilterChips.tsx`
- `sarthi-app/components/search/DestinationCard.tsx`
- `sarthi-app/components/search/TrekCard.tsx`
- `sarthi-app/components/trip/ActivityCard.tsx`
- `sarthi-app/components/trip/DayTabs.tsx`
- `sarthi-app/components/trip/CostBreakdown.tsx`
- `sarthi-app/components/food/DishCard.tsx`

Note for `SearchForm.tsx`: the `Switch` component has hardcoded `trackColor` and `thumbColor` using `lightColors`. Those must also use `colors`:
```typescript
trackColor={{ true: colors.primary500, false: colors.border }}
thumbColor={colors.bgCard}
```

- [ ] **Step 1: Apply makeStyles pattern to all 10 files**

- [ ] **Step 2: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/components/auth/ sarthi-app/components/search/ sarthi-app/components/trip/ sarthi-app/components/food/
git commit -m "feat: apply dark mode makeStyles pattern to auth/search/trip/food components"
```

---

## Task 5: Dark mode — App screens (auth + tab layouts)

**Same makeStyles pattern. Files:**
- `sarthi-app/app/(auth)/welcome.tsx`
- `sarthi-app/app/(auth)/login.tsx`
- `sarthi-app/app/(auth)/verify-otp.tsx`
- `sarthi-app/app/(auth)/_layout.tsx`
- `sarthi-app/app/(tabs)/_layout.tsx`
- `sarthi-app/app/(tabs)/search/index.tsx`
- `sarthi-app/app/(tabs)/search/results.tsx`
- `sarthi-app/app/(tabs)/trips/index.tsx`

Note for `app/(tabs)/_layout.tsx`: the pill tab bar uses `lightColors` in StyleSheet — move these to makeStyles too. The `tabBar` render prop receives `state`/`navigation` so `colors` must be captured from the outer component scope via closure.

- [ ] **Step 1: Apply makeStyles pattern to all 8 files**

- [ ] **Step 2: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/app/\(auth\)/ sarthi-app/app/\(tabs\)/
git commit -m "feat: apply dark mode makeStyles pattern to auth and tab screens"
```

---

## Task 6: Dark mode — App screens (trip + shared screens)

**Same makeStyles pattern. Files:**
- `sarthi-app/app/itinerary/new.tsx`
- `sarthi-app/app/food-guide/new.tsx`
- `sarthi-app/app/trip/[id]/index.tsx`
- `sarthi-app/app/trip/[id]/itinerary.tsx`
- `sarthi-app/app/trip/[id]/food-guide.tsx`
- `sarthi-app/app/trip/[id]/share.tsx`
- `sarthi-app/app/shared/[token].tsx`

- [ ] **Step 1: Apply makeStyles pattern to all 7 files**

- [ ] **Step 2: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/app/itinerary/ sarthi-app/app/food-guide/ sarthi-app/app/trip/ sarthi-app/app/shared/
git commit -m "feat: apply dark mode makeStyles pattern to trip and shared screens"
```

---

## Task 7: Profile screen — full UI refinement

**File:** `sarthi-app/app/(tabs)/profile/index.tsx`

Replace the entire file content with the following (already uses makeStyles from Task 5):

- [ ] **Step 1: Rewrite profile screen**

```typescript
import { View, Text, Switch, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { useThemeStore } from '@/stores/theme.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { useState } from 'react';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { override, setOverride } = useThemeStore();
  const colors = useColors();
  const styles = makeStyles(colors);
  const [notificationsOn, setNotificationsOn] = useState(true);

  const isDark = override === 'dark';
  const initials = (user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => authService.signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Dark gradient header */}
        <View style={styles.header}>
          <View style={styles.headerDecorCircle} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.displayName ?? 'Traveller'}</Text>
          <Text style={styles.email}>{user?.email ?? user?.phoneNumber ?? ''}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>0</Text>
              <Text style={styles.statLabel}>TRIPS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>0</Text>
              <Text style={styles.statLabel}>DAYS PLANNED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>0</Text>
              <Text style={styles.statLabel}>SHARED</Text>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🌙</Text>
              <Text style={styles.rowLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setOverride(v ? 'dark' : 'system')}
              trackColor={{ true: colors.primary500, false: colors.border }}
              thumbColor={colors.bgCard}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🔔</Text>
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={setNotificationsOn}
              trackColor={{ true: colors.primary500, false: colors.border }}
              thumbColor={colors.bgCard}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🌐</Text>
              <Text style={styles.rowLabel}>Language</Text>
            </View>
            <Text style={styles.rowValue}>English ›</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.section}>
          <Pressable style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>📧</Text>
              <Text style={styles.rowLabel}>Change Email</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🚪</Text>
              <Text style={styles.rowLabel}>Sign Out</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🗑</Text>
              <Text style={[styles.rowLabel, { color: colors.danger }]}>Delete Account</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.footerLinks}>
          <Text style={styles.footerLink}>Terms</Text>
          {'  ·  '}
          <Text style={styles.footerLink}>Privacy</Text>
          {'  ·  '}
          <Text style={styles.footerLink}>Help</Text>
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    content: { paddingBottom: 40 },

    // Header
    header: {
      backgroundColor: '#2C1A08',
      paddingTop: 24, paddingHorizontal: 20, paddingBottom: 28,
      alignItems: 'center',
      overflow: 'hidden',
    },
    headerDecorCircle: {
      position: 'absolute', top: -30, right: -30,
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: 'rgba(232,96,28,0.12)',
    },
    avatar: {
      width: 56, height: 56, borderRadius: 18,
      backgroundColor: '#E8601C',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 10,
      shadowColor: '#E8601C', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    },
    avatarText: { fontSize: 26, color: '#fff', fontFamily: 'Inter_700Bold' },
    name: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#F5E6D3', letterSpacing: -0.3 },
    email: { fontSize: 12, color: 'rgba(245,230,211,0.6)', marginTop: 2, marginBottom: 12 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
    stat: { alignItems: 'center', paddingHorizontal: 16 },
    statNum: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#F5E6D3' },
    statLabel: { fontSize: 9, color: 'rgba(245,230,211,0.5)', letterSpacing: 0.5, marginTop: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },

    // Sections
    sectionLabel: {
      fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.textSecondary,
      letterSpacing: 1.5, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    },
    section: {
      marginHorizontal: 20, backgroundColor: colors.bgCard,
      borderRadius: 14, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.border,
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 13,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowIcon: { fontSize: 16 },
    rowLabel: { fontSize: 13, color: colors.textPrimary, fontFamily: 'Inter_400Regular' },
    rowValue: { fontSize: 12, color: colors.textSecondary },
    chevron: { fontSize: 14, color: colors.textTertiary },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },

    // Footer
    version: {
      textAlign: 'center', fontSize: 11,
      color: colors.textTertiary, marginTop: 24,
      fontFamily: 'Inter_400Regular',
    },
    footerLinks: { textAlign: 'center', marginTop: 6 },
    footerLink: { fontSize: 11, color: colors.textSecondary, fontFamily: 'Inter_400Regular' },
  });
}
```

- [ ] **Step 2: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/app/\(tabs\)/profile/index.tsx
git commit -m "feat: profile screen — dark gradient header, stats, Switch toggles"
```

---

## Task 8: Trips list — gradient hero cards

**File:** `sarthi-app/app/(tabs)/trips/index.tsx`

- [ ] **Step 1: Update TripCard to use gradient hero**

Replace the `TripCard` component (the inner function, not the screen):

```typescript
import { LinearGradient } from 'expo-linear-gradient';
import { destinationGradient } from '@/utils/destinationGradient';

function TripCard({ trip, colors, onPress, onDelete }: {
  trip: TripSummary;
  colors: Colors;
  onPress: () => void;
  onDelete: () => void;
}) {
  const gradient = destinationGradient(trip.destination);
  const styles = makeStyles(colors);

  const createdDaysAgo = Math.floor(
    (Date.now() - new Date(trip.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeAgo = createdDaysAgo === 0 ? 'Today' : createdDaysAgo === 1 ? '1 day ago' : `${createdDaysAgo} days ago`;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Gradient hero */}
      <LinearGradient
        colors={gradient as [string, string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        {/* Bottom fade — use a second LinearGradient; CSS `background` is ignored in React Native */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroContent}>
          <Text style={styles.heroName}>{trip.destination}</Text>
          <Text style={styles.heroState}>{trip.state}</Text>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </Pressable>
      </LinearGradient>

      {/* Card body */}
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{trip.dates.from} → {trip.dates.to}</Text>
          <Text style={styles.metaTime}>{timeAgo}</Text>
        </View>
        <View style={styles.badges}>
          <Text style={[styles.badge, trip.hasItinerary ? styles.badgeGreen : styles.badgeGrey]}>
            {trip.hasItinerary ? '✅ Itinerary' : '— Itinerary'}
          </Text>
          <Text style={[styles.badge, trip.hasFoodGuide ? styles.badgeGreen : styles.badgeGrey]}>
            {trip.hasFoodGuide ? '✅ Food Guide' : '— Food Guide'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
```

Update `makeStyles` to include new hero styles:
```typescript
heroGradient: { height: 70, position: 'relative' },
heroContent: { position: 'absolute', bottom: 8, left: 12 },
heroName: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
heroState: { fontSize: 9, color: 'rgba(255,255,255,0.75)' },
deleteBtn: { position: 'absolute', top: 8, right: 10, padding: 4 },
deleteIcon: { fontSize: 16 },
cardBody: { padding: 11 },
metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
metaText: { fontSize: 11, color: colors.textSecondary, fontFamily: 'Inter_400Regular' },
metaTime: { fontSize: 9, color: colors.textTertiary, fontFamily: 'Inter_400Regular' },
badges: { flexDirection: 'row', gap: 6 },
badge: { fontSize: 9, fontFamily: 'Inter_600SemiBold', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
badgeGreen: { backgroundColor: colors.successBg, color: colors.success },
badgeGrey: { backgroundColor: colors.bgSurface, color: colors.textTertiary },
```

Update the `renderItem` call to pass `colors`:
```typescript
renderItem={({ item }) => (
  <TripCard
    trip={item}
    colors={colors}
    onPress={() => router.push(`/trip/${item.id}` as any)}
    onDelete={() => handleDelete(item.id, item.name)}
  />
)}
```

Also update the header to include trip count subtitle:
```typescript
ListHeaderComponent={
  <View style={styles.listHeader}>
    <Text style={styles.heading}>My Trips</Text>
    {trips && trips.length > 0 && (
      <Text style={styles.subheading}>{trips.length} saved trip{trips.length !== 1 ? 's' : ''}</Text>
    )}
  </View>
}
```

Add to styles:
```typescript
listHeader: { marginBottom: 16 },
subheading: { ...type.body, color: colors.textSecondary },
```

- [ ] **Step 2: Install expo-linear-gradient if not already installed**

```bash
cd sarthi-app && npx expo install expo-linear-gradient 2>&1 | tail -5
```

Expected: installs or says already satisfied.

- [ ] **Step 3: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 4: Commit**

```bash
git add sarthi-app/app/\(tabs\)/trips/index.tsx sarthi-app/package.json sarthi-app/package-lock.json
git commit -m "feat: trips list — gradient hero cards with status badges"
```

---

## Task 9: Trip detail — hero, readiness score, highlights, share row

**File:** `sarthi-app/app/trip/[id]/index.tsx`

Replace entire file:

- [ ] **Step 1: Rewrite trip detail screen**

```typescript
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTrip } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { CostBreakdown } from '@/components/trip/CostBreakdown';
import { useColors } from '@/hooks/useColorScheme';
import { destinationGradient } from '@/utils/destinationGradient';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

const DEFAULT_HIGHLIGHTS = ['Scenic viewpoints', 'Local cuisine', 'Cultural experiences'];

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const styles = makeStyles(colors);
  const { data: trip, isLoading, error } = useTrip(id ?? '');

  if (isLoading) return <LoadingSpinner />;
  if (error || !trip) return <EmptyState title="Trip not found" />;

  const gradient = destinationGradient(trip.destination);
  const itinerary = trip.itineraryData;
  const readiness = itinerary?.tripReadiness ?? 75;
  const highlights = (itinerary?.highlights && itinerary.highlights.length > 0)
    ? itinerary.highlights
    : DEFAULT_HIGHLIGHTS;
  const dayCount = itinerary?.days?.length ?? 0;
  const foodGuide = trip.foodGuideData as any;
  const dishCount = foodGuide?.mustTryDishes?.length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero gradient */}
        <LinearGradient
          colors={gradient as [string, string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Dark overlay — use LinearGradient, not a plain View with rgba background */}
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.55)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} style={styles.heroBtn}>
              <Text style={styles.heroBtnText}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.heroBtn}>
              <Text style={styles.heroBtnText}>⋯</Text>
            </Pressable>
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroName}>{trip.destination}</Text>
            <Text style={styles.heroMeta}>
              {trip.dates.from} → {trip.dates.to}
              {trip.travelMode ? `  ·  ${trip.travelMode}` : ''}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* Trip Readiness */}
          <View style={styles.card}>
            <View style={styles.readinessHeader}>
              <Text style={styles.cardLabel}>TRIP READINESS</Text>
              <Text style={styles.readinessScore}>{readiness}/100</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${readiness}%` }]} />
            </View>
          </View>

          {/* Quick nav tiles */}
          <View style={styles.tilesRow}>
            <Pressable
              style={styles.tilePrimary}
              onPress={() => router.push(`/trip/${id}/itinerary` as any)}
            >
              <Text style={styles.tileEmoji}>📋</Text>
              <Text style={styles.tileLabelPrimary}>Itinerary</Text>
              <Text style={styles.tileSubPrimary}>{dayCount > 0 ? `${dayCount} days` : 'Not generated'}</Text>
            </Pressable>
            <Pressable
              style={[styles.tileSecondary, { borderColor: colors.border }]}
              onPress={() => router.push(`/trip/${id}/food-guide` as any)}
            >
              <Text style={styles.tileEmoji}>🍽️</Text>
              <Text style={[styles.tileLabelSecondary, { color: colors.textPrimary }]}>Food Guide</Text>
              <Text style={[styles.tileSubSecondary, { color: colors.textSecondary }]}>{dishCount > 0 ? `${dishCount} dishes` : 'Not generated'}</Text>
            </Pressable>
          </View>

          {/* Highlights */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>HIGHLIGHTS</Text>
            {highlights.map((h, i) => (
              <Text key={i} style={styles.highlight}>• {h}</Text>
            ))}
          </View>

          {/* Cost breakdown (existing component) */}
          {itinerary?.costBreakdown && (
            <CostBreakdown breakdown={itinerary.costBreakdown} />
          )}

          {/* Share row */}
          <Pressable
            style={styles.shareRow}
            onPress={() => router.push(`/trip/${id}/share` as any)}
          >
            <Text style={styles.shareIcon}>🔗</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareTitle}>Share this trip</Text>
              <Text style={styles.shareSub}>Anyone with the link can view</Text>
            </View>
            <View style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>Share</Text>
            </View>
          </Pressable>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    content: { paddingBottom: 40 },

    // Hero
    hero: { height: 120, position: 'relative' },
    heroTop: {
      position: 'absolute', top: 14, left: 14, right: 14,
      flexDirection: 'row', alignItems: 'center',
    },
    heroBtn: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    heroBtnText: { fontSize: 13, color: '#fff' },
    heroBottom: { position: 'absolute', bottom: 12, left: 14 },
    heroName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: -0.3 },
    heroMeta: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

    // Body
    body: { padding: 16, gap: 12 },
    card: {
      backgroundColor: colors.bgCard, borderRadius: 12,
      padding: 13, borderWidth: 1, borderColor: colors.border,
      gap: 8,
    },
    cardLabel: {
      fontSize: 10, fontFamily: 'Inter_700Bold',
      color: colors.textSecondary, letterSpacing: 1,
    },

    // Readiness
    readinessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    readinessScore: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.primary500 },
    progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 10, overflow: 'hidden' },
    progressFill: { height: 6, backgroundColor: colors.primary500, borderRadius: 10 },

    // Tiles
    tilesRow: { flexDirection: 'row', gap: 8 },
    tilePrimary: {
      flex: 1, backgroundColor: colors.primary500, borderRadius: 12, padding: 14,
      shadowColor: colors.primary500, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
    },
    tileSecondary: {
      flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, padding: 14,
      borderWidth: 1.5,
    },
    tileEmoji: { fontSize: 20, marginBottom: 4 },
    tileLabelPrimary: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff' },
    tileSubPrimary: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    tileLabelSecondary: { fontSize: 12, fontFamily: 'Inter_700Bold' },
    tileSubSecondary: { fontSize: 10, marginTop: 1 },

    // Highlights
    highlight: { fontSize: 12, color: colors.textPrimary, fontFamily: 'Inter_400Regular' },

    // Share row
    shareRow: {
      backgroundColor: colors.bgSurface, borderRadius: 12,
      padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary200,
    },
    shareIcon: { fontSize: 18 },
    shareTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textPrimary },
    shareSub: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
    shareBtn: {
      backgroundColor: colors.primary500, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    shareBtnText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff' },
  });
}
```

- [ ] **Step 2: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/app/trip/\[id\]/index.tsx
git commit -m "feat: trip detail — gradient hero, readiness score, highlights, share row"
```

---

## Task 10: Search form — greeting header + layout cleanup

**Files:**
- `sarthi-app/app/(tabs)/search/index.tsx`
- `sarthi-app/components/search/SearchForm.tsx`

- [ ] **Step 1: Add time-of-day greeting to search screen**

In `app/(tabs)/search/index.tsx`, add a greeting header above the ScrollView content (inside the SafeAreaView):

```typescript
function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
```

Update the return JSX to add a header section before `<SearchForm>`:

```typescript
return (
  <SafeAreaView style={styles.safe}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greeting}>
        <Text style={styles.greetingOverline}>{getGreeting().toUpperCase()}</Text>
        <Text style={styles.greetingTitle}>Where to next?</Text>
        <Text style={styles.greetingSub}>Describe your dream trip and Sarthi will find it.</Text>
      </View>
      <SearchForm onSubmit={handleSearch} loading={searchMutation.isPending} />
    </ScrollView>
  </SafeAreaView>
);
```

Add greeting styles to makeStyles:
```typescript
greeting: { marginBottom: 20 },
greetingOverline: { ...type.overline, color: colors.textSecondary, marginBottom: 4 },
greetingTitle: { ...type.screenTitle, color: colors.textPrimary, marginBottom: 4 },
greetingSub: { ...type.body, color: colors.textSecondary },
```

Remove the `sectionTitle` style from `SearchForm.tsx` and delete its usage (the greeting header now replaces it).

- [ ] **Step 2: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/app/\(tabs\)/search/index.tsx sarthi-app/components/search/SearchForm.tsx
git commit -m "feat: search screen — time-of-day greeting header"
```

---

## Task 11: Destination card — gradient hero image

**File:** `sarthi-app/components/search/DestinationCard.tsx`

- [ ] **Step 1: Rewrite DestinationCard with gradient hero**

```typescript
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColorScheme';
import { destinationGradient } from '@/utils/destinationGradient';
import { Button } from '@/components/ui/Button';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { SearchResultDestination } from '@/types/search.types';

interface DestinationCardProps {
  destination: SearchResultDestination;
  onGetItinerary: () => void;
  onGetFoodGuide: () => void;
}

export function DestinationCard({ destination, onGetItinerary, onGetFoodGuide }: DestinationCardProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const gradient = destinationGradient(destination.name);

  return (
    <View style={styles.card}>
      {/* Gradient hero */}
      <LinearGradient
        colors={gradient as [string, string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroOverlay} />

        {/* Hidden gem badge */}
        {destination.isHiddenGem && (
          <View style={styles.gemBadge}>
            <Text style={styles.gemText}>🌿 Hidden Gem</Text>
          </View>
        )}

        {/* Match % badge */}
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{destination.tripReadiness.score}% match</Text>
        </View>

        {/* Name overlay */}
        <View style={styles.heroBottom}>
          <Text style={styles.heroName}>{destination.name}</Text>
          <Text style={styles.heroState}>{destination.state}</Text>
        </View>
      </LinearGradient>

      {/* Card body */}
      <View style={styles.body}>
        <Text style={styles.why}>{destination.whyItMatches}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Text style={styles.stat}>💰 {destination.budgetEstimate}</Text>
          <Text style={styles.stat}>⛅ {destination.weatherNow}</Text>
          <Text style={styles.stat}>🕐 {destination.travelTime}</Text>
          <Text style={styles.stat}>🏥 {destination.healthAdvisory.suitability}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.actionBtn}>
            <Button label="Get Itinerary" onPress={onGetItinerary} />
          </View>
          <View style={styles.actionBtn}>
            <Button label="Food Guide" onPress={onGetFoodGuide} variant="secondary" />
          </View>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard, borderRadius: 16,
      marginBottom: 12, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
    },
    hero: { height: 140, position: 'relative' },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    gemBadge: {
      position: 'absolute', top: 12, left: 12,
      backgroundColor: colors.primary500,
      borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4,
    },
    gemText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff' },
    matchBadge: {
      position: 'absolute', top: 12, right: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    matchText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff' },
    heroBottom: { position: 'absolute', bottom: 10, left: 14 },
    heroName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: -0.3 },
    heroState: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },

    body: { padding: 14, gap: 10 },
    why: { ...type.body, color: colors.textSecondary },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    stat: {
      ...type.caption, color: colors.textSecondary,
      backgroundColor: colors.bgSurface, borderRadius: 6,
      paddingHorizontal: 9, paddingVertical: 4,
    },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1 },
  });
}
```

- [ ] **Step 2: Run tests**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/components/search/DestinationCard.tsx
git commit -m "feat: destination card — gradient hero image, match badge, mockup layout"
```

---

## Task 12: Final verification and plan-document-reviewer prompt

**Files:** none new — verify everything works together.

- [ ] **Step 1: Full test run**

```bash
cd sarthi-app && npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: `41 passed`, `0 failed`.

- [ ] **Step 2: TypeScript check**

```bash
cd sarthi-app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: no new errors.

- [ ] **Step 3: Verify no lightColors references remain in app/ or components/**

```bash
grep -r "lightColors" sarthi-app/app sarthi-app/components --include="*.tsx" -l
```

Expected: no output (zero matches). If any file still references `lightColors`, apply the makeStyles pattern to it. Note: importing `Colors` type from `@/constants/colors` is fine and expected — only `lightColors` direct usage is a problem.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification — dark mode, bug fixes, UI polish complete"
```
