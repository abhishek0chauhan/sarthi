# Phase 2D Testing Checklist - Live Guide Module

**Test Date:** _______________  
**Tester Name:** _______________  
**Environment:** Dev / Staging / Production  
**Backend Version:** _______________  
**Frontend Version:** _______________  

---

## Section 1: Setup & Prerequisites

### Database & Configuration
- [ ] Database is seeded with at least 3 test trips with complete itinerary data
- [ ] Test trips have activities with valid time formats (e.g., "9:00 AM", "14:30")
- [ ] Test trips include meal plans (breakfast, lunch, dinner) with costs
- [ ] User profiles are seeded with different pace preferences (packed, loose, no_plan)
- [ ] Firebase authentication is configured and working
- [ ] FCM tokens are valid and push notifications are enabled
- [ ] WebSocket gateway is running and accessible
- [ ] Prisma migrations are up-to-date with LiveGuideSession and ActivitySchedule tables
- [ ] Redis cache is running (if used for session/suggestion caching)
- [ ] AI service (Claude API or mock) is accessible and responding

### Test User Accounts
- [ ] Create test user A with "packed" travel pace profile
- [ ] Create test user B with "loose" travel pace profile
- [ ] Create test user C with "no_plan" travel pace profile
- [ ] Each user has valid FCM token registered
- [ ] Test users have access to at least 2 active trips

### Application Health
- [ ] Backend API is running without errors (check logs)
- [ ] Frontend app can authenticate and load
- [ ] WebSocket connections can be established
- [ ] No rate limiting is interfering with test scenarios
- [ ] Network connectivity between frontend and backend is stable

---

## Section 2: Activity Notifications

### Activation & Session Creation
- [ ] Guide activation creates a new session when none exists
- [ ] Guide activation reuses existing active session if available
- [ ] Session stores correct currentDay based on trip dates
- [ ] Session initializes with empty activityStatus object
- [ ] Session stores user profile (travel pace, comfort level, etc.)
- [ ] Activate guide before 7 AM shows "pre-trip" status
- [ ] Activate guide during trip dates shows "during" status with activities
- [ ] Activate guide after trip dates shows "post-trip" status without activities
- [ ] Activation returns today's activity plan with times and names
- [ ] Activation generates and returns AI-powered morning briefing
- [ ] Activation handles missing profile gracefully (fallback briefing)

### Activity Scheduling
- [ ] Activities for the current day are parsed and scheduled correctly
- [ ] Past activities (by time-of-day) are skipped during scheduling
- [ ] Future activities are scheduled with correct notification times
- [ ] Travel time is calculated based on user's pace preference
  - [ ] Packed pace: faster notification (tighter travel time buffer)
  - [ ] Loose pace: slower notification (generous travel time buffer)
  - [ ] No_plan: no buffer applied
- [ ] Travel time varies by transport mode
  - [ ] Walking: longest travel time for same distance
  - [ ] Public transit: medium travel time
  - [ ] Car: shortest travel time
- [ ] Activities with invalid times (e.g., "25:00") are logged and skipped (no crash)
- [ ] Idempotency keys prevent duplicate scheduling for same activity
- [ ] Rescheduling an activity updates existing schedule (via upsert)
- [ ] Activity schedule persists to database with all required fields

### Activity Approaching Notifications
- [ ] Notification fires at calculated time (activity time - travel time)
- [ ] Notification includes activity name and distance
- [ ] Notification includes estimated travel time
- [ ] Notification is sent via FCM when user is not connected via WebSocket
- [ ] Notification is sent via WebSocket event when user is connected
- [ ] Multiple activities generate separate notifications at different times
- [ ] No duplicate notifications sent for the same activity
- [ ] Marked-as-sent flag prevents re-sending same notification
- [ ] User can see notification on phone (FCM) when app is backgrounded
- [ ] User receives WebSocket event in real-time when app is open

### Activity Status Tracking
- [ ] Marking activity as "done" updates session.activityStatus
- [ ] Activity status persists across app restarts
- [ ] Activity key format is correct (e.g., "0:1" for day 0, activity 1)
- [ ] Multiple activities can be marked done independently
- [ ] Skipping activity marks it as "skipped" (different from "pending")
- [ ] Skipped activities log a correction record with reason
- [ ] Status displays correctly in frontend UI
- [ ] Cannot mark activity done after marking skipped (state consistency)

