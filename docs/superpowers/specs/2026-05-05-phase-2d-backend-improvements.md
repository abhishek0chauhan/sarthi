# Phase 2D Backend Improvements — Activity Time Notifications & Personalized Location Suggestions

## Goal

Enhance Live Sarthi Mode backend with two critical features:
1. **Smart Activity Time Notifications** — notify users when to leave for the next activity based on travel distance + their travel pace preference
2. **Personalized Location Suggestions** — provide hyper-relevant nearby place recommendations based on user's travel style, budget, interests, and available time

---

## Context

Phase 2D Live Sarthi Mode is complete with morning briefings, meal nudges, and basic location suggestions. These improvements build on that foundation to increase user engagement and trip value. Users currently receive generic location suggestions; this plan personalizes them. Activity time notifications are entirely new.

---

## Architecture

### Services

**New Services:**
- `activity-scheduler.service.ts` — Calculate next activity + travel time based on user's travel pace preference
- Enhanced `ai.service.ts` — Accept user profile context in location suggestion generation

**Modified Services:**
- `live-guide.service.ts` — Initialize activity scheduler, cache user profile, pass profile to AI
- `notification.service.ts` — Support activity time notifications via FCM + WebSocket

### Data Flow

```
Guide Activation
  ↓
Fetch user profile → Cache in session
  ↓
Calculate all activities for today + travel times
  ↓
Schedule activity time notifications (adjust by user's pace)
  ↓
Monitor user location updates
  ↓
When appropriate: Send activity_approaching event (WebSocket) or FCM push
  ↓
Generate personalized location suggestions using cached profile
```

---

## Feature 1: Activity Time Notifications

### How It Works

1. **On guide activation:**
   - Fetch user's `travelPace` preference from profile (`packed` | `loose` | `no_plan`)
   - For each activity today, calculate distance from user's current location
   - Estimate travel time via Google Maps Distance Matrix API
   - Apply pace-based buffer:
     - `packed` → +20% buffer (conservative, account for stops/delays)
     - `loose` → +10% buffer (moderate buffer)
     - `no_plan` → +0% buffer (flexible traveler)
   - Calculate "time to leave" = (travel time × buffer) + current time

2. **When user location updates:**
   - Check if "time to leave" has arrived for next pending activity
   - If yes → emit `activity_approaching` event (WebSocket) or send FCM push

3. **Notification content:**
   - **In-app (if Live Guide open):** Prominent card: "⏰ Time to head to [Activity] — it's 15 min away"
   - **Push (if app closed):** Title: "Time for [Activity]", Body: "You're 15 min away. Leave now to stay on schedule."

4. **Delivery strategy:**
   - If user connected via WebSocket → send WebSocket event + app shows in-app card
   - If user disconnected → send FCM push when they next reconnect
   - No duplicate notifications — only one per activity

### Data Types

```typescript
interface ActivityApproachingPayload {
  activityIndex: number;          // Index in today's itinerary
  activity: string;               // e.g. "Visit Colaba"
  timeToLeave: number;            // Unix timestamp when to leave
  distance: number;               // meters
  estimatedTravelTime: number;    // minutes
  mapQuery: string;               // For maps integration
  travelPaceAdjustment: string;   // "packed" | "loose" | "no_plan" for transparency
}

interface ScheduledActivity {
  activityIndex: number;
  activity: string;
  scheduledTime: number;          // When notification was scheduled
  distance: number;
  estimatedTravelTime: number;
}
```

### API Endpoints

**POST `/trips/{tripId}/schedule-activity-notifications`**
- **Triggered by:** `activate_guide` WebSocket event
- **Purpose:** Pre-calculate and schedule all activity notifications for today
- **Returns:** `{ scheduledActivities: ScheduledActivity[] }`
- **Error handling:** If distance calculation fails, use rough estimate (5km ≈ 15 min)

**GET `/trips/{tripId}/activity-schedule`**
- **Purpose:** Fetch scheduled notifications (for reconnect/sync)
- **Returns:** `{ scheduledActivities: ScheduledActivity[] }`

### WebSocket Events

**Client ← Server:**
- `activity_approaching` — sent when user should leave for next activity
  ```typescript
  {
    activityIndex: 0,
    activity: "Visit Colaba & Gateway of India",
    timeToLeave: 1714982400,
    distance: 2400,
    estimatedTravelTime: 12,
    mapQuery: "Colaba, Mumbai"
  }
  ```

---

## Feature 2: Personalized Location Suggestions

### How It Works

1. **On guide activation:**
   - Fetch and cache user's traveler profile: `{ travelPace, comfortLevel, physicalReadiness, spendingStyle, depthVsBreadth, crowdTolerance, travelMotivations, languageComfort, groundReality }`

