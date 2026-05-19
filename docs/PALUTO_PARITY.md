# Paluto POS → ERPNext + POS Awesome (fork) parity

This document is the **inventory and gap list** for replacing legacy **Paluto POS** (Flask + SQLite, Jinja templates) with **ERPNext + your POS Awesome fork**. Paluto’s SQLite schema and HTTP surface are a **behavioral spec**, not the shipped data model. **Accounting and stock** stay on ERPNext (Sales / POS Invoice, taxes, GL, stock rules).

**Non-goals:** Rewriting ERPNext core; duplicating Paluto’s internal tables in production.

**Implementation rule:** Prefer **POS Profile / custom fields / hooks / whitelist API / fork Vue** behind **`posa_paluto_*` (or existing `posa_*`) flags** so upstream merges stay feasible.

---

## Paluto reference on this bench

| Item | Path |
|------|------|
| **Root (zip top)** | `apps/FINAL_TEMP_POS-mat-20260514T014305Z-3-001/` |
| **Application** | `apps/FINAL_TEMP_POS-mat-20260514T014305Z-3-001/FINAL_TEMP_POS-mat/` |
| **Main server** | [`FINAL_TEMP_POS-mat/app.py`](../../FINAL_TEMP_POS-mat-20260514T014305Z-3-001/FINAL_TEMP_POS-mat/app.py) (relative: from `posawesome` repo → `../FINAL_TEMP_POS-mat-20260514T014305Z-3-001/FINAL_TEMP_POS-mat/app.py`) |
| **UI** | `FINAL_TEMP_POS-mat/templates/*.html` |
| **Deps** | `FINAL_TEMP_POS-mat/requirements.txt` |
| **DB bootstrap (partial)** | `FINAL_TEMP_POS-mat/create_db.py` (minimal `products` / `sales`; full schema lives in `paluto.db` if present) |

> From repo root `apps/posawesome/`, Paluto `app.py` is:  
> `../FINAL_TEMP_POS-mat-20260514T014305Z-3-001/FINAL_TEMP_POS-mat/app.py`

---

## Open questions (confirm once)

1. **ERPNext / Frappe version** in production (e.g. v15).
2. **Fork branch** used for production vs upstream merge target.

---

## Legend

| Status | Meaning |
|--------|---------|
| **done** | Present in fork; Paluto-tuned UX may still differ. |
| **partial** | Building blocks exist; behavior not fully matched. |
| **gap** | Needs design + flag + work. |
| **N/A** | Replaced by ERPNext standard or out of scope. |

---

## 1. Roles and session (Paluto evidence)

**Credential store:** `user_credentials` table; `login()` reads `user["role"]` into `session["role"]` (`app.py` approx. L195–238).

**Documented in code / comments**

| Role string (as used) | Where | Behavior |
|------------------------|-------|----------|
| `cashier` | `login()` redirect | After login → `opening_cash` (`app.py` L245–246) |
| `receptionist` | `opening_cash`, `tables`, `start_order` | Opening gate; tables **1–70** only (`app.py` L281, L337, L353, L421) |
| `admin`, `supervisors`, `managerial` | `dashboard_page`, `check_admin_pin` | Dashboard gate (`app.py` L1375–1376); PIN check queries same role set (`app.py` L1757–1760) |
| Docstring “Supervisor” | `login()` docstring | Marketing name; **DB uses `supervisors` (plural)** in SQL — align Frappe `Role` names to **actual DB values** in `paluto.db` |

**POS location:** `session["pos_location"]` from form; conflicts with `cashier_cash` where another user is `ACTIVE` on same POS, or same user on another POS (`app.py` L166–192).

**ERPNext mapping:** Frappe `User` + `Role` / `Role Profile`; **POS Profile** = terminal; optional **POS Opening Shift** = register session. Map SQLite roles → Frappe roles **by exact string** after inspecting `paluto.db` → `user_credentials.role` distinct values.

---

## 2. WebSocket + polling (Paluto evidence)

| Mechanism | Paluto | ERPNext / fork target |
|-----------|--------|------------------------|
| Push | `@sock.route("/ws_updates")` `ws_updates(ws)` (`app.py` L86–111): connect sends `{"type":"snapshot","data":_live_tables()}`; client may send `get_tables_snapshot` string for another snapshot | `frappe.publish_realtime` + PA `socketStore`, **or** poll-only MVP |
| Poll | `GET /get_table_status` → `jsonify(_live_tables())` (`app.py` L376–379) | `get_restaurant_tables`-style API or reuse with Paluto-shaped JSON adapter behind flag |
| Payload types | `broadcast_table_update`: `table_update`, `kitchen_update` (`app.py` L1198), `buffet_update` (`app.py` L1880) | Document adapter; **wire compatibility optional** |