### Activity Replanning
- [ ] Replan request recalculates remaining activities
- [ ] Only pending/not-done activities are included in replan
- [ ] Replan count increments per day
- [ ] Max 3 replans per day is enforced
- [ ] 4th replan request within same day is rejected with clear error
- [ ] Replan resets on next calendar day (count field updates)
- [ ] Replan includes user's travel profile in context
- [ ] AI-generated replan provides feasible activity sequence
- [ ] Replanned activities have valid times in future
- [ ] Replan reason (finished_early, skip, manual) is tracked for corrections

### Meal Nudges
- [ ] Breakfast nudge sends at expected time (with configurable schedule)
- [ ] Lunch nudge sends at expected time
- [ ] Dinner nudge sends at expected time
- [ ] Meal nudges include suggestion name and cost
- [ ] Meal nudges only send if meal data exists for current day
- [ ] Last meal timestamp is updated after sending nudge
- [ ] Meal nudges are sent via same dispatch (WebSocket or FCM)
- [ ] Multiple meal nudges can be sent on same day
- [ ] Meal suggestions match trip's foodGuideData

---

## Section 3: Personalized Location Suggestions

### Suggestion Generation
- [ ] First location update triggers suggestion generation
- [ ] Suggestion considers user's travel profile (pace, comfort, etc.)
- [ ] Suggestion excludes already-planned activities
- [ ] Suggestion includes place name, reasoning, and distance
- [ ] Suggestion includes estimated travel time
- [ ] Confidence score is returned (0-1 range)
- [ ] Suggestion is personalized and not generic
- [ ] Suggestion is relevant to destination (Cherrapunji-specific suggestions for Cherrapunji trip)

### Rate Limiting (1/hour)
- [ ] First suggestion is sent within 1 hour window
- [ ] Second request within same hour is blocked
- [ ] Error message is clear when rate limit hit
- [ ] Suggestion sent at T=0, next at T>1h succeeds
- [ ] Rate limit is per-session, not per-user (different trips have separate limits)
- [ ] Boundary test: suggestion at 59:59 blocks next at 60:01 (same hour)
- [ ] Boundary test: suggestion at 59:59 allows next at 60:01 (next hour)

### Fallback Behavior
- [ ] If personalized suggestion fails, non-personalized suggestion is attempted
- [ ] If both fail, user sees helpful error (not system error)
- [ ] Fallback suggestion is still location-relevant
- [ ] Rate limit still applies to fallback attempts
- [ ] Errors are logged but don't crash the app

### Integration with Activity Plan
- [ ] Suggestions complement (not duplicate) planned activities
- [ ] Suggestions account for remaining time until next activity
- [ ] If little time until next activity, suggestion is closer/faster
- [ ] Suggestions work correctly on day 1, day 2, etc.
- [ ] Suggestions update as user moves through itinerary

### Location Update Handling
- [ ] Location updates are received from frontend
- [ ] Lat/lng coordinates are stored with timestamp
- [ ] Rapid location updates don't trigger suggestion spam
- [ ] Location updates trigger activity notification check
- [ ] Location updates trigger suggestion check (if rate limit allows)

---

## Section 4: Integration Testing

### WebSocket Gateway Integration
- [ ] WebSocket connections establish successfully
- [ ] isConnected() correctly reports connection status
- [ ] Events are sent to connected users in real-time
- [ ] Disconnected users receive FCM fallback notifications
- [ ] User isolation: one user's events don't leak to another
- [ ] Events include complete data (no missing fields)
- [ ] Events are received in correct order
- [ ] Connection drop triggers graceful fallback

### FCM Integration
- [ ] FCM tokens are stored and updated correctly
- [ ] Notifications are received on Android devices
- [ ] Notifications are received on iOS devices
- [ ] Notification titles and bodies are clear
- [ ] Tapping notification opens correct screen
- [ ] Notifications work when app is backgrounded
- [ ] Duplicate FCM notifications are prevented
- [ ] Invalid tokens are handled gracefully

### AI Service Integration
- [ ] Briefing generation calls AI service with correct context
- [ ] Location suggestion calls AI service with profile data
- [ ] AI responses are parsed correctly (no JSON errors)
- [ ] Fallback occurs when AI service is slow (timeout handling)
- [ ] Fallback occurs when AI service errors
- [ ] Profile data is passed correctly to AI (not just generic context)

