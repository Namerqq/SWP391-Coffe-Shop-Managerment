# SWP391 - COFFEE SHOP MANAGEMENT SYSTEM
## ITERATION 1 TEST REPORT & VERIFICATION SPECIFICATION
**Module:** Inventory Management (Manager) & Inventory Inquiries (Barista)  
**Author / Assignee:** BaoPG (Student)  
**Date:** Autumn 2026  
**Status:** 100% Tests Passed (10/10) | Ready for Evaluation  

---

## 1. Module Overview & Business Scope

The Inventory Management module serves as the primary supply-chain backbone for the Coffee Shop Management System. It ensures that ingredient stock balances are strictly audited, accurately reflected in real time, and protected against unauthorized alterations or accidental data overwrites.

### Actors & Implemented Use Cases
* **MANAGER (UC-IV01, UC-IV02, UC-IV03):**
  * **Manage Ingredients (CRUD):** View full inventory listings, register new items with opening quantities, update operational metadata (name, packaging unit, minimum alert threshold, cost per unit) while strictly protecting balance integrity.
  * **Stock-In Operations:** Increase stock balances backed by mandatory `STOCK_IN` transactions with supplier annotations and invoice references.
  * **Stock-Out / Inventory Adjustment:** Decrease or correct stock balances for waste, expiration, or data input corrections with reason tagging (`ADJUSTMENT`, `WASTE`, `STOCK_OUT`) and validation against available stock.
  * **Real-time Search & Audit Trail:** Search items on-the-fly and inspect the immutable transaction log history (`GET /api/manager/inventory/{id}/history`).
  * **Live KPI Dashboard:** High-level metrics on `ManagerOverview` showing total managed items, critical low-stock count, safe balance count, and alert notifications.
* **BARISTA (UC-B04):**
  * **View Inventory (Read-Only):** Inquire real-time ingredient levels with visual indicator badges (`Safe Stock` vs. `Low Stock Alert`) to proactively request restocking ahead of peak operational hours.

---

## 2. Test Execution Statistics Summary

| Metric Name | Value | Notes |
| :--- | :--- | :--- |
| **Total Test Cases** | **10** | Comprehensive JUnit 5 + Mockito suite |
| **Passed Test Cases** | **10** | Zero failures, zero errors |
| **Failed Test Cases** | **0** | All business assertions verified |
| **Pass Rate** | **100.0%** | Meets & exceeds Iteration 1 acceptance criteria |
| **Testing Scope** | Service Layer (`InventoryServiceTest`) | Isolated with Mockito mocks for `InventoryItemRepository` & `StockTransactionRepository` |
| **Execution Tool** | Maven Surefire Plugin 3.2.5 | Executed via OpenJDK 17 |

---

## 3. Detailed Unit Test Cases Matrix

