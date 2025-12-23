# Simplified CSV-to-Firestore Data Flow (School Project)

## 🎯 Core Principle: Always Replace, Never Accumulate

**This application maintains ONLY the most current dataset.** When you upload new data via CSV or add records manually, all old data is automatically replaced. This ensures data freshness and prevents outdated information from remaining in the database.

## Overview
The data flows through a single validation pipeline from CSV → Firestore → Dashboard. No redundant processing. **All uploads ALWAYS clear old data first.**

## Data Flow Diagram

```

added 
┌─────────────────────────────────────────────────────────────────────┐
│                    1. PRE-AUTHENTICATION LAYER                      │
│              (Public Access - No Login Required)                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   2. LOGIN / REGISTRATION FORM                      │
│  ├─ Email/Username + Password input                               │
│  ├─ Role selection (Admin/Public User)                            │
│  ├─ Validation:                                                   │
│  │  ├─ Email format check                                         │
│  │  ├─ Password strength (min 8 chars)                           │
│  │  └─ Existing user check                                        │
│  └─ Submit → Auth Service                                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   3. AUTHENTICATION SERVICE                         │
│                                                                     │
│  ├─ Hash password (bcrypt)                                        │
│  ├─ Verify credentials                                            │
│  ├─ Generate JWT token with:                                      │
│  │  ├─ userId                                                    │
│  │  ├─ role (admin/user)                                         │
│  │  └─ permissions[]                                             │
│  ├─ Set token expiration (24h)                                   │
│  └─ Return token + user data                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  4. ROUTE GUARD MIDDLEWARE                          │
│              (Minimal: One Function, One Check)                     │
│                                                                     │
│  function requireRole(requiredRole) {                              │
│    return (req, res, next) => {                                   │
│      if (!req.user) return 401                                    │
│      if (req.user.role !== requiredRole) return 403               │
│      next();                                                      │
│    }                                                              │
│  }                                                                │
│                                                                     │
│  // Usage Examples:                                               │
│  app.get('/admin/*', requireRole('admin'))                        │
│  app.get('/export/*', requireRole('user'))                        │
│  app.get('/data/*', requireRole('user') || requireRole('admin'))  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  5. ROLE-BASED APPLICATION FLOW                     │
│                                                                     │
│  ┌─────────────────┐      ┌─────────────────┐                     │
│  │    ADMIN USER   │      │   PUBLIC USER   │                     │
│  └─────────────────┘      └─────────────────┘                     │
│           ↓                        ↓                               │
│  ┌─────────────────┐      ┌─────────────────┐                     │
│  │  Full Dashboard │      │  View Dashboard │                     │
│  │  ├─ All charts  │      │  ├─ All charts  │                     │
│  │  ├─ All tables  │      │  ├─ All tables  │                     │
│  │  ├─ Upload CSV  │      │  ├─ NO UPLOAD   │                     │
│  │  └─ Manage Data │      │  └─ Export Only │                     │
│  └─────────────────┘      └─────────────────┘                     │
│           ↓                        ↓                               │
│  ┌─────────────────┐      ┌─────────────────┐                     │
│  │ User Management │      │  Export Options │                     │
│  │ (Admin-only)    │      │  ├─ Charts→DOCX │                     │
│  │                 │      │  └─ Table→CSV   │                     │
│  └─────────────────┘      └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘



Behavior inside the system:
┌─────────────────────────────────────────────────────────────────────┐
│                  1. USER UPLOADS CSV FILE                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│              2. CSVUPLOADER COMPONENT (Single Pass)                 │
│                                                                       │
│  ├─ Parse CSV with Papa Parse                                      │
│  ├─ Filter completely empty rows                                   │
│  ├─ Validate Year column:                                          │
│  │  ├─ Must be 4-digit format (/^\d{4}$/)                          │
│  │  └─ Must be in range 1900-2100                                  │
│  ├─ Convert other columns:                                         │
│  │  ├─ Auto-detect numeric strings → convert to Number             │
│  │  ├─ Keep text as strings                                        │
│  │  └─ Leave empty fields undefined (no default 0)                 │
│  └─ Report invalid rows with specific reasons                      │
│     (shown to user if all rows fail)                               │
│                                                                       │
│  OUTPUT: Validated & typed array of row objects                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                   (via onCsvData callback)
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  3. APP.JSX - HANDLE CSV UPLOAD                     │
│                                                                       │
│  ├─ Receive validated rows (no re-processing needed!)              │
│  ├─ Set uploadStatus to "uploading"                                │
│  ├─ Store rows in temporary csvData state                          │
│  └─ ALWAYS call: overwriteCollection(rows, clearExisting=true)     │
│     → This ALWAYS clears old data first                            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│         4. FIRESTORESERVICE - OVERWRITE COLLECTION                  │
│              (ALWAYS REPLACES ALL EXISTING DATA)                    │
│                                                                       │
│  ├─ If clearExisting = true (DEFAULT):                             │
│  │  └─ DELETE all existing documents from "emigrants" collection   │
│  │     → This is the primary behavior                              │
│  │                                                                   │
│  ├─ Deduplicate rows:                                              │
│  │  ├─ Create hash for each row (all fields sorted)                │
│  │  ├─ Skip duplicate rows (same hash = same data)                 │
│  │  └─ Log skipped duplicates to console                           │
│  │                                                                   │
│  └─ Upload unique rows ONLY:                                       │
│     └─ addDoc() to Firestore for each unique row                   │
│                                                                       │
│  🎯 RESULT: Database contains ONLY new data (old data deleted)     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│           5. FIRESTORE REAL-TIME SYNC (useDynamicSchema)           │
│                                                                       │
│  ├─ Listen to "emigrants" collection                               │
│  ├─ Fetch all documents (only new data)                            │
│  ├─ Normalize data (trim, detect types)                            │
│  ├─ Generate schema automatically                                  │
│  └─ Update app state                                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│        6. DASHBOARD DISPLAYS DATA (CURRENT DATASET ONLY)           │
│                                                                       │
│  ├─ DataTable: shows all records (only new ones)                   │
│  ├─ DynamicChart: visualizes columns                               │
│  ├─ DynamicMap: shows location data                                │
│  ├─ StatusCombinedChart: aggregates status columns                 │
│  └─ Filters: lets user search/filter data                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Improvements

### ✅ Single Replace Strategy
- **No User Choice**: All uploads ALWAYS replace old data (no "append" option)
- **Always Fresh**: Only the most current dataset exists at any time
- **Default Behavior**: `clearExisting = true` is the only mode
- **Data Safety**: Users cannot accidentally keep outdated data

### ✅ Simplified Validation
- **Single Pass**: All validation happens in CsvUploader only
- **Removed Redundancy**: App.jsx no longer re-processes rows
- **No Double Conversion**: Numeric conversion happens once

### ✅ Deduplication
- **Hash-Based**: Creates a hash from all field values
- **Simple Logic**: Uses Set for O(1) duplicate detection
- **Logged**: Skipped duplicates logged to console
- **Works**: Prevents duplicate rows from same CSV upload

### ✅ Better Error Messages
- **Specific Reasons**: Shows exactly why each invalid row failed
- **Row Numbers**: Includes CSV row numbers (starting at row 2, after header)
- **User-Friendly**: Error messages displayed in UI, not just console

### ✅ Cleaner Data
- **No Default Zeros**: Empty fields remain undefined
- **Type Clarity**: Distinguishes missing data from zero values
- **School-Friendly**: Easy to understand and debug

## Data Structure Example

### Input CSV
```
Year,single,married,widower,separated,notReported
2000,16,0,25,3,4
2001,20,5,,2,1
```

### After CsvUploader Processing
```javascript
[
  {
    year: 2000,
    single: 16,
    married: 0,
    widower: 25,
    separated: 3,
    notReported: 4
  },
  {
    year: 2001,
    single: 20,
    married: 5,
    // widower: undefined (empty field)
    separated: 2,
    notReported: 1
  }
]
```

### In Firestore (documents)
```javascript
// Document 1
{
  id: "auto-generated",
  year: 2000,
  single: 16,
  married: 0,
  widower: 25,
  separated: 3,
  notReported: 4
}

