# Live Guide Features - Phase 2D

## Overview

Live Guide is the real-time trip guidance system for Sarthi. Phase 2D adds two critical features:
1. **Activity Time Notifications** - Smart alerts for upcoming activities
2. **Personalized Location Suggestions** - Context-aware place recommendations

## Feature 1: Activity Time Notifications

### How It Works

When a user activates Live Guide, Sarthi:
1. Fetches the user's travel pace preference from their profile
2. Calculates distances to each activity using Google Maps
3. Estimates travel time based on distance + user pace
4. Schedules notifications before each activity

### Travel Pace Adjustments

- **Packed Schedule**: +20% buffer (account for preparation time)
- **Loose Plan**: +10% buffer (moderate buffer)
- **No Plan**: No buffer (flexible traveler)

Example: For a 15-minute journey:
- Packed: notify at 18 minutes before (15 × 1.2)
- Loose: notify at 16-17 minutes before (15 × 1.1)
- No Plan: notify at 15 minutes before

### Notification Delivery

**If user is connected (WebSocket active):**
- Emit `activity_approaching` event to app
- Display in-app notification card
- Title: "Time for [Activity]"
- Content: Distance, estimated travel time, map link

**If user is offline:**
- Send FCM push notification
- No duplicate on reconnect (using idempotency keys)

### Data Persistence

Activities are scheduled in the `ActivitySchedule` table:
- `idempotencyKey`: Prevents duplicate notifications
- `notificationSent`: Tracks delivery status
- `scheduledTime`: When to notify user
- `distance`: Estimated distance in meters
- `estimatedTravelTime`: Travel time in minutes

### API Endpoints

**GET /trips/{tripId}/activity-schedule**
- Fetch unsent activity notifications for reconnection
- Returns: `{ scheduledActivities: [ { activityIndex, activity, scheduledTime, distance, estimatedTravelTime } ] }`
- Authentication: Required (Firebase)

**WebSocket Events**

Server → Client:
- `activity_approaching` - User should leave now
  ```json
  {
    "activityIndex": 0,
    "activity": "Visit Colaba",
    "distance": 2400,
    "estimatedTravelTime": 12,
    "mapQuery": "Colaba, Mumbai"
  }
  ```

### Error Handling

| Error | Handling |
|-------|----------|
| Distance API fails | Use rough estimate (5km ≈ 15 min) |
| Invalid activity time | Skip activity, log warning |
| Profile not found | Use default pace (no_plan) |
| Database error on scheduling | Log warning, continue with other activities |

---

## Feature 2: Personalized Location Suggestions

### How It Works

When user updates location, Sarthi:
1. Checks time since last suggestion (max 1 per hour)
2. Fetches user's traveler profile (cached in session)
3. Gets nearby places from Google Places API
4. Calls Claude AI with user context
5. AI returns top suggestion with confidence score

### Personalization Criteria

Suggestions adapt to:
- **Travel Style**: Deep explorer (museums) vs. Cover-as-much-as-possible (diverse quick experiences)
- **Budget**: Free options vs. comfort options
- **Activity Level**: Physical activities vs. relaxation
- **Comfort Preference**: Local markets vs. upscale restaurants
- **Crowd Tolerance**: Hidden gems vs. tourist hotspots
- **Interests**: Culture, adventure, food, nature, relaxation

### Suggestion Quality

AI scores each suggestion 0-100:
- 80-100: Great match (primary recommendation)
- 60-79: Good match (alternative)
- <60: Poor match (not suggested)

Includes reasoning: "Matches your love of culture & history"

### Rate Limiting

Maximum 1 suggestion per hour per session:
- Prevents notification fatigue
- Resets on new user movement >500m
- Tracks `lastSuggestAt` in session

### Notification Delivery

**If connected:**
- Emit `location_suggestion` event
- Display suggestion card with reasoning
- Include distance, travel time, match score

**If offline:**
- Send FCM push when user reconnects
- Can be swiped away (low priority vs. activity notifications)

### Error Handling

| Error | Handling |
|-------|----------|
| AI API fails | Fallback to generic suggestion |
| No nearby places | Don't send suggestion (empty state avoided) |
| Profile not available | Suggest without personalization |
| Distance calc fails | Use walking speed estimate |

---

## Configuration & Tuning

### Travel Time Calculation