2. **When user location updates (max 1 per hour):**
   - Query Google Places API for nearby places (2km radius)
   - Fetch today's itinerary (avoid suggesting already-planned activities)
   - Call AI with context:
     ```
     Generate a single location-based suggestion for a traveler with:
     - Travel pace: loose (prefers unhurried exploration)
     - Interests: culture & history (from motivations)
     - Budget style: comfortable (willing to spend moderately)
     - Activity level: moderate
     - Available time: 2 hours until next activity
     
     Nearby places: [list from Google Places API]
     Already planned today: [activities from itinerary]
     
     Suggest ONE place that matches their style, explain why.
     ```
   - AI ranks by match score (0-100) and returns top suggestion

3. **Notification content:**
   - **In-app card:** "🎯 [PlaceName] — [Suggestion text]. Matches your love of [interest]. [Distance] min away."
   - **Push (if disconnected):** Title: "Nearby: [PlaceName]", Body: "[Suggestion]. It's [distance] away."

4. **Rate limiting:** Max 1 suggestion per hour (avoid notification fatigue)

### Personalization Criteria

| Criterion | Logic |
|-----------|-------|
| **Travel Style Match** | If `depthVsBreadth === "deep"`, suggest focused experiences (museums, temples). If `cover`, suggest diverse quick experiences. |
| **Comfort Preference** | If `comfortLevel === "rough"`, suggest local markets/street food. If `hotel`, suggest upscale restaurants/spas. |
| **Activity Level** | If `physicalReadiness === "yes"`, suggest hiking/water sports. If `no`, suggest cafes/museums. |
| **Budget Fit** | If `spendingStyle === "budget"`, filter to free/cheap options. If `comfort`, suggest mid-range. |
| **Crowd Tolerance** | If `crowdTolerance === "avoid"`, deprioritize tourist hotspots. If `worth_it`, prioritize major attractions. |
| **Interests** | Match `travelMotivations` (adventure, culture, relaxation, food, nature) to place categories. |
| **Time Available** | If < 1 hour, suggest quick experiences (nearby café). If 3+ hours, suggest immersive activities. |
| **Already Planned** | Filter out places/types already in today's itinerary. |

### Data Types

```typescript
interface PersonalizedSuggestion {
  suggestion: string;             // AI-generated recommendation text
  placeName: string;              // e.g. "Leopold Cafe"
  mapQuery: string;
  reasoning?: string;             // Why this matched: "matches your love of relaxation"
  distance: number;               // meters
  estimatedTravelTime: number;    // minutes (walking)
  matchScore: number;             // 0-100 confidence
  category?: string;              // "restaurant", "monument", "park", etc.
}

interface TravelerProfileSnapshot {
  travelPace: string;
  comfortLevel: string;
  physicalReadiness: string;
  spendingStyle: string;
  depthVsBreadth: string;
  crowdTolerance: string;
  travelMotivations: string[];
  languageComfort: string;
  groundReality: string;
}
```

### API Endpoints

**GET `/trips/{tripId}/traveler-profile-snapshot`**
- **Purpose:** Fetch user's profile for caching during live guide session
- **Returns:** `{ profile: TravelerProfileSnapshot }`

### WebSocket Events

**Client ← Server:**
- `location_suggestion` — enhanced with personalization data
  ```typescript
  {
    suggestion: "Leopold Cafe is perfect for evening relaxation — great for people-watching with a drink. 600m away.",
    placeName: "Leopold Cafe",
    mapQuery: "Leopold Cafe, Mumbai",
    reasoning: "Matches your love of relaxation and cultural observation",
    distance: 600,
    estimatedTravelTime: 8,
    matchScore: 92
  }
  ```

---

## Implementation Details

### Session Management & Persistence

**Profile Caching:**
1. On `activate_guide` event: fetch user profile → cache in `LiveGuideSession`
2. TTL: Duration of live guide session
3. Avoids repeated profile fetches; improves performance

**Scheduled Activities Persistence:**
1. On guide activation: calculate all activities for today → store in `ActivitySchedule` table
   ```sql
   CREATE TABLE activity_schedules (
     id UUID PRIMARY KEY,
     sessionId UUID FOREIGN KEY,
     tripId UUID,
     userId UUID,
     dayIndex INT,
     activityIndex INT,
     scheduledTime TIMESTAMP,
     distance INT,
     estimatedTravelTime INT,
     notificationSent BOOLEAN DEFAULT FALSE,
     createdAt TIMESTAMP
   );
   ```
2. When notification is sent: set `notificationSent = TRUE` + store idempotency key
3. On reconnect: query `ActivitySchedule` for this trip → compare with sent times → only resend unsent
4. Cleanup: delete schedules older than 24 hours (old trips)

### Travel Time Calculation

**Primary method:** Use Google Maps Distance Matrix API (accounts for actual roads, traffic, transit)