| Test ID | Test Case Name / Method | Target Method | Given (Input State) | When (Trigger Action) | Then (Expected Outcome) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-IV01** | `create_Success_WithOpeningStock` | `create()` | Unique item payload with `openingQuantity = 10.000` | Manager submits creation request | Item created with status `ACTIVE`, opening stock recorded, audit transaction `STOCK_IN` persisted | **PASSED** |
| **TC-IV02** | `create_ThrowsConflict_WhenDuplicateName` | `create()` | Item payload with existing name (case-insensitive) | Manager submits duplicate name | Throws `ApiException(409 CONFLICT)`, repository save never invoked | **PASSED** |
| **TC-IV03** | `stockIn_Success_AccumulatesStockAndLogsTransaction` | `stockIn()` | Existing item with current balance `10.000 kg` | Manager stocks in `15.500 kg` with supplier note | Balance accumulated to `25.500 kg`, `STOCK_IN` transaction saved with timestamp & manager ID | **PASSED** |
| **TC-IV04** | `stockIn_ThrowsNotFound_WhenItemDoesNotExist` | `stockIn()` | Non-existent item ID `#999` | Manager requests stock-in for `#999` | Throws `ResourceNotFoundException(404)`, no transaction logged | **PASSED** |
| **TC-IV05** | `update_Success_DoesNotChangeCurrentQuantity` | `update()` | Existing item with balance `10.000 kg`, payload carries forged `openingQuantity = 999.000` | Manager updates metadata (name, unit, alert level, cost) | Item metadata updated successfully; `currentQuantity` remains strictly immutable at `10.000 kg` | **PASSED** |
| **TC-IV06** | `listLowStock_ReturnsOnlyItemsBelowMinimum` | `listLowStock()` | Items with `currentQuantity <= minimumStockLevel` | Query active low-stock items | Returns only items matching critical threshold with `lowStock = true` | **PASSED** |
| **TC-IV07** | `stats_CalculatesCorrectSummary` | `stats()` | 3 items: 1 low-stock (balance 2 <= 5) and 2 safe items (balance 10, 20 > 5) | Manager requests dashboard KPI metrics | Returns `{ total: 3, lowStock: 1, ok: 2 }` with exact arithmetic breakdown | **PASSED** |
| **TC-IV08** | `stockOut_Success_DecreasesQuantityAndCreatesTransaction` | `stockOut()` | Existing item with balance `20.000 kg` | Manager submits reduction of `5.000 kg` with reason `ADJUSTMENT` | Balance decreased to `15.000 kg`, transaction saved with type `ADJUSTMENT` and audit note | **PASSED** |
| **TC-IV09** | `stockOut_ThrowsBadRequest_WhenQuantityExceedsCurrent` | `stockOut()` | Existing item with balance `10.000 kg` | Manager requests reduction of `15.000 kg` | Throws `ApiException(400 BAD_REQUEST)`, transaction repository save prevented | **PASSED** |
| **TC-IV10** | `listActive_ReturnsAllActiveInventoryItems` | `listActive()` | Active items repository dataset | Request active inventory list | Returns complete mapped DTO collection sorted alphabetically by item name | **PASSED** |

---

## 4. Google Sheet Documentation Reference

### Sheet 1: `Test Statistics`
* **Total Executed Tests:** 10
* **Passed Tests:** 10
* **Failed Tests:** 0
* **Pass Rate:** 100%
* **Defect Density:** 0%
* **Execution Environment:** Windows 11 x64, Spring Boot 3.3.4, Java 17, Maven 3.10.0

### Sheet 2: `Test Cases`
* Covers Functional Validation (CRUD, Stock-In, Stock-Out, Low-Stock Calculation) and Security/Data Integrity Assertions (Unauthorized balance overwriting prevented, Duplicate names rejected with 409).

### Sheet 3: `Feature Name1 - Inventory CRUD & Stock-In`
* Validates creation, item uniqueness, supplier stock accumulation, and 404/409 exception handling.

### Sheet 4: `Feature Name2 - Stock-Out & Low-Stock Alerts`
* Validates stock reduction, balance bounds checking (cannot reduce below zero), low-stock filtering (`currentQuantity <= minimumStockLevel`), and audit trail persistence.

---

## 5. Architectural & Security Safeguards

1. **Zero Database DDL Modifications:**
   * All changes strictly adhere to the baseline schema in `database/V1__schema.sql`.
   * Leveraged existing database enum types (`STOCK_IN`, `STOCK_OUT`, `WASTE`, `ADJUSTMENT`) without altering foreign keys or table constraints.
2. **Immutable Balance Integrity:**
   * Direct editing of `currentQuantity` via standard item update endpoints is blocked by design in `InventoryService.java`.
   * Stock balance adjustments are only possible through dedicated, audited transactions (`stockIn` and `stockOut`).
3. **Role-Based Access Control:**
   * Manager endpoints are guarded with `@RequireRole("MANAGER")`.
   * Barista endpoints are restricted to read-only queries with `@RequireRole("BARISTA")`.
