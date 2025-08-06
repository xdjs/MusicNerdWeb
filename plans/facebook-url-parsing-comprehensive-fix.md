# Facebook URL Parsing - Comprehensive Fix Plan

## Problem Statement

Facebook has three different URL formats that need to be properly handled by the artist link parsing system:

1. **Username Format** (legacy, still works): `https://www.facebook.com/USERNAME`
2. **People Format** (current structure): `https://www.facebook.com/people/Angela-Bofill/100044180243805/`
3. **Profile ID Format** (direct ID access): `https://www.facebook.com/profile.php?id=100044180243805`

Currently, the system mis-parses these URLs, leading to incorrect data storage and broken link generation.

## Current System Analysis

### Database Schema
- **`facebook`** column: Stores usernames
- **`facebookID`** column: Stores internal Facebook IDs

### Current URL Map Platforms
1. **facebook** platform: Handles username-based URLs
2. **facebookID** platform: Handles internal ID URLs

### Key Issues
- Profile ID format (`profile.php?id=`) is not properly parsed
- URL construction for internal IDs uses placeholder format instead of working links
- Regex patterns don't comprehensively handle all three formats

## Comprehensive Fix Plan

### Phase 1: Analysis & Testing 🔍

#### Task 1.1: Current State Analysis
**Objective**: Document exactly how each URL format is currently handled

**Actions**:
- Test current regex patterns against all three URL formats
- Document which formats work/fail and why
- Analyze current database storage patterns
- Review existing Facebook data in the artists table

**Expected Output**: Detailed analysis report of current parsing behavior

#### Task 1.2: URL Format Validation
**Objective**: Confirm all three URL formats are valid and lead to the same profiles

**Actions**:
- Verify that the three formats access the same Facebook profiles
- Test URL accessibility and redirection behavior
- Document Facebook's URL structure requirements

**Expected Output**: Validation that all three formats should be supported

### Phase 2: Database Schema Updates 📊

#### Task 2.1: Update Facebook Platform Regex
**File**: Database migration
**Objective**: Create unified regex pattern for all three formats

**Current Regex**: 
```
^https://[^/]*facebook.[^/]+/(?:people/[^/]+/([0-9]+)/?|([^/]+))$
```

**New Proposed Regex**:
```
^https://[^/]*facebook\.[^/]+/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)|([^/]+))(?:[?#].*)?$
```

**Capture Groups**:
- Group 1: Internal ID from `/people/name/ID` format
- Group 2: ID from `profile.php?id=ID` format
- Group 3: Username from `/username` format

#### Task 2.2: Update Platform Examples
**Objective**: Update database examples to reflect all supported formats

**New Example**: 
```
https://www.facebook.com/username OR https://www.facebook.com/people/name/ID OR https://www.facebook.com/profile.php?id=ID
```

#### Task 2.3: Optimize FacebookID Platform
**Objective**: Decide if separate facebookID platform is still needed

**Options**:
1. Keep both platforms for backward compatibility
2. Consolidate into single facebook platform
3. Update facebookID regex to also handle profile.php format

**Recommendation**: Keep both platforms, update facebookID regex

### Phase 3: Backend Logic Updates ⚙️

#### Task 3.1: Enhanced extractArtistId Function
**File**: `src/server/utils/services.ts`
**Objective**: Update Facebook URL parsing logic

**Current Logic Issues**:
- `profile.php?id=` format gets captured as username
- No distinction between ID formats

**New Logic**:
```typescript
if (siteName === 'facebook') {
  const peopleId = match[1];    // From people/name/ID format
  const profileId = match[2];   // From profile.php?id=ID format  
  const username = match[3];    // From /username format
  
  // Handle ID formats (both people and profile.php)
  if (peopleId || profileId) {
    return {
      siteName: 'facebookID',
      cardPlatformName,
      id: peopleId || profileId
    };
  }
  
  // Handle username format
  if (username && !username.includes('profile.php')) {
    return {
      siteName: 'facebook', 
      cardPlatformName,
      id: username
    };
  }
}
```

#### Task 3.2: Fix URL Construction in getArtistLinks
**File**: `src/server/utils/queries/artistQueries.ts`
**Objective**: Generate working Facebook URLs for display