### Profile Service Integration
- [ ] User profile is fetched on guide activation
- [ ] Profile data (pace, comfort, etc.) is used in calculations
- [ ] Missing profile doesn't crash the guide
- [ ] Profile is cached in session database record
- [ ] Profile updates are reflected in next activation
- [ ] Invalid profile data is handled gracefully

### Database Integration
- [ ] All activity schedules are persisted to database
- [ ] All sessions are persisted to database
- [ ] Queries return correct results (no N+1 queries)
- [ ] Update operations are atomic
- [ ] Foreign key constraints are enforced
- [ ] Indexes are used for frequently queried fields

---

## Section 5: Data Integrity & Consistency

### Session Data Consistency
- [ ] currentDay reflects actual calendar day of trip
- [ ] activityStatus object is never null/undefined
- [ ] lastSuggestAt timestamp is accurate
- [ ] replanCount increments correctly
- [ ] Session data survives database restarts
- [ ] No orphaned sessions without userId/tripId

### Activity Schedule Consistency
- [ ] scheduleTime is in the future (not past)
- [ ] distance is positive number
- [ ] estimatedTravelTime matches pace+transport calculation
- [ ] idempotencyKey uniquely identifies activity
- [ ] No duplicate schedules for same activity
- [ ] notificationSent flag is accurate

### User Profile Consistency
- [ ] Travel pace is one of: packed, loose, no_plan
- [ ] Comfort level is valid value
- [ ] Physical readiness is valid value
- [ ] Spending style is valid value
- [ ] No conflicting preferences stored

### Correction Records
- [ ] Each skipped activity creates one correction record
- [ ] Correction includes reason (or empty string if not provided)
- [ ] Correction includes dayIndex and activityIndex
- [ ] Corrections are not duplicated
- [ ] Corrections reference valid userId and tripId

---

## Section 6: Performance & Load Testing

### Response Times
- [ ] Guide activation completes in <2 seconds
- [ ] Location update processing completes in <1 second
- [ ] Activity marking (done/skip) completes in <500ms
- [ ] Suggestion generation completes in <3 seconds
- [ ] Replan request completes in <5 seconds
- [ ] Frontend receives WebSocket events in <500ms

### Database Performance
- [ ] Activity schedule query (findMany) with indexes uses <100ms
- [ ] Session update uses prepared statements
- [ ] No N+1 queries on guide activation
- [ ] Batch operations are used where applicable

### Concurrent Users
- [ ] 10 simultaneous users can activate guide
- [ ] 20 location updates per second are handled
- [ ] Multiple sessions per user are isolated
- [ ] Rate limiting works correctly under load
- [ ] Database connections don't leak under load

### Memory & Resource Usage
- [ ] App memory stays stable over 1-hour test
- [ ] No memory leaks from event listeners
- [ ] WebSocket connections don't consume excessive memory
- [ ] Cache doesn't grow unbounded

---

## Section 7: Security & Data Privacy

### Authentication & Authorization
- [ ] Only authenticated users can activate guide
- [ ] Only authenticated users can mark activities
- [ ] Users cannot access other users' sessions
- [ ] Users cannot access other users' trips
- [ ] FirebaseAuthGuard properly validates tokens
- [ ] Expired tokens are rejected

### Input Validation
- [ ] Invalid tripId is rejected with 404
- [ ] Empty/null userId is rejected
- [ ] Invalid day index is handled gracefully
- [ ] Invalid lat/lng coordinates are validated
- [ ] Malformed time strings don't crash system
- [ ] Oversized request payloads are rejected

### Data Privacy
- [ ] User personal data is not logged
- [ ] Session data is not exposed in error messages
- [ ] Profile data is not sent to untrusted services
- [ ] FCM tokens are not logged
- [ ] Corrections include user actions but not sensitive data

### Rate Limiting (General)
- [ ] Suggestion rate limit is enforced (1/hour)
- [ ] Replan rate limit is enforced (3/day)
- [ ] No way to bypass rate limits
- [ ] Rate limit resets at correct times
- [ ] Rate limit errors give clear feedback

### Error Handling
- [ ] Stack traces are not sent to client
- [ ] Errors don't leak system information
- [ ] Graceful degradation when services fail
- [ ] Users see helpful error messages (not technical errors)

