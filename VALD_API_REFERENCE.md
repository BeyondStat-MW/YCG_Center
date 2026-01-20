# VALD API & Data Schema Reference

## Overview
This document captures the **actual** VALD API behavior and data schema discovered through testing and debugging. Use this as the authoritative reference for any VALD-related development.

---

## 1. Date Fields

| Device | API Date Field (Primary) | Fallback Fields |
|--------|--------------------------|-----------------|
| ForceDecks | `recordedDateUtc` | `modifiedDateUtc`, `analysedDateUtc` |
| NordBord | `testDateUtc` | `utcRecorded` |
| ForceFrame | `testDateUtc` | `utcRecorded` |
| SmartSpeed | `startTimeUTC` | `testDateUtc` |
| DynaMo | `testDateUtc` | `recordedDateUtc` |

**Code Pattern:**
```python
test_date = (
    t.get('testDateUtc') or 
    t.get('recordedDateUtc') or 
    t.get('modifiedDateUtc') or 
    t.get('utcRecorded') or 
    t.get('startTimeUTC') or 
    datetime.utcnow().isoformat()
)
```

---

## 2. Player/Profile Identification

| Context | Field Name |
|---------|------------|
| VALD API Response | `profileId` |
| Supabase `measurements` table | `player_id` (NOT `profile_id`) |
| Supabase `profiles` table | `id`, `vald_id` (for linking) |

---

## 3. Key Metrics by Device

### ForceDecks (CMJ)
| Metric | Primary Key | Fallback Keys |
|--------|-------------|---------------|
| Jump Height (Imp-Mom) | `Jump Height (Imp-Mom)` | `JumpHeight(Imp-Mom)` |
| Jump Height (Flight Time) | `Jump Height (Flight Time)` | `JumpHeight(FlightTime)`, `jumpHeight_cm_` |
| Peak Power | `Concentric Peak Power` | `peakPower_W_` |
| RSI | `RSI (Jump Height/Contact Time)` | `RSI(JumpHeight/ContactTime)` |

⚠️ **WARNING**: Some historical data had `jumpHeight_cm_` incorrectly populated with RSI values. Always validate: Jump Height should be < 100cm for humans.

### NordBord
| Metric | Key |
|--------|-----|
| Left Max Force | `leftMaxForce` |
| Right Max Force | `rightMaxForce` |
| Asymmetry | `percentAsymmetry` or calculated |

### ForceFrame
| Metric | Key |
|--------|-----|
| Left Max Force | `leftMaxForce` |
| Right Max Force | `rightMaxForce` |
| Test Type | `testTypeName` (e.g., "Hip Adduction") |

⚠️ **TYPO ALERT**: Never use `rightRightMaxForce` - it's always `rightMaxForce`.

### SmartSpeed
| Metric | Key |
|--------|-----|
| Best Split Time | `runningSummaryFields.bestSplitSeconds` |
| Total Time | `time` |
| Test Type | `testTypeName` |

### DynaMo
| Metric | Key |
|--------|-----|
| Peak Force | `peakForce` or `maxForce` |
| Movement Type | `movement` (e.g., "Knee Extension") |
| Position | `position` (e.g., "Seated") |

---

## 4. API Pagination

**Critical Discovery**: VALD API enforces a maximum return limit regardless of `Take` parameter.

| Behavior | Value |
|----------|-------|
| Observed Max Items Per Request | ~50 |
| Correct Pagination Logic | `skip += len(actual_results)` |
| Termination Condition | `len(results) == 0` (NOT `len < take`) |

**Code Pattern:**
```python
while True:
    data = fetch(skip=skip, take=1000000)  # Request a lot
    if not data or len(data) == 0:
        break  # Only stop when truly empty
    
    process(data)
    skip += len(data)  # Increment by ACTUAL count, not requested
```

---

## 5. Test Type Categorization

| Column | Purpose |
|--------|---------|
| `test_type` (DB) | Device name: "ForceDecks", "NordBord", etc. |
| `metrics.testType` or `metrics.testTypeName` | Specific test: "CMJ", "Nordic", "Hip Adduction" |
| `metrics.movement` (DynaMo only) | Movement pattern |

---

## 6. Data Quality Issues Encountered

1. **RSI in Jump Height field**: Some `jumpHeight_cm_` values were actually RSI (e.g., 209.35). 
   - Cause: Likely import/sync script bug
   - Solution: Validate `jumpHeight_cm_` < 100 or prefer `Jump Height (Imp-Mom)` key

2. **Missing Date Fields**: ForceDecks uses `recordedDateUtc`, not `testDateUtc`.
   - Cause: API inconsistency across devices
   - Solution: Use fallback chain (see Section 1)

3. **Duplicate Records**: Multiple syncs without proper deduplication.
   - Solution: Track by `testId` or `recordingId` in metrics JSON

---

## 7. Recommended Sync Script Logic

```python
def sync_device(name, base_url, endpoint):
    skip = 0
    take = 1000000  # Request max, server will limit
    
    while True:
        data = fetch(skip=skip, take=take)
        if not data:
            break
            
        for record in data:
            # Extract date with proper fallbacks
            date = get_date_with_fallbacks(record)
            
            # Skip if already exists (by test ID)
            if exists_in_db(record.testId):
                continue
                
            # Insert with correct field names
            insert({
                'player_id': map_vald_to_db(record.profileId),
                'test_type': name,  # Device name
                'recorded_at': date,
                'metrics': record
            })
        
        skip += len(data)  # CRITICAL: Use actual count
```

---

## Version History

| Date | Changes |
|------|---------|
| 2026-01-18 | Initial creation based on debugging sessions |