**Current Issue**: 
```typescript
// Generates: https://www.facebook.com/people/name/ID/
artistUrl = `https://www.facebook.com/people/name/${facebookId}/`;
```

**Fix**:
```typescript
// Generate: https://www.facebook.com/profile.php?id=ID
artistUrl = `https://www.facebook.com/profile.php?id=${facebookId}`;
```

**Rationale**: The `profile.php?id=` format is more reliable than the placeholder people format.

#### Task 3.3: Input Validation & Sanitization
**Objective**: Add robust validation for Facebook URLs

**Actions**:
- Validate extracted IDs are numeric for ID formats
- Validate usernames follow Facebook username rules
- Add URL sanitization to handle edge cases

### Phase 4: Comprehensive Testing 🧪

#### Task 4.1: Unit Tests for extractArtistId
**File**: `src/server/utils/__tests__/extractArtistId.test.ts`
**Objective**: Test all Facebook URL parsing scenarios

**Test Cases**:
```typescript
describe('Facebook URL parsing', () => {
  test('username format', async () => {
    const result = await extractArtistId('https://www.facebook.com/tylerthecreator');
    expect(result).toEqual({
      siteName: 'facebook',
      cardPlatformName: 'Facebook',
      id: 'tylerthecreator'
    });
  });

  test('people format', async () => {
    const result = await extractArtistId('https://www.facebook.com/people/Angela-Bofill/100044180243805/');
    expect(result).toEqual({
      siteName: 'facebookID', 
      cardPlatformName: 'Facebook',
      id: '100044180243805'
    });
  });

  test('profile.php format', async () => {
    const result = await extractArtistId('https://www.facebook.com/profile.php?id=100044180243805');
    expect(result).toEqual({
      siteName: 'facebookID',
      cardPlatformName: 'Facebook', 
      id: '100044180243805'
    });
  });

  test('profile.php with additional params', async () => {
    const result = await extractArtistId('https://www.facebook.com/profile.php?id=100044180243805&ref=page');
    expect(result).toEqual({
      siteName: 'facebookID',
      cardPlatformName: 'Facebook',
      id: '100044180243805'
    });
  });
});
```

#### Task 4.2: Integration Tests for getArtistLinks
**Objective**: Test URL construction for both facebook and facebookID platforms

**Test Cases**:
- Verify username generates `facebook.com/username`
- Verify facebookID generates `facebook.com/profile.php?id=ID`
- Test edge cases and malformed data

#### Task 4.3: End-to-End Flow Testing
**Objective**: Test complete user journey

**Scenarios**:
1. User submits username URL → stored in facebook column → displays as username link
2. User submits people URL → stored in facebookID column → displays as profile.php link  
3. User submits profile.php URL → stored in facebookID column → displays as profile.php link

### Phase 5: Data Migration & Cleanup 🔄

#### Task 5.1: Audit Existing Data
**Objective**: Review current Facebook data for inconsistencies

**Actions**:
- Query artists with both facebook and facebookID values
- Identify any malformed or inconsistent data
- Document data patterns and edge cases

#### Task 5.2: Data Migration (if needed)
**Objective**: Fix any existing data issues

**Potential Issues**:
- IDs stored in facebook column instead of facebookID
- Usernames stored in facebookID column
- Invalid URL formats in stored data

#### Task 5.3: URL Format Standardization
**Objective**: Ensure consistent URL generation

**Actions**:
- Update any existing `/people/name/ID` URLs to use `profile.php?id=` format
- Validate all stored Facebook data generates working links

### Phase 6: Deployment & Monitoring 🚀

#### Task 6.1: Database Migration Deployment
**Objective**: Apply regex updates to production

**Migration SQL**:
```sql
-- Update facebook platform regex
UPDATE urlmap 
SET regex = '^https://[^/]*facebook\.[^/]+/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)|([^/]+))(?:[?#].*)?$',
    example = 'https://www.facebook.com/username OR https://www.facebook.com/people/name/ID OR https://www.facebook.com/profile.php?id=ID'
WHERE site_name = 'facebook';

-- Optionally update facebookID platform
UPDATE urlmap 
SET regex = '^https://[^/]*facebook\.[^/]+/(?:people/[^/]+/([0-9]+)|profile\.php\?id=([0-9]+))(?:[?#].*)?$'
WHERE site_name = 'facebookID';
```

#### Task 6.2: Monitoring & Validation
**Objective**: Ensure fix works in production

**Actions**:
- Monitor Facebook URL submissions for parsing errors
- Track success rates of different URL formats
- Validate generated links work correctly

#### Task 6.3: Documentation Update
**Objective**: Document the Facebook URL support

**Actions**:
- Update API documentation with supported formats
- Add examples to user-facing documentation
- Document troubleshooting steps for Facebook links

## Implementation Timeline

### Week 1: Analysis & Design
- Tasks 1.1, 1.2 (Analysis)
- Tasks 2.1, 2.2, 2.3 (Database design)

### Week 2: Development  
- Tasks 3.1, 3.2, 3.3 (Backend logic)
- Tasks 4.1, 4.2 (Unit tests)

### Week 3: Testing & Migration
- Task 4.3 (Integration testing)
- Tasks 5.1, 5.2, 5.3 (Data migration)

### Week 4: Deployment
- Tasks 6.1, 6.2, 6.3 (Deployment & monitoring)

## Success Criteria

✅ All three Facebook URL formats parse correctly  
✅ Generated Facebook links work and direct to correct profiles  
✅ Backward compatibility maintained for existing data  
✅ Comprehensive test coverage (>95%)  
✅ No regression in other platform URL parsing  
✅ Production deployment successful with monitoring  

## Risk Assessment

**Low Risk**: 
- Changes are additive and maintain backward compatibility
- Comprehensive testing covers edge cases
- Database changes can be rolled back

**Medium Risk**:
- Need to validate Facebook URL behavior doesn't change
- Large amount of existing Facebook data to validate

**Mitigation**:
- Thorough testing in staging environment
- Gradual rollout with monitoring
- Rollback plan for database changes

## Technical Specifications

### New Regex Pattern Breakdown
```javascript
^https://[^/]*facebook\.[^/]+/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)|([^/]+))(?:[?#].*)?$

// Components:
// ^https://[^/]*facebook\.[^/]+/  - Match facebook domain with optional subdomain/www
// (?:                            - Non-capturing group for URL path options
//   people/[^/]+/([0-9]+)/?      - Group 1: people/name/ID format
//   |profile\.php\?id=([0-9]+)   - Group 2: profile.php?id=ID format  
//   |([^/]+)                     - Group 3: username format
// )
// (?:[?#].*)?$                   - Optional query params or fragment
```

### Expected Parsing Results
| URL Format | Matched Group | siteName | id |
|------------|---------------|----------|-----|
| `facebook.com/username` | Group 3 | `facebook` | `username` |
| `facebook.com/people/Name/123` | Group 1 | `facebookID` | `123` |
| `facebook.com/profile.php?id=123` | Group 2 | `facebookID` | `123` |

This comprehensive plan ensures robust handling of all Facebook URL formats while maintaining backward compatibility and providing thorough testing coverage.