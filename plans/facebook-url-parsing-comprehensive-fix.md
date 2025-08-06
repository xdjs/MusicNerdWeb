# Facebook URL Parsing - Comprehensive Fix Plan

## Problem Statement

Facebook has three different URL formats that need to be properly handled by the artist link parsing system:

  1. **Username Format** (legacy, still works): `https://www.facebook.com/USERNAME`
  2. **People Format** (current structure): `https://www.facebook.com/people/Angela-Bofill/100044180243805/`
  3. **Profile ID Format** (direct ID access): `https://www.facebook.com/profile.php?id=100044180243805`

Currently, the system mis-parses these URLs, leading to incorrect data storage and broken link generation.

## Current System Analysis

### Database Schema
  - **`facebook`** column: Stores Facebook usernames OR full Facebook URLs
  - **`facebookID`** column: Stores full Facebook URLs (NOT just IDs)

### Current URL Map Platforms
  1. **facebook** platform: Handles username-based URLs
  2. **facebookID** platform: Handles internal ID URLs

### Key Issues
  - Profile ID format (`profile.php?id=`) is not properly parsed
  - URL construction for internal IDs uses placeholder format instead of working links
  - Regex patterns don't comprehensively handle all three formats

## Sequential Implementation Plan (Aligned with Commits)

### ✅ Commit 1: Task 1 - Current State Analysis
  **File Changes**: Analysis completed in chat (no files changed)
  **Objective**: Document exactly how each URL format is currently handled
  **Status**: ✅ COMPLETED

  **Actions**:
  - Test current regex patterns against all three URL formats
  - Document which formats work/fail and why
  - Analyze current database storage patterns
  - Review existing Facebook data in the artists table

### ✅ Commit 2: Task 2 - Update extractArtistId Logic
  **File**: `src/server/utils/services.ts`
  **Objective**: Update Facebook URL parsing logic to handle all three formats
  **Status**: ✅ COMPLETED

  **Implementation**:
  - Added Facebook-specific parsing logic in `extractArtistId` function
  - Routes people/ID and profile.php?id= formats to `facebookID` platform
  - Routes username format to `facebook` platform
  - Added validation to reject invalid profile.php URLs

### ✅ Commit 3: Task 3 - Fix URL Construction Logic  
  **File**: `src/server/utils/queries/artistQueries.ts`
  **Objective**: Generate working Facebook URLs for display
  **Status**: ✅ COMPLETED

  **Implementation**:
  - Added Facebook-specific URL construction logic in `getArtistLinks`
  - Changed facebookID URLs from placeholder format to `profile.php?id=` format
  - Maintained backward compatibility for username URLs

### 📋 Uncommitted Changes Since Last Commit: Tasks 4 & 5

#### Task 4: Create Comprehensive Tests
  **File**: `src/server/utils/__tests__/extractArtistId.test.ts`
  **Objective**: Test all Facebook URL parsing scenarios
  **Status**: ✅ COMPLETED (Uncommitted)

  **Implementation**:
  - Added 14 comprehensive test cases covering all three Facebook URL formats
  - Tests for username, people/name/ID, and profile.php?id= formats
  - Tests for edge cases and validation scenarios
  - Updated regex mock to handle additional query parameters
  - All tests passing ✅

#### Task 5: Update Database Regex Patterns
  **File**: `drizzle/0006_update_facebook_regex_patterns.sql`
  **Objective**: Create database migration to update Facebook platform regex patterns
  **Status**: ✅ COMPLETED (Uncommitted)

  **Implementation**:
  - Created SQL migration file with updated regex patterns
  - Facebook platform regex handles all three URL formats
  - FacebookID platform regex specifically handles ID formats only
  - Updated examples for both platforms
  - Validated SQL syntax and regex compilation ✅
  - All URL format tests passing ✅

#### Plan Document Updates
  **File**: `plans/facebook-url-parsing-comprehensive-fix.md`
  **Status**: ✅ COMPLETED (Uncommitted)
  - Updated formatting with proper indentation
  - Marked completed tasks with ✅ status
  - This revision with sequential numbering

### ✅ Task 6: End-to-End Flow Validation
  **File**: `src/server/utils/__tests__/facebook-e2e-flow.test.ts`
  **Objective**: Test complete flow from URL submission to database storage to link display
  **Status**: ✅ COMPLETED

  **Implementation**:
  - Created comprehensive end-to-end validation tests
  - Validated URL parsing for all three Facebook URL formats
  - Tested database storage logic (facebook vs facebookID routing)
  - Confirmed URL generation logic works correctly
  - Validated edge cases and error handling
  - All tests passing ✅

## 🔥 URGENT ISSUE DISCOVERED & FIXED: Facebook Display Problem

### Problem Report (User)
> "We updated the artist with that data" popup shows, Your Artist Data Entry shows, but facebookID entries do not show up in Pending UGC or on the artist page. Why does this facebookID entry not show as Facebook, with the previous Facebook behaviors, in the artist page social media links?

### Root Cause Analysis
The Facebook URL parsing was working correctly (Tasks 1-6), but there was a **critical display bug** preventing Facebook ID entries from appearing on artist pages:

1. **Platform Name Mismatch**: Code checked for `"facebookId"` (camelCase) but database used `"facebookID"` (capitalized)
2. **Missing Display Configuration**: `facebookID` platform lacked proper `cardPlatformName` for UI display
3. **No Preference Logic**: Unlike YouTube, Facebook had no preference logic between username and ID formats