Default speeds (used if Google Maps unavailable):
- Walking: 1.4 m/s (5 km/h)
- Public Transit: 8.3 m/s (30 km/h)
- Taxi: 8.3 m/s (30 km/h)
- Car: 11.1 m/s (40 km/h)

### Notification Timing

Buffer multipliers:
```typescript
{
  'packed': 1.2,    // +20% of travel time
  'loose': 1.1,     // +10% of travel time
  'no_plan': 1.0    // No buffer
}
```

### Rate Limits

- Suggestions: 1 per hour per session
- Replans: 3 per day (handled by existing system)
- Activity moves: Suggestions trigger at >500m movement

---

## Architecture

### Services

- **ActivitySchedulerService**: Travel time calculation, scheduling logic
- **AiService**: Enhanced with personalized location suggestion generation
- **LiveGuideService**: Orchestrates both features, caches user profile
- **NotificationService**: Sends FCM + WebSocket events
- **LiveGuideGateway**: WebSocket relay for events

### Data Flow

```
Guide Activation
  ↓
Fetch user profile → Cache in session
  ↓
Calculate activities + schedule notifications
  ↓
Monitor location updates
  ↓
When time reached: Send activity_approaching event
  ↓
When location changes: Check for personalized suggestions (1/hour)
  ↓
Generate & send location_suggestion event
```

### Idempotency & Deduplication

- Activity notifications use idempotency keys: `{tripId}:{dayIndex}:{activityIndex}`
- Prevents duplicate scheduling on retry
- `notificationSent` flag tracks delivery status
- On reconnect, only resend if `notificationSent = false`

---

## Testing

See `docs/PHASE_2D_TESTING_CHECKLIST.md` for comprehensive manual testing guide.

### Quick Smoke Test

1. Create trip with 3+ activities
2. Create user profile (culture interests, loose pace)
3. Activate Live Guide
4. Check ActivitySchedule table has entries
5. Simulate location update
6. Verify activity_approaching event (or FCM push if offline)
7. Wait 1 hour, simulate another location update
8. Verify location_suggestion event
9. Verify suggestion matches culture interests

---

## Monitoring & Troubleshooting

### Key Metrics to Monitor

- Activity notification delivery rate (should be >99%)
- Suggestion generation latency (should be <3s)
- Database query performance (indexes on sessionId, scheduledTime)
- AI API failure rate (should have fallback)
- FCM delivery rate (should be >90%)

### Common Issues

**Notifications not sending:**
- Check ActivitySchedule table has records
- Verify `scheduledTime` is <= current time
- Verify `notificationSent = false`
- Check user is connected (WebSocket) or FCM configured

**Suggestions not personalized:**
- Verify user profile is set (check LiveGuideSession.userProfile)
- Check `lastSuggestAt` timestamp (should be 1+ hour ago)
- Verify nearby places returned from Google Places API
- Check Claude AI API key is valid

---

## Database Schema

### ActivitySchedule Table

```sql
CREATE TABLE activity_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessionId UUID NOT NULL REFERENCES live_guide_sessions(id) ON DELETE CASCADE,
  tripId UUID NOT NULL REFERENCES saved_trips(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dayIndex INT NOT NULL,
  activityIndex INT NOT NULL,
  activity VARCHAR NOT NULL,
  scheduledTime TIMESTAMP NOT NULL,
  distance INT NOT NULL,           -- meters
  estimatedTravelTime INT NOT NULL, -- minutes
  notificationSent BOOLEAN DEFAULT FALSE,
  idempotencyKey VARCHAR UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_session_day (sessionId, dayIndex),
  INDEX idx_pending (notificationSent, scheduledTime)
);
```

### LiveGuideSession Additions

```sql
ALTER TABLE live_guide_sessions ADD COLUMN userProfile JSON;
ALTER TABLE live_guide_sessions ADD COLUMN lastSuggestAt TIMESTAMP;
```

---

## Future Enhancements

Phase 2E (Future):
- Real-time traffic integration (Google Maps real-time API)
- Weather-based suggestions ("Sunset viewing perfect today")
- Collaborative suggestions ("Friends nearby")
- Suggestion dismissal feedback for better ranking
- Multi-user trip suggestions (group activities)

---

## Support & Questions

For issues or questions about Phase 2D features:
- Check `docs/PHASE_2D_TESTING_CHECKLIST.md` for troubleshooting
- Review logs for ERROR or WARN entries
- Check database consistency (ActivitySchedule, LiveGuideSession)
- Verify API keys and external service connectivity