**Fallback method** (if API unavailable):
```typescript
function calculateTravelTime(
  distanceMeters: number, 
  userPace: string, 
  transportMode?: 'car' | 'taxi' | 'public_transit' | 'walking'
): number {
  // Speed estimates (meters/second)
  const speeds = {
    'walking': 1.4,           // 5 km/h
    'public_transit': 8.3,    // 30 km/h (including waits)
    'taxi': 8.3,              // 30 km/h (typical Mumbai traffic)
    'car': 11.1               // 40 km/h (typical city driving)
  };
  
  const speed = speeds[transportMode || 'walking'];
  const baseTravelTime = (distanceMeters / speed) / 60; // minutes
  
  const bufferMultipliers = {
    'packed': 1.2,    // +20% buffer for preparation time
    'loose': 1.1,     // +10% buffer
    'no_plan': 1.0    // No buffer
  };
  
  return Math.ceil(baseTravelTime * (bufferMultipliers[userPace] || 1.0));
}
```

**Transport mode selection:**
- Use `trip.travelMode` if available (from trip creation)
- Default to `public_transit` for Indian cities
- Can be overridden by user preference in profile (future enhancement)

### AI Prompt for Location Suggestions

The prompt will emphasize:
- User's specific travel style + motivations
- Available time before next activity
- Distance and feasibility
- Avoiding already-planned activities
- Match confidence scoring
- Reasoning (transparency)

Example: *"For a traveler who loves culture & history, moderate budget, and has 2 hours before their next activity: suggest ONE nearby place that fits. Explain why it matches their style. Score your confidence 0-100."*

### Error Handling

| Error | Handling |
|-------|----------|
| Distance API fails | Use rough estimate (5km ≈ 15 min) or skip suggestion |
| AI API fails | Fallback to generic suggestion: "Check out [PlaceName] nearby" |
| No places found | Don't send suggestion (avoid empty state) |
| Profile fetch fails | Use empty profile (no personalization, but still suggest) |

### Rate Limiting & Deduplication

**Activity Notifications:**
- 1 per activity (no duplicates)
- Use idempotency key: `{tripId}:{dayIndex}:{activityIndex}:{scheduledTime}`
- Store sent notifications in `ActivitySchedule.notificationSent` flag
- On reconnect: only resend if `notificationSent = FALSE` AND scheduled time has passed

**Location Suggestions:**
- Max 1 per hour per session (or when user moves >500m from last suggestion point)
- Track in session: `lastSuggestionTime` + `lastSuggestionLocation`
- Only generate if: `now - lastSuggestionTime >= 3600000ms` OR `distance > 500m`
- Use deduplication: don't suggest same place twice in same session

**Profile Fetches:**
- Once per session (cached)
- TTL: Duration of guide session

**AI Cost Optimization:**
- For location suggestions: queue up to 3 suggestions, display 1 per hour
- Batch AI calls instead of calling for every location update
- Expected cost: ~$0.05-0.10 per active session (10+ suggestion batches × $0.005-0.010 per call)

---

## Testing Strategy

### Unit Tests
- `activity-scheduler.service.spec.ts`: Travel time calculation with different pace preferences
- AI prompt generation with various profile combinations

### Integration Tests
- Full flow: user connects → profile cached → activity scheduled → location suggestion generated
- Reconnection: verify schedule persists and doesn't duplicate
- Error scenarios: profile fetch fails, distance API fails

### Manual Testing
- Create test trips with different dates
- Activate live guide, verify notifications arrive
- Verify notification content matches user's travel pace
- Verify location suggestions are relevant to profile
- Verify rate limiting (only 1 suggestion per hour)

---

## Success Criteria

1. ✅ Users receive activity notifications at appropriate time (based on travel distance + pace)
2. ✅ Location suggestions are personalized to user's travel style (validated by manual testing)
3. ✅ No duplicate notifications
4. ✅ Fallback gracefully when APIs fail (rough estimates, generic suggestions)
5. ✅ Performance: profile caches reduce API calls by 90%+
6. ✅ Engagement: location suggestions are clicked/acted upon >20% of the time

---

## Timeline Estimate

- Activity scheduler: 2-3 days (travel time calculation, notification scheduling)
- Personalized suggestions: 2-3 days (profile integration, AI prompt refinement)
- Testing & refinement: 1-2 days
- **Total: ~5-8 days**

---

## Dependencies

- Google Maps Distance Matrix API (already used for itinerary enrichment)
- Google Places API (already used)
- Claude AI API (already used)
- User profile data (already stored in database)
- FCM + WebSocket infrastructure (already in place)

No new external dependencies required.

---

## Rollout Plan

1. Deploy activity scheduler + basic notifications (no personalization)
2. Monitor for issues (duplicate notifications, accuracy)
3. Deploy personalized suggestions after validation
4. Gather user feedback via analytics
5. Iterate on AI prompt based on suggestion click-through rates