// Document 2
{
  id: "auto-generated",
  year: 2001,
  single: 20,
  married: 5,
  separated: 2,
  notReported: 1
  // widower field not stored (undefined omitted)
}
```

## Testing

### Test CSV Upload (Default Replace Behavior)
1. Create test data with 5 records in Firestore first
2. Upload a new CSV file with 3 records
3. ✅ Verify: Old data (5 records) is completely gone
4. ✅ Verify: Only new data (3 records) remains
5. ✅ Verify: No duplicates

### Test Deduplication (Prevents Same Row Twice in One CSV)
1. Create CSV with 2 identical rows (same data in both)
2. Upload the CSV
3. ✅ Verify: Only 1 record appears (duplicate removed)
4. ✅ Verify: Console shows "Skipping duplicate row" warning
5. ✅ Verify: Original data also cleared first

### Test Error Handling with Data Replacement
1. Have 10 old records in database
2. Upload CSV with invalid years (non-4-digit)
3. ✅ Verify: Error message shows specific row numbers
4. ✅ Verify: All old data is STILL deleted (cleared before validation)
5. ✅ Verify: Database is now empty

### Test Multiple Uploads in Sequence
1. Upload CSV-1 (5 records) → Database has 5 records
2. Upload CSV-2 (3 records) → Database has 3 records (CSV-1 removed)
3. Upload CSV-3 (7 records) → Database has 7 records (CSV-2 removed)
4. ✅ Verify: Only CSV-3 data remains, earlier uploads are gone

## Files Modified

| File | Changes |
|------|---------|
| `App.jsx` | Removed `uploadMode` state, removed mode selection UI, always call `overwriteCollection(rows, true)` |
| `CsvUploader.jsx` | Added warning message: "All existing data will be replaced with the new data from this file" |
| `firestoreService.js` | Updated docs: `clearExisting = true` is now the PRIMARY behavior (no appending) |

## No Changes Needed
- ✅ `useDynamicSchema.js` - works as-is
- ✅ `DataTable.jsx` - works as-is
- ✅ `DynamicChart.jsx` - works as-is
- ✅ `DynamicMap.jsx` - works as-is
- ✅ `StatusCombinedChart.jsx` - works as-is
- ✅ `Dashboard.jsx` - works as-is

## Zero Errors ✅
All files compile cleanly with no warnings or errors.