`_live_tables()` SQL: `sales` where `status IN ('ACTIVE','READY','SERVED')` (`app.py` L77–80).

---

## 3. Parity matrix (route → ERPNext / fork)

**Paluto ref** = primary handler in `app.py` (line numbers ±1 after edits).

| Paluto route / area | Paluto ref | Behavior summary | ERPNext / POS Awesome target | This fork (snapshot) | Status |
|---------------------|------------|-------------------|------------------------------|------------------------|--------|
| `GET/POST /`, `/login` | `login` ~146–261 | `user_credentials` + hashed/plain password; POS location; cashier → opening else dashboard | Frappe login + POS Profile + shift | Standard PA opening | **partial** |
| `GET /logout` | ~263 | Clear session | Frappe logout | PA | **N/A** |
| `GET /reportsadmin` | ~271 | Admin reports entry | Desk / workspace | TBD | **gap** |
| `GET/POST /opening_cash` | `opening_cash` ~278–325 | Roles `cashier`,`receptionist`; `cashier_cash` insert | POS Opening Entry + PA opening dialog | `OpeningDialog` | **partial** |
| `GET /tables` | `tables` ~330–374 | Grid `range(1,71)` receptionist else `range(1,151)`; row ACTIVE if sales match else AVAILABLE | Table dashboard + server status | `/tables` → `RestaurantTableDashboard.vue` | **partial** |
| `GET /get_table_status` | ~376–379 | Poll JSON = active sales snapshot | Whitelist API | TBD | **gap** |
| `POST /start_order` | `start_order` ~411–458 | Force `order_type=unli` if `receptionist` or `table_id<=70`; conflict unless unli or receptionist; insert `sales` ACTIVE | Draft POS Invoice + custom fields + validation | No equivalent API | **gap** |
| `GET /pos` | `pos` ~461–511 | `unli_pos.html` vs `pos.html`; loads `sales` lines + `unli_rates` | Two Vue shells or item group driven | Single PA POS | **gap** |
| `POST /add_item` | `add_item` ~514+ | JSON body; unli uses `unli_products` for name | Cart lines | PA cart | **partial** |
| `POST /checkout/<txn_id>` | `checkout` ~819+ | Batch persist lines; `BUFFET_UNLI` special path | `update_invoice` / packed items | PA invoice API | **gap** |
| `POST /add_unli_guest` | ~1811+ | Buffet line + `buffet_update` WS | Custom item / taxes | None | **gap** |
| `POST /record_payment/<txn_id>`, `/complete_payment/<txn_id>` | ~1028–1138 | Payments table + finalize sales | PA Payments + submit | `Payments.vue` | **partial** |
| `GET /payment/<txn_id>` | ~1204+ | Totals + supervisor override path | PA payment dialog | PA | **partial** |
| `GET /kitchen`, `/api/kitchen_orders`, `POST .../update_order_status` | ~1146–1199 | KDS JSON; status READY/SERVED | KDS DocType or invoice-driven + realtime | TBD | **gap** |
| `/apply_discount/<txn_id>` | `apply_discount` ~1383+ | senior/pwd/employee/custom/remove + VAT math | Tax rules + discount + supervisor | PA offers / manual | **gap** |
| `/refund`, `/search_sales`, `/log_refund` | ~1451+ | Refund flows | Return SI / PE | PA returns | **partial** |
| `POST /check_admin` | ~1744–1794 | PIN vs users role in (`admin`,`supervisors`,`managerial`) | Supervisor PIN (PA patterns) | PA supervisor | **partial** |
| `/dashboard`, `/hourly`, `/summarized`, `/daily`, `/close_register`, `/x_reading`, `/z_reading`, `/api/*sales*` | ~1891+ | Reporting / Z / X | ERPNext reports + POS closing | `Reports.vue`, closing | **partial** |
| `/manage_user`, `/price_update`, `/api/users`, `/api/prices`, `/api/unli_prices` | ~2325+ | CRUD | Desk + Item Price | Standard | **partial** |
| `POST /print/*` | ~3758+ | Print proxies | Print Format + QZ / browser | PA print | **partial** |

---

