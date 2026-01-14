# COUNTERS & COUNTERTYPE TABLES ANALYSIS
**Database:** mcpmsdiu_enercondb_QA  
**Analysis Date:** January 12, 2026

---

## 📊 TABLE OVERVIEW

The database contains two related tables for managing business counters/outlets:
1. **`counters`** - Main table storing counter/outlet information
2. **`countertype`** - Lookup table for counter categorization

---

## 🏢 COUNTERS TABLE

### Structure
```
+-------------------+-----------------+------+-----+-------------------+
| Field             | Type            | Null | Key | Default           |
+-------------------+-----------------+------+-----+-------------------+
| id                | int(11)         | NO   | PRI | NULL (auto_inc)   |
| CounterName       | varchar(100)    | NO   |     | NULL              |
| counter_type      | int(11)         | NO   | MUL | 1                 |
| CityID            | int(11)         | NO   |     | NULL              |
| RepID             | int(11)         | NO   |     | NULL              |
| drID              | int(11)         | YES  | MUL | NULL              |
| longitude         | decimal(10,7)   | NO   |     | NULL              |
| latitude          | decimal(10,7)   | NO   |     | NULL              |
| phone             | varchar(15)     | YES  |     | NULL              |
| gst               | varchar(20)     | YES  |     | NULL              |
| address           | text            | YES  |     | NULL              |
| comments          | text            | YES  |     | NULL              |
| createdDate       | timestamp       | YES  |     | CURRENT_TIMESTAMP |
| openingBalance    | decimal(10,2)   | NO   |     | 0.00              |
| collectionTarget  | decimal(10,2)   | NO   |     | 0.00              |
| counterStatus     | tinyint(1)      | NO   |     | 1                 |
+-------------------+-----------------+------+-----+-------------------+
```

### Field Descriptions

#### **Core Identity Fields**
- **`id`**: Primary key, auto-increment unique identifier
- **`CounterName`**: Business name of the counter/outlet (e.g., "SAI SUMAN PHARMACUTICALS")
- **`counter_type`**: Foreign key reference to `countertype.id` (default: 1 = counter)
  - Categorizes the outlet type
- **`counterStatus`**: Active/inactive flag (1 = active, 0 = inactive)

#### **Location & Contact Fields**
- **`CityID`**: Foreign key reference to `city.id`
- **`longitude`**: GPS longitude coordinate (decimal degrees)
- **`latitude`**: GPS latitude coordinate (decimal degrees)
- **`phone`**: Contact phone number (15 chars max)
- **`gst`**: GST registration number (20 chars max, optional)
- **`address`**: Full text address of the counter

#### **Relationship Fields**
- **`RepID`**: Foreign key reference to `users.id` - Sales Representative assigned
- **`drID`**: Foreign key reference to `drcalls.id` (optional) - Doctor association

#### **Financial Fields**
- **`openingBalance`**: Starting balance/outstanding amount (₹)
- **`collectionTarget`**: Monthly collection target for this counter (₹)

#### **Metadata Fields**
- **`comments`**: Additional notes/remarks (text field)
- **`createdDate`**: Timestamp when counter was created (auto-set)

---

## 🏷️ COUNTERTYPE TABLE

### Structure
```
+-----------+-------------+------+-----+---------+
| Field     | Type        | Null | Key | Default |
+-----------+-------------+------+-----+---------+
| id        | int(11)     | NO   | PRI | NULL    |
| type_name | varchar(50) | NO   | UNI | NULL    |
| status    | tinyint(1)  | NO   |     | 1       |
+-----------+-------------+------+-----+---------+
```

### Field Descriptions
- **`id`**: Primary key for counter type
- **`type_name`**: Unique name of the counter type
- **`status`**: Active/inactive flag (1 = active, 0 = inactive)

### Available Counter Types
```
+----+--------------+--------+
| id | type_name    | status |
+----+--------------+--------+
| 1  | counter      | 1      |
| 2  | agency       | 1      |
| 3  | subcounter   | 1      |
+----+--------------+--------+
```

**Type Definitions:**
1. **counter**: Standard retail counter/pharmacy
2. **agency**: Larger distribution agency
3. **subcounter**: Smaller outlet or sub-distributor

---

## 🔗 RELATIONSHIPS

### Foreign Key Constraints
```
counters.counter_type  →  countertype.id
counters.CityID        →  city.id
counters.RepID         →  users.id
counters.drID          →  drcalls.id (optional)
```

### Typical Query Pattern
```sql
SELECT 
    c.*,
    ct.type_name,
    city.city as cityName,
    city.district,
    city.state,
    u.name as repName,
    u.phone as repMobile
FROM counters c
LEFT JOIN countertype ct ON c.counter_type = ct.id
LEFT JOIN city ON c.CityID = city.id
LEFT JOIN users u ON c.RepID = u.id
WHERE c.counterStatus = 1
ORDER BY c.CounterName;
```

---

## 📈 SAMPLE DATA

### Example Counter Records
```
+----+----------------------------+--------------+--------+-------+------+
| id | CounterName                | counter_type | CityID | RepID | drID |
+----+----------------------------+--------------+--------+-------+------+
| 36 | Test                       | 1            | 1      | 52    | NULL |
| 37 | SAI SUMAN PHARMACUTICALS   | 1            | 1      | 47    | NULL |
| 39 | SRI SAI MARKERTERS         | 1            | 11     | 53    | NULL |
| 40 | SOMESWARA AGENCIES         | 1            | 10     | 52    | 668  |
| 41 | GLOBAL HEALTH CARE         | 1            | 4      | 51    | 313  |
+----+----------------------------+--------------+--------+-------+------+

Financial Details:
| CounterName                | openingBalance | collectionTarget | counterStatus |
|----------------------------|----------------|------------------|---------------|
| Test                       | 0.00           | 0.00             | 0 (Inactive)  |
| SAI SUMAN PHARMACUTICALS   | 37,185.00      | 40,000.00        | 1 (Active)    |
| SRI SAI MARKERTERS         | 32,452.00      | 25,000.00        | 1 (Active)    |
| SOMESWARA AGENCIES         | 98,547.00      | 70,000.00        | 1 (Active)    |
| GLOBAL HEALTH CARE         | 56,099.00      | 25,000.00        | 1 (Active)    |
```

---

## 🎯 KEY INDEXES

### counters table
- **PRIMARY KEY**: `id`
- **INDEX**: `counter_type` (foreign key to countertype)
- **INDEX**: `drID` (foreign key to drcalls)

### countertype table
- **PRIMARY KEY**: `id`
- **UNIQUE KEY**: `type_name`

---

## 💼 BUSINESS LOGIC

### Counter Status Management
- **Active (1)**: Counter is operational and can receive orders
- **Inactive (0)**: Counter is disabled (shown with red border in UI)

### Financial Tracking
1. **Opening Balance**: Outstanding amount at period start
2. **Collection Target**: Expected monthly collection amount
3. **Due Calculation**: Opening balance + orders - collections

### Type Categorization
- Default type is "counter" (id = 1)
- Agencies typically have higher collection targets
- Subcounters may have different pricing/discount structures

---

## 📋 COMMON USE CASES

### 1. **Counter Creation**
```javascript
INSERT INTO counters (
    CounterName, counter_type, CityID, RepID, 
    longitude, latitude, phone, gst, address
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
```

### 2. **Get Counters by Representative**
```javascript
SELECT c.*, city.city as cityName 
FROM counters c
LEFT JOIN city ON c.CityID = city.id
WHERE c.RepID = ? AND c.counterStatus = 1
ORDER BY c.CounterName;
```

### 3. **Get Counters with Dues**
```javascript
SELECT 
    c.CounterName,
    c.openingBalance,
    c.collectionTarget,
    SUM(o.grandTotal) as totalOrdered,
    SUM(col.amount) as totalCollected,
    (c.openingBalance + SUM(o.grandTotal) - SUM(col.amount)) as totalDue
FROM counters c
LEFT JOIN orders o ON c.id = o.counterID
LEFT JOIN collections col ON c.id = col.counterID
WHERE c.counterStatus = 1
GROUP BY c.id
HAVING totalDue > 0;
```

### 4. **Update Financial Details**
```javascript
UPDATE counters 
SET openingBalance = ?, collectionTarget = ?
WHERE id = ?;
```

---

## 🔍 DATA VALIDATION RULES

1. **Required Fields**:
   - CounterName (must not be empty)
   - CityID (must exist in city table)
   - RepID (must exist in users table)
   - longitude and latitude (must be valid decimal numbers)

2. **Optional Fields**:
   - drID, phone, gst, address, comments

3. **Default Values**:
   - counter_type: 1 (counter)
   - counterStatus: 1 (active)
   - openingBalance: 0.00
   - collectionTarget: 0.00
   - createdDate: CURRENT_TIMESTAMP

4. **Constraints**:
   - longitude/latitude: Must be valid GPS coordinates
   - phone: Max 15 characters
   - gst: Max 20 characters
   - counterStatus: 0 or 1 only

---

## 📱 UI INTEGRATION

### Display Patterns
- **List View**: Shows CounterName, cityName, repName, phone
- **Detail View**: Shows all fields including GPS, GST, address
- **Inactive Indicators**: Red border when counterStatus = 0
- **Financial Dashboard**: Shows opening balance, target, collections, dues

### Filter Options
- By counter type (counter/agency/subcounter)
- By city
- By representative
- By status (active/inactive)
- By creation month/year

---

## 🚀 RELATED FEATURES

### Orders Module
- Orders are linked to counters via `orders.counterID`
- Counter's openingBalance affects due calculations

### Collections Module
- Collections are tracked per counter
- Used to calculate outstanding dues

### Payments Module
- Payment tracking references counter ID
- Updates financial status

### Reports
- **Counters Due Report**: Shows outstanding amounts per counter
- **Rep Sales Report**: Counter-wise sales by representative
- **New Counters Report**: Counters created per month

---

## 🔧 MAINTENANCE NOTES

### Adding New Counter Type
```sql
INSERT INTO countertype (type_name, status) 
VALUES ('new_type_name', 1);
```

### Deactivating a Counter
```sql
UPDATE counters 
SET counterStatus = 0 
WHERE id = ?;
```

### GPS Coordinates Update
```sql
UPDATE counters 
SET longitude = ?, latitude = ? 
WHERE id = ?;
```

---

## 📊 ANALYTICS QUERIES

### Counters Count by Type
```sql
SELECT 
    ct.type_name,
    COUNT(c.id) as counter_count
FROM countertype ct
LEFT JOIN counters c ON ct.id = c.counter_type
WHERE c.counterStatus = 1
GROUP BY ct.id, ct.type_name;
```

### Top Counters by Collection Target
```sql
SELECT 
    CounterName,
    collectionTarget,
    openingBalance
FROM counters
WHERE counterStatus = 1
ORDER BY collectionTarget DESC
LIMIT 10;
```

### Monthly Counter Creation Trend
```sql
SELECT 
    DATE_FORMAT(createdDate, '%Y-%m') as month,
    COUNT(*) as counters_created
FROM counters
WHERE createdDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(createdDate, '%Y-%m')
ORDER BY month;
```

---

## ✅ SUMMARY

The **counters** and **countertype** tables form the foundation of the customer/outlet management system:

- **33+ total tables** in the database
- **counters**: Main business entity table with 16 fields
- **countertype**: Simple lookup table with 3 types (counter, agency, subcounter)
- **Relationships**: Connected to city, users, drcalls, orders, collections, payments
- **Financial Tracking**: Opening balance and collection targets per counter
- **GPS Enabled**: Location tracking with longitude/latitude
- **Status Management**: Active/inactive counter control
- **Created Date Tracking**: For analytics and reporting

This structure supports comprehensive counter management including sales tracking, collection monitoring, and representative performance analysis.