---

## Section 8: Edge Cases & Error Scenarios

### Edge Case: Early Trip Start
- [ ] Trip starting before 7 AM doesn't cause errors
- [ ] Pre-trip status shows correct message
- [ ] Activities for first day are correctly identified
- [ ] No notifications sent before trip start time

### Edge Case: Late Trip Activation
- [ ] Activating guide day 5 of 5-day trip works
- [ ] Correct activities shown for final day
- [ ] Notifications for past activities are skipped
- [ ] Last-day replanning works correctly

### Edge Case: Single Activity Day
- [ ] Day with 1 activity shows correct schedule
- [ ] Notification fires at correct time
- [ ] Replan works with only 1 remaining activity
- [ ] Status tracking works correctly

### Edge Case: Many Activities (10+)
- [ ] All activities are scheduled correctly
- [ ] Performance doesn't degrade
- [ ] Distance/travel time calculated for all
- [ ] Status tracking doesn't break with many activities

### Edge Case: No Internet Connection
- [ ] App gracefully handles connection loss
- [ ] Cached data is used when possible
- [ ] Clear offline message shown to user
- [ ] Data syncs when connection restored

### Edge Case: Rapid Activity Transitions
- [ ] Quick succession of "done" marks doesn't cause issues
- [ ] Final activity transitions correctly to next day
- [ ] Replan during rapid activity transitions works
- [ ] No race conditions in status updates

### Error: AI Service Timeout
- [ ] Briefing falls back to default text after 3 seconds
- [ ] Suggestion generation retries or falls back
- [ ] User can continue using app (not blocked)
- [ ] Error is logged for debugging

### Error: Database Connection Loss
- [ ] App handles database reconnection
- [ ] Pending updates are retried
- [ ] User sees helpful message (not system error)
- [ ] Service recovers without manual restart

### Error: Invalid Itinerary Data
- [ ] Missing activities array doesn't crash
- [ ] Missing time field in activity is handled
- [ ] Missing activity name is handled
- [ ] Partial data still provides some functionality

### Error: Profile Service Down
- [ ] Guide activates without profile data
- [ ] Suggestions fall back to non-personalized
- [ ] App continues to function
- [ ] Clear logs indicate profile service issue

---

## Section 9: Cross-Browser & Device Testing

### Desktop Browsers
- [ ] Chrome: All features working
- [ ] Firefox: All features working
- [ ] Safari: All features working
- [ ] Edge: All features working
- [ ] WebSocket events arrive in real-time
- [ ] Notifications display correctly

### Mobile Browsers
- [ ] Chrome Mobile: All features working
- [ ] Safari iOS: All features working
- [ ] WebSocket connections stable
- [ ] Notifications work when app is backgrounded

### Push Notifications
- [ ] Android native app receives FCM notifications
- [ ] iOS native app receives push notifications
- [ ] Web app receives Web Push notifications
- [ ] Notification tap opens correct screen
- [ ] Notification payload includes all required data

---

## Section 10: Regression Testing

### Re-test Previous Features
- [ ] Trip activation still works
- [ ] Activity marking still works
- [ ] Session persistence still works
- [ ] Morning briefing still works
- [ ] Meal nudges still work
- [ ] WebSocket events still work
- [ ] FCM fallback still works

---

## Section 11: Troubleshooting Guide

### Symptom: No notifications received
**Steps:**
1. [ ] Verify FCM token is valid: Check backend logs for token errors
2. [ ] Verify WebSocket is not connected: Check frontend console
3. [ ] Check if notification service is responding
4. [ ] Verify activity schedule exists in database
5. [ ] Check if notificationSent flag is already true

**Solution:** Usually FCM token issue or service connectivity.

### Symptom: Suggestions are generic, not personalized
**Steps:**
1. [ ] Verify user profile was fetched: Check logs for profile service calls
2. [ ] Verify profile data includes pace/comfort fields
3. [ ] Check if personalization AI is returning data
4. [ ] Verify destination-specific data is in trip

**Solution:** Usually profile missing or AI service issue.

### Symptom: Rate limit seems to not work
**Steps:**
1. [ ] Verify lastSuggestAt timestamp is being updated
2. [ ] Verify timestamp comparison logic (should be 1 hour = 3,600,000 ms)
3. [ ] Check if system clock is correct
4. [ ] Verify session is being reused (not creating new session per request)

