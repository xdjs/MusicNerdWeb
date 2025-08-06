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

### 🔄 Next Task: Task 6 - End-to-End Flow Validation
  **Objective**: Test complete flow from URL submission to database storage to link display
  **Status**: 📋 PENDING

  **Actions Needed**:
  - Test URL submission through the application UI
  - Verify proper storage in database (facebook vs facebookID columns)
  - Confirm correct URL generation for display
  - Validate all three Facebook URL formats work end-to-end

## Summary

### **You Last Committed After**: Task 3 (Fix URL Construction Logic)
### **Uncommitted Changes**: Tasks 4 & 5 
### **Next Task Number**: Task 6 (End-to-End Flow Validation)

### Files Modified Since Last Commit:
1. `src/server/utils/__tests__/extractArtistId.test.ts` - Facebook tests added
2. `drizzle/0006_update_facebook_regex_patterns.sql` - Database migration created
3. `plans/facebook-url-parsing-comprehensive-fix.md` - Plan updates and formatting

### Validation Status:
- ✅ Code compiles successfully
- ✅ All Facebook tests pass
- ✅ No linting errors
- ✅ Database migration syntax validated
- ✅ All regex patterns working correctly
- ✅ Ready for commit

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