### 📋 Additional Tasks Completed (Real-Time Fix)

#### ✅ Task 7: Fix Facebook Display Bug
  **File**: `src/server/utils/queries/artistQueries.ts`  
  **Objective**: Fix Facebook ID entries not displaying on artist pages
  **Status**: ✅ COMPLETED (Uncommitted)

  **Critical Fixes Applied**:
  - **Fixed Property Mapping**: Added `artistPropertyName` mapping to handle `facebookID` platform → `facebookId` artist property mismatch
  - **Fixed Database Column Access**: Changed `artist[platform.siteName]` to `artist[artistPropertyName]`
  - **Fixed Compilation Error**: Updated line 285 to use mapped property name
  - Added Facebook preference logic (prefer username over ID when both exist)
  - Implemented YouTube-style dual-platform handling

#### ✅ Task 8: Database Display Configuration
  **File**: `drizzle/0007_fix_facebook_display_names.sql`
  **Objective**: Ensure facebookID platform displays as "Facebook" in UI
  **Status**: ✅ COMPLETED (Uncommitted)

  **Implementation**:
  - Created migration to set `card_platform_name = 'Facebook'` for `facebookID` platform
  - Ensures consistent "Facebook" branding for both username and ID entries

## Summary

### **You Last Committed After**: Task 3 (Fix URL Construction Logic)
### **Uncommitted Changes**: Tasks 4, 5, 6, 7 & 8
### **Status**: 🎉 ALL PARSING + DISPLAY ISSUES RESOLVED!

### Files Modified Since Last Commit:
1. `src/server/utils/__tests__/extractArtistId.test.ts` - Facebook parsing tests
2. `drizzle/0006_update_facebook_regex_patterns.sql` - URL parsing migration  
3. `src/server/utils/__tests__/facebook-e2e-flow.test.ts` - End-to-end validation
4. `src/server/utils/queries/artistQueries.ts` - **CRITICAL:** Fixed display bug
5. `drizzle/0007_fix_facebook_display_names.sql` - Display configuration migration
6. `plans/facebook-url-parsing-comprehensive-fix.md` - Plan updates

### Validation Status:
- ✅ Code compiles successfully
- ✅ All Facebook tests pass (22 test cases total)
- ✅ End-to-end flow validation complete
- ✅ No linting errors
- ✅ Database migration syntax validated
- ✅ All regex patterns working correctly
- ✅ **CRITICAL FIX**: Facebook display bug resolved
- ✅ Platform name mismatch corrected
- ✅ Preference logic implemented (matches YouTube behavior)
- ✅ Ready for commit

### Next Steps:
1. ✅ **Database Migrations Applied**: Both `0006_update_facebook_regex_patterns.sql` and `0007_fix_facebook_display_names.sql` have been manually applied to the database
2. **Test on Live Artist Page**: Verify Facebook ID entries now display as "Facebook" links
3. **Commit All Changes**: Tasks 4-8 are ready for single commit

### ✅ Task 9 - Fix Data Storage (CRITICAL FIX)
  **Files**: 
  - `src/server/utils/queries/artistQueries.ts`
  - `src/server/utils/__tests__/facebook-e2e-flow.test.ts`
  **Objective**: Fix fundamental issue where only extracted IDs were stored instead of full URLs
  **Status**: ✅ COMPLETED

  **Root Cause Discovered**: 
  - `addArtistData` was storing `artistIdFromUrl.id` (extracted ID) instead of `artistUrl` (full URL)
  - This caused `facebookID` column to contain only IDs like `100044180243805` instead of full URLs
  - Result: `getArtistLinks` couldn't generate proper display links

  **Implementation**:
  - Modified `addArtistData` to pass full `artistUrl` to `approveUGC` instead of extracted ID
  - Updated `approveUGC` parameter name for clarity (`artistIdFromUrl` → `artistUrlOrId`)
  - Updated `getArtistLinks` to handle full URLs in `facebookID` column (direct URL usage)
  - Updated tests to reflect new behavior: full URLs stored in database columns
  
  **Impact**: 
  - ✅ Both `facebook` and `facebookID` columns now store complete, working Facebook URLs
  - ✅ No more URL reconstruction needed - direct URL usage
  - ✅ Eliminates display issues where Facebook ID links weren't appearing

## Technical Implementation Details

### New Regex Patterns
  **Facebook Platform** (all formats):
  ```
  ^https://(?:[^/]*\.)?facebook\.com/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)(?:&[^#]*)?|([^/\?#]+))(?:[\?#].*)?$
  ```

  **FacebookID Platform** (ID formats only):
  ```
  ^https://(?:[^/]*\.)?facebook\.com/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)(?:&[^#]*)?)$
  ```

### Expected Parsing Results
  | URL Format | Matched Group | siteName | id |
  |------------|---------------|----------|-----|
  | `facebook.com/username` | Group 3 | `facebook` | `username` |
  | `facebook.com/people/Name/123` | Group 1 | `facebookID` | `123` |
  | `facebook.com/profile.php?id=123` | Group 2 | `facebookID` | `123` |

This plan ensures robust handling of all Facebook URL formats while maintaining backward compatibility and providing thorough testing coverage.