# Phase 2D Mobile App UI Design

> **Status:** Ready for user approval before implementation
> **Date:** 2026-05-06
> **Components:** Activity Approaching Alert Card, Enhanced Location Suggestion Card

---

## Overview

Two new components integrate Phase 2D backend features into the existing Live Guide screen without structural changes:

1. **Activity Approaching Alert** — Time-sensitive card notifying user to leave for next activity
2. **Enhanced Location Suggestion** — Existing suggestion card with personalization fields

Both cards follow established Sarthi design patterns (inline styling, borderRadius 12, shadow elevation).

---

## Component 1: Activity Approaching Alert Card

### Purpose
Alerts user when they should leave for the next itinerary activity based on travel distance and their travel pace preference. Placed prominently at top of screen for immediate visibility.

### Placement & Layout

**Screen Position:** Top of ScrollView, before Morning Briefing card

```
┌─────────────────────────────────────────┐
│  Live Guide                    [← Trip] │
│ ─────────────────────────────────────────│
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃ ⏰ TIME TO LEAVE              ✕  ┃ │  ← Activity Alert Card
│  ┃ Visit Colaba & Gateway        ┃ │  ← Activity name (bold, primary text)
│  ┃ 2.4 km away · 12 min travel   ┃ │  ← Distance + estimated time
│  ┃ [🗺️ Open in Maps]             ┃ │  ← Map link button
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                      │
│  ☀️  MORNING BRIEFING                │  ← Morning briefing (existing)
│  Today is a great day to...          │
│ ─────────────────────────────────────│
```

### Styling Details

| Property | Light Theme | Dark Theme | Notes |
|----------|------------|-----------|-------|
| **Background** | `#FFF8E1` (warningBg) | `#3A2A0A` (warningBg) | Warm, alert color |
| **Border** | `2px solid #F57C00` (warning) | `2px solid #FFA726` (warning) | Prominent orange accent |
| **Border Radius** | `12px` | `12px` | Consistent with cards |
| **Padding** | `14px` | `14px` | Compact spacing |
| **Elevation** | `3` | `3` | Slight shadow for emphasis |
| **Shadow Color** | Warning color | Warning color | Matches border |
| **Shadow Opacity** | 0.18 | 0.18 | Subtle depth |

### Typography

| Element | Style | Light | Dark | Notes |
|---------|-------|-------|------|-------|
| **Overline** | `10px bold, 1.5px letter-spacing, UPPERCASE` | `#F57C00` | `#FFA726` | Warning color |
| **Activity Title** | `15px bold (800 weight), -0.3px letter-spacing` | `#1A1208` | `#F5E6D3` | High contrast, bold |
| **Meta Text** | `12px regular` | `#A0856E` | `#8C7260` | Secondary text |
| **Dismiss Button** | `13px bold, 0.7 opacity` | `#F57C00` | `#FFA726` | Warning color, slightly faded |

### Content Structure

```typescript
interface ActivityApproachingAlert {
  activityIndex: number;           // 0, 1, 2, ...
  activity: string;                // "Visit Colaba & Gateway of India"
  distance: number;                // meters (2400)
  estimatedTravelTime: number;     // minutes (12)
  mapQuery: string;                // "Colaba, Mumbai" (for maps link)
}
```

### Card Content

```
┌─────────────────────────────────────────────────────┐
│  Header Row (flex, space-between)                   │
│  ┌────────────────────┐          ┌──────────────┐  │
│  │ ⏰  TIME TO LEAVE   │          │      ✕       │  │
│  └────────────────────┘          └──────────────┘  │
│                                                     │
│  Visit Colaba & Gateway of India                   │
│  (15px bold, primary text, margin-bottom: 3)       │
│                                                     │
│  2.4 km away · 12 min travel                        │
│  (12px secondary text, margin-bottom: 8)           │
│                                                     │
│  [🗺️ Open in Maps]                                 │
│  (MapLinkButton component, existing)               │
└─────────────────────────────────────────────────────┘
```

### Interaction Details

1. **Auto-dismiss:** Card automatically dismisses after 30 seconds
   - Timer ref: `alertDismissTimer`
   - Clears on unmount or when alert changes
   - Silent — no visual countdown timer

2. **Manual dismiss:** User taps ✕ button (top-right, hit slop 8px)
   - Sets `activityAlert = null`
   - No animation, instant removal

3. **Map button:** Taps "Open in Maps"
   - Uses `MapLinkButton` component
   - Opens Google Maps with query (e.g., "Colaba, Mumbai")
   - Existing component, no changes needed

### State Management

- **Store:** `live-guide.store` → `activityAlert` (null | ActivityApproachingAlert)
- **Action:** `setActivityAlert(alert)`
- **WebSocket:** `activity_approaching` event from server
- **Hook:** `useLiveGuide()` wires the socket listener

### Visual Emphasis

- **Why warning colors?** Activity time notifications are *urgent* — user must leave soon. Orange/amber signals "act now" without feeling alarming (not red).
- **Why top placement?** Critical information deserves top position. Morning Briefing is informational; Activity Alert is actionable.
- **Why 2px border?** Distinguishes from softer suggestion cards (1px border). Matches urgency.

---

## Component 2: Enhanced Location Suggestion Card

### Purpose
Suggest nearby places based on user's travel style and available time. Now includes personalization rationale, confidence score, and travel time estimate.

### Current State (Before Phase 2D)

```
┌────────────────────────────────────────┐
│ 📍 Nearby Suggestion                   │
│ Leopold Cafe                           │
│ Great for evening relaxation.          │
│ [🗺️ Open in Maps]                     │
└────────────────────────────────────────┘
```

### After Phase 2D Enhancement

```
┌────────────────────────────────────────┐
│ 📍 Nearby Suggestion      [92% match]  │  ← Match score badge (NEW)
│ Leopold Cafe                           │
│ Matches your love of relaxation        │  ← Reasoning (NEW, italicized)
│ ~8 min away                            │  ← Travel time (NEW)
│ [🗺️ Open in Maps]                     │
└────────────────────────────────────────┘
```

### New Fields & Styling

#### Match Score Badge

**Position:** Top-right of card, header row with overline

**Styling:**
- **Background:** Primary color (`#E8601C` light, `#F07540` dark)
- **Padding:** `7px horizontal × 2px vertical`
- **Border radius:** `10px` (pill shape)
- **Text color:** `#FFFFFF` (white, inverse)
- **Font:** `9px bold`
- **Content:** `{matchScore}% match` (e.g., "92% match")

**Layout:**
```
┌───────────────────────────────────────────┐
│  ┌─────────────────────┐  ┌─────────────┐ │
│  │ 📍 Nearby Suggestion│  │ 92% match   │ │
│  └─────────────────────┘  └─────────────┘ │
└───────────────────────────────────────────┘
```

#### Reasoning Text

**Position:** Below place name, before map button

**Styling:**
- **Font:** `11px italic`
- **Color:** Secondary text (`#A0856E` light, `#8C7260` dark)
- **Line height:** `16px`
- **Margin:** `3px top`
- **Example:** "Matches your love of relaxation and cultural observation"

**Visual Hierarchy:**
```
Leopold Cafe
(place name, bold)

Matches your love of relaxation and cultural observation
(reasoning, italic secondary)

~8 min away
(travel time, tertiary)

[🗺️ Open in Maps]
(button)
```

#### Travel Time

**Position:** Below reasoning, above map button

**Styling:**
- **Font:** `10px bold`
- **Color:** Tertiary text (`#C4B5A5` light, `#5A4535` dark)
- **Margin:** `1px top, 6px bottom`
- **Content:** `~{estimatedTravelTime} min away` (e.g., "~8 min away")

### Content Structure

```typescript
interface PersonalizedSuggestion {
  suggestion: string;           // "Leopold Cafe is perfect for evening relaxation..."
  placeName: string;            // "Leopold Cafe"
  mapQuery: string;             // "Leopold Cafe, Mumbai"
  reasoning?: string;           // "Matches your love of relaxation" (NEW)
  estimatedTravelTime?: number; // 8 (walking minutes) (NEW)
  matchScore?: number;          // 92 (0-100) (NEW)
}
```

### Backward Compatibility

**Old-format suggestion (no new fields):**
```typescript
{
  suggestion: "Leopold Cafe",
  placeName: "Leopold Cafe",
  mapQuery: "Leopold Cafe, Mumbai"
  // No reasoning, matchScore, estimatedTravelTime
}
```

**Rendering:** All new fields are optional. Card renders identically if fields missing — no visual regression.

```
Conditional rendering:
- if (matchScore) → show badge
- if (reasoning) → show reasoning line
- if (estimatedTravelTime) → show travel time
```

### State Management

- **Store:** `live-guide.store` → `nearbySuggestion` (existing, extended type)
- **WebSocket:** `location_suggestion` event (enhanced payload)
- **Hook:** `useLiveGuide()` (existing listener)
- **No state changes needed** — only type updates

### Rate Limiting

- Max 1 suggestion per hour (tracked in session)
- Deduplication: don't suggest same place twice in same session
- Fallback: if old-format suggestion arrives, render without new fields

---

## Color Reference

### Light Theme
```
Activity Alert:
  Background: #FFF8E1 (warningBg)
  Border:     #F57C00 (warning)
  Text:       #1A1208 (textPrimary)

Location Suggestion (enhancements):
  Match Badge:    #E8601C (primary500) bg, #FFFFFF text
  Reasoning:      #A0856E (textSecondary)
  Travel Time:    #C4B5A5 (textTertiary)
```

### Dark Theme
```
Activity Alert:
  Background: #3A2A0A (warningBg)
  Border:     #FFA726 (warning)
  Text:       #F5E6D3 (textPrimary)

Location Suggestion (enhancements):
  Match Badge:    #F07540 (primary500) bg, #1A1208 text
  Reasoning:      #8C7260 (textSecondary)
  Travel Time:    #5A4535 (textTertiary)
```

---

## Screen Layout Sequence

**Full Live Guide Screen (Live Guide Screen with Phase 2D features):**

```
┌─────────────────────────────────────────────────────┐
│ Live Guide                              ← Trip [▶] │
│ ─────────────────────────────────────────────────────│
│ Day 1 · 5 May                                        │
│                                                      │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ ⏰ TIME TO LEAVE                          ✕  ┃  │  1. ACTIVITY ALERT
│ ┃ Visit Colaba & Gateway of India          ┃  │
│ ┃ 2.4 km away · 12 min travel               ┃  │
│ ┃ [🗺️ Open in Maps]                         ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                      │
│ ☀️  MORNING BRIEFING                               │  2. MORNING BRIEFING
│ Today is a great day to explore the...             │
│ Generated by Sarthi AI                             │
│ ─────────────────────────────────────────────────── │
│                                                      │
│ 🍽️  BREAKFAST                                      │  3. MEAL NUDGE (if scheduled)
│ Try the poha at Mahesh's - it's authentic!         │
│ ─────────────────────────────────────────────────── │
│                                                      │
│ Today's Plan                                        │  4. SECTION LABEL
│ ┌───────────────────────────────────────────────┐  │
│ │ 08:00 NOW · Visit Colaba                      │  │  5. CURRENT ACTIVITY (blue border)
│ │ ₹500                                           │  │
│ │ [✓ Done] [Skip] [Replan] [✓ Mark done]      │  │
│ └───────────────────────────────────────────────┘  │
│                                                      │
│ ┌───────────────────────────────────────────────┐  │
│ │ 11:00 Lunch at Mahesh Restaurant              │  │  6. NEXT ACTIVITY
│ │ ₹1200                                          │  │
│ └───────────────────────────────────────────────┘  │
│                                                      │
│ ┌───────────────────────────────────────────────┐  │
│ │ 14:00 Visit Gateway of India Monument         │  │  7. FUTURE ACTIVITY
│ │ ₹0 · Free                                      │  │
│ └───────────────────────────────────────────────┘  │
│                                                      │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ 📍 Nearby Suggestion         [92% match]  ┃  │  8. LOCATION SUGGESTION (NEW)
│ ┃ Leopold Cafe                               ┃  │
│ ┃ Matches your love of relaxation            ┃  │
│ ┃ ~8 min away                                ┃  │
│ ┃ [🗺️ Open in Maps]                          ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                      │
│ [Scroll for more]                                   │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Notes

### No New Components
- Both cards use **inline styling** in `live-guide.tsx` (existing pattern)
- Reuse `MapLinkButton` component (already exists)
- No new component files needed

### File Changes Only
1. **types/live-guide.types.ts** — Extend `Suggestion` interface, add `ActivityApproachingAlert`
2. **stores/live-guide.store.ts** — Add `activityAlert` state
3. **hooks/useLiveGuide.ts** — Wire `activity_approaching` socket listener
4. **app/trip/[id]/live-guide.tsx** — Add alert card JSX + enhance suggestion card JSX
5. **constants/colors.ts** — Verify `warning` and `warningBg` exist (they do ✓)

### Typography System
- Uses existing `type` system from constants
- No new fonts needed
- Font weights: 400 (regular), 600 (semibold), 700 (bold), 800 (heavy)

### Spacing & Layout
- Card padding: `14px` (consistent)
- Border radius: `12px` (consistent)
- Gap between header elements: `12px` (consistent)
- Margin between cards: `4px` vertical (tight spacing)

---

## Success Criteria for Design

✅ **Visual Clarity**
- Activity alert card clearly distinguishable from suggestion card (warning vs. primary colors)
- Match score badge instantly readable (pill shape, white text on colored bg)
- Hierarchy clear: title > reasoning > travel time

✅ **Consistency**
- Follows existing card patterns (borderRadius, padding, elevation)
- Color palette matches Sarthi theme (warning, primary, secondary)
- Typography uses existing system

✅ **Usability**
- Alert card top position ensures visibility for time-sensitive action
- Auto-dismiss after 30s removes clutter without user action
- Manual dismiss ✕ always available
- All interactive elements (buttons, map links) easily tappable

✅ **Backward Compatibility**
- Old suggestion format (no new fields) renders identically
- Optional chaining on new fields (reasoning, matchScore, estimatedTravelTime)

---

## Next Steps

1. **User Review & Approval:** Review the above design
   - Colors acceptable?
   - Placement and layout make sense?
   - Typography/spacing clear?
   - Any changes needed?

2. **Implementation:** Once approved, proceed with 5-task plan
   - Task 1: Update types
   - Task 2: Extend store
   - Task 3: Wire socket events
   - Task 4: Add UI to live-guide.tsx
   - Task 5: Activity schedule API hook

3. **Testing:** Manual testing on device
   - Verify alert card appears when activity approaching
   - Verify auto-dismiss works
   - Verify suggestion card with new fields renders correctly
   - Verify backward compatibility (old suggestions still work)

---

**Design Owner:** Phase 2D Mobile UI  
**Created:** 2026-05-06  
**Status:** Ready for approval