## 4. Paluto route index (quick grep list)

All decorators in `app.py` (non-exhaustive detail; search `@app.route` for additions):

`/`, `/login`, `/logout`, `/reportsadmin`, `/opening_cash`, `/tables`, `/get_table_status`, `/start_order`, `/pos`, `/add_item`, `/cancel_order/<txn_id>`, `/cancel_order_unli/<txn_id>`, `/cancel_item`, `/get_receipt/<txn_id>`, `/void_item`, `/check_remaining/<txn_id>`, `/cancel_table/<txn_id>`, `/checkout/<txn_id>`, `/fetch_products`, `/get_products`, `/record_payment/<txn_id>`, `/complete_payment/<txn_id>`, `/kitchen`, `/view`, `/api/kitchen_orders`, `/api/update_order_status/...`, `/payment/<txn_id>`, `/apply_discount/<txn_id>`, `/refund`, `/search_sales`, `/log_refund`, `/check_admin`, `/add_unli_guest`, `/api/dashboard_metrics`, `/export_csv`, `/hourly`, `/api/hourly_sales_data`, `/api/summarized_sales`, `/summarized`, `/api/export_*`, `/api/daily_sales`, `/dashboard`, `/summarized_page`, `/hourly_page`, `/daily`, `/manage_user`, `/price_update`, `/close_register`, `/x_reading`, `/api/admin_report`, `/z_reading`, `/api/detailed_sales`, `/api/export_detailed_sales`, `/api/users` CRUD, `/api/prices` CRUD, `/api/unli_prices` CRUD, `/print/all|billing|order/<txn_id>`, `/get_transactions`.

**Sock:** `/ws_updates` (Flask-Sock).

---

## 5. DocTypes / fields (proposed) and migration

| Target | Fields / notes |
|--------|----------------|
| **POS Profile** | `posa_paluto_mode`, `posa_paluto_receptionist_max_table` (=70), `posa_paluto_max_table` (=150), `posa_paluto_unli_table_threshold` (=70), flags for buffet VAT template |
| **POS Invoice** (or SI) | `paluto_legacy_txn_id` (trace), `order_lane` (`regular` / `unli`), table id, kitchen status mirror of Paluto `READY`/`SERVED` if needed |
| **Custom DocPerm / Role** | Map `admin`, `supervisors`, `managerial`, `cashier`, `receptionist` |

**Migration:** `patches/*.py` + `create_custom_field`; optional `fixtures` export for greenfield.

---

## 6. PR-sized tasks + acceptance tests

| ID | Task | Acceptance test |
|----|------|-------------------|
| P0 | Add symlink or doc link from `posawesome` README to Paluto path (optional) | New dev finds `app.py` in one hop. |
| P1 | Export distinct `user_credentials.role` from `paluto.db` → Frappe Role table in appendix | All Paluto roles exist in Frappe; login test. |
| P2 | POS Profile: receptionist **70** vs other **150** table cap | Same user role matrix as `tables()` ~353. |
| P3 | `start_order` parity: unli if receptionist OR `table_id<=70`; conflict rules | Matches `start_order` ~420–441. |
| P4 | `/get_table_status` equivalent JSON (behind flag) | Polling client shows same states as Paluto snapshot. |
| P5 | WS or realtime: snapshot on connect + table/kitchen/buffet events | Second browser updates within SLA. |
| P6 | Unli POS shell + `unli_products` / `unli_rates` mapping to Item / Price List | Buffet line posts correct GL. |
| P7 | `apply_discount` senior/pwd math vs ERPNext tax | Automated test with fixed amounts. |
| P8 | KDS API shape compatible with `kitchen.html` expectations | Kitchen screen lists same grouping as Paluto. |
| P9 | `check_admin` → PA supervisor PIN | Invalid PIN blocked. |
| P10 | Print routes → Print Format checklist | Paper parity sign-off. |

---

## 7. Explicit non-parity

- SQLite `sales` row model ≠ POS Invoice line model; map by **transaction** semantics.
- **Wire protocol** of `/ws_updates` not mandatory; **latency and visibility** are.
- Parity **not assumed** until acceptance tests pass.

---

## 8. Revision history

| Date | Note |
|------|------|
| 2026-05-13 | Initial skeleton (Paluto tree not in repo). |
| 2026-05-14 | Paluto attached at `FINAL_TEMP_POS-mat-20260514T014305Z-3-001/`; roles, WS, routes, `app.py` line refs added. |