**Solution:** Usually clock skew or new session being created.

### Symptom: Database queries are slow
**Steps:**
1. [ ] Run EXPLAIN ANALYZE on slow queries
2. [ ] Verify indexes exist on userId, tripId, sessionId
3. [ ] Check for N+1 query patterns in logs
4. [ ] Monitor database connection pool usage

**Solution:** Usually missing index or N+1 query issue.

### Symptom: WebSocket disconnections frequent
**Steps:**
1. [ ] Check network stability
2. [ ] Verify gateway heartbeat is enabled
3. [ ] Check if server is under load
4. [ ] Verify client reconnection logic

**Solution:** Usually network issue or server load.

---

## Section 12: Sign-Off

### QA Verification
- [ ] All tests passed: **[ ] Yes  [ ] No**
- [ ] No critical bugs found: **[ ] Yes  [ ] No**
- [ ] Performance acceptable: **[ ] Yes  [ ] No**
- [ ] Ready for staging deployment: **[ ] Yes  [ ] No**

### Known Issues (if any)
1. Issue: _________________________________________________________________
   Severity: [ ] Critical  [ ] High  [ ] Medium  [ ] Low
   Assigned to: ________________  Ticket: ________________

2. Issue: _________________________________________________________________
   Severity: [ ] Critical  [ ] High  [ ] Medium  [ ] Low
   Assigned to: ________________  Ticket: ________________

### Test Coverage Summary
- Total test cases: **_____ / 145+**
- Passed: **_____ ( _____% )**
- Failed: **_____ ( _____% )**
- Skipped: **_____ ( _____% )**

### Notes & Observations
_____________________________________________________________________________________
_____________________________________________________________________________________
_____________________________________________________________________________________
_____________________________________________________________________________________

### Tester Sign-Off
**Tester:** _____________________  **Date:** _______________  **Time:** _______________

**QA Lead:** _____________________  **Date:** _______________

**Release Manager:** _____________________  **Date:** _______________

---

## Appendix A: Test Data Setup

### Test Trip 1 - Cherrapunji (Standard 5-day trip)
```
Destination: Cherrapunji, Meghalaya
Duration: 2026-05-06 to 2026-05-10 (5 days)
Travel Mode: public_transit

Day 1 Activities:
- 9:00 AM: Root Bridge (explore local landmark)
- 1:00 PM: Rainbow Falls (scenic waterfall)
- 4:00 PM: Living Root Bridge Museum (learn history)

Day 2 Activities:
- 8:00 AM: Mawsmawi Cave (cave exploration)
- 2:00 PM: Seven Sisters Falls (hiking)

Meal Plan:
- Breakfast: Jadoh (₹80)
- Lunch: Dohneiong (₹150)
- Dinner: Khaar (₹120)
```

### Test Profiles
**Profile A (Packed Pace):**
- travelPace: "packed"
- comfortLevel: "budget"
- physicalReadiness: "active"
- spendingStyle: "budget"

**Profile B (Loose Pace):**
- travelPace: "loose"
- comfortLevel: "moderate"
- physicalReadiness: "moderate"
- spendingStyle: "moderate"

**Profile C (No Plan):**
- travelPace: "no_plan"
- comfortLevel: "premium"
- physicalReadiness: "relaxed"
- spendingStyle: "premium"

---

## Appendix B: Debug Commands

### Check Last Activity Schedules
```sql
SELECT id, activity, scheduledTime, notificationSent 
FROM "ActivitySchedule" 
WHERE sessionId = '<session-id>' 
ORDER BY scheduledTime;
```

### Check Last Session
```sql
SELECT id, userId, tripId, currentDay, activityStatus, lastSuggestAt 
FROM "LiveGuideSession" 
WHERE tripId = '<trip-id>' 
ORDER BY createdAt DESC LIMIT 1;
```

### Check Recent Corrections
```sql
SELECT * FROM "Correction" 
WHERE userId = '<user-id>' AND type = 'live_skip_activity'
ORDER BY createdAt DESC LIMIT 10;
```

### Check FCM Token
```sql
SELECT id, fcmToken, updatedAt FROM "User" WHERE firebaseUid = '<firebase-uid>';
```

---

**Test Checklist Version:** 1.0  
**Last Updated:** May 6, 2026  
**Maintained By:** QA Team
