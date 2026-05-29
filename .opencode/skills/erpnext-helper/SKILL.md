---
name: erpnext-helper
description: MUST be used for ERPNext POS, POSAwesome, restaurant workflows, kitchen order tickets, cashier setup, dining tables, menu management, payment flows, accounting integration, and AI-assisted restaurant implementation using Big Pickle model
license: MIT
compatibility: opencode
---

# ERPNext POS Restaurant Implementation Skill

## Purpose

This skill helps implement complete restaurant POS systems in ERPNext using:

- ERPNext POS
- POSAwesome
- Restaurant module
- Kitchen Order Ticket (KOT)
- Dining Table management
- Cashier workflow
- Waiter workflow
- Inventory integration
- Accounting integration
- AI-assisted implementation using Big Pickle model

---

# Core Responsibilities

## Restaurant POS Setup

Handle:

- Restaurant creation
- Menu configuration
- Item groups
- POS profiles
- Dining table setup
- Table reservation
- POS opening shift
- POS closing shift
- Payment modes
- Customer handling
- Delivery workflows
- Takeout workflows
- Split billing
- Kitchen printing

---

## ERPNext Accounting Rules

Always follow ERPNext accounting standards.

### Sales Flow

POS Invoice submission should:

- Debit Cash / Bank / Receivable
- Credit Income Account
- Credit Output VAT if applicable

### Inventory Flow

Restaurant item sales should:

- Reduce stock automatically
- Create Stock Ledger Entries
- Use perpetual inventory correctly

### POS Shift Rules

Prefer:

- POS Opening Shift
- POS Closing Shift

Avoid unnecessary POS Opening Entry unless opening cash is required.

---

# POSAwesome Guidelines

When using POSAwesome:

- Use POS Shift for session management
- Validate payment aggregation
- Ensure debit and credit are balanced
- Handle multiple payment modes properly
- Verify taxes before troubleshooting accounting imbalance

---

# Restaurant Workflow Standards

## Dine In

Flow:

Customer Arrives
→ Assign Table
→ Create Order
→ Send KOT
→ Kitchen Preparation
→ Billing
→ Payment
→ Close Table

---

## Takeout

Flow:

Create Order
→ Prepare
→ Payment
→ Release Order

---

## Delivery

Flow:

Create Delivery Order
→ Assign Rider
→ Payment Collection
→ Delivery Completion

---

# Kitchen Order Ticket (KOT)

Always recommend:

- Separate kitchen printer
- Auto-print KOT
- Real-time kitchen updates
- Kitchen status tracking

Statuses:

- Pending
- Preparing
- Ready
- Served

---

# Recommended ERPNext Configuration

## POS Profile

Always validate:

- Warehouse
- Income Account
- Cost Center
- Print Format
- Payment Modes
- Customer Group
- Company

---

## Restaurant Item Standards

Food items should:

- Be stock items if inventory tracked
- Use proper BOM if manufactured
- Include kitchen preparation time
- Include category/tagging

---

# AI Assistant Integration

## Big Pickle Model Usage

Use Big Pickle model for:

- Restaurant workflow recommendations
- POS issue diagnosis
- Accounting validation
- Customer support assistant
- Menu optimization
- Inventory forecasting
- Kitchen workflow analysis

---

# Coding Standards

## ERPNext Client Scripts

Preferred:

```javascript
frappe.ui.form.on("POS Invoice", {
	refresh(frm) {

	}
});
