import importlib.util
import pathlib
import sys
import types
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]

_ACTIVE_SHIFT = "POSA-OS-2026-00001"


def _install_frappe_stub():
    frappe_module = types.ModuleType("frappe")
    frappe_module.whitelist = lambda *args, **kwargs: (lambda fn: fn)

    def _has_column(doctype, field):
        if doctype not in ("POS Invoice", "Sales Invoice"):
            return False
        return field in ("restaurant_table", "posa_pos_opening_shift")

    frappe_module.db = types.SimpleNamespace(
        has_column=_has_column,
        get_value=lambda *args, **kwargs: 1,
    )

    # Default get_all: return active shift for POS Opening Shift, empty for others
    def _default_get_all(doctype, *args, **kwargs):
        if doctype == "POS Opening Shift":
            return [{"name": _ACTIVE_SHIFT}]
        return []

    frappe_module.get_all = _default_get_all
    sys.modules["frappe"] = frappe_module

    utils_module = types.ModuleType("frappe.utils")
    utils_module.flt = lambda value, precision=None: float(value or 0)
    sys.modules["frappe.utils"] = utils_module


def _load_restaurant_module():
    module_name = "posawesome.posawesome.api.restaurant"
    file_path = REPO_ROOT / "posawesome" / "posawesome" / "api" / "restaurant.py"
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _make_invoice_row(**overrides):
    """Helper to build a minimal invoice row dict."""
    row = {
        "name": "POS-INV-000",
        "restaurant_table": "P-1",
        "restaurant_table_label": "P-1",
        "restaurant_floor": "PALUTO",
        "creation": "2026-05-19 09:55:00",
        "docstatus": 0,
        "modified": "2026-05-19 10:00:00",
        "grand_total": 100,
        "outstanding_amount": 100,
        "posa_pos_opening_shift": _ACTIVE_SHIFT,
    }
    row.update(overrides)
    return row


class TestRestaurantApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _install_frappe_stub()
        cls.restaurant = _load_restaurant_module()

    def setUp(self):
        # Reset get_all to default before each test
        self.restaurant.frappe.get_all = _default_get_all_for_test

    # ---------------------------------------------------------------
    # Occupied (draft invoice)
    # ---------------------------------------------------------------
    def test_draft_invoice_marks_table_occupied(self):
        self.restaurant.frappe.get_all = lambda doctype, *a, **kw: (
            [{"name": _ACTIVE_SHIFT}]
            if doctype == "POS Opening Shift"
            else [
                _make_invoice_row(
                    name="POS-INV-001",
                    restaurant_table="P-1",
                    restaurant_table_label="P-1",
                    grand_total=1500,
                    outstanding_amount=100,
                )
            ]
        )

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"]["P-1"]["status"], "Occupied")
        self.assertEqual(result["tables"]["P-1"]["invoice_name"], "POS-INV-001")
        self.assertEqual(result["tables"]["P-1"]["grand_total"], 1500.0)
        self.assertEqual(result["tables"]["P-1"]["creation"], "2026-05-19 09:55:00")

    # ---------------------------------------------------------------
    # Vacant (paid / submitted with no outstanding)
    # ---------------------------------------------------------------
    def test_paid_submitted_invoice_frees_table(self):
        self.restaurant.frappe.get_all = lambda doctype, *a, **kw: (
            [{"name": _ACTIVE_SHIFT}]
            if doctype == "POS Opening Shift"
            else [
                _make_invoice_row(
                    name="POS-INV-002",
                    restaurant_table="P-2",
                    docstatus=1,
                    grand_total=800,
                    outstanding_amount=0,
                )
            ]
        )

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"], {})

    # ---------------------------------------------------------------
    # Bill-Cut (submitted but unpaid)
    # ---------------------------------------------------------------
    def test_unpaid_submitted_invoice_is_bill_cut(self):
        self.restaurant.frappe.get_all = lambda doctype, *a, **kw: (
            [{"name": _ACTIVE_SHIFT}]
            if doctype == "POS Opening Shift"
            else [
                _make_invoice_row(
                    name="POS-INV-003",
                    restaurant_table="P-3",
                    docstatus=1,
                    grand_total=500,
                    outstanding_amount=50,
                )
            ]
        )

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"]["P-3"]["status"], "Bill-Cut")

    # ---------------------------------------------------------------
    # Priority: Occupied (draft) beats Bill-Cut for same table
    # ---------------------------------------------------------------
    def test_draft_wins_over_bill_cut_for_same_table(self):
        self.restaurant.frappe.get_all = lambda doctype, *a, **kw: (
            [{"name": _ACTIVE_SHIFT}]
            if doctype == "POS Opening Shift"
            else [
                _make_invoice_row(
                    name="POS-INV-004",
                    restaurant_table="P-4",
                    docstatus=1,
                    grand_total=200,
                    outstanding_amount=20,
                ),
                _make_invoice_row(
                    name="POS-INV-005",
                    restaurant_table="P-4",
                    creation="2026-05-19 13:55:00",
                    modified="2026-05-19 14:00:00",
                    grand_total=100,
                    outstanding_amount=10,
                ),
            ]
        )

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"]["P-4"]["status"], "Occupied")
        self.assertEqual(result["tables"]["P-4"]["invoice_name"], "POS-INV-005")

    # ---------------------------------------------------------------
    # No active opening shift → all tables vacant
    # ---------------------------------------------------------------
    def test_no_active_shift_returns_empty(self):
        self.restaurant.frappe.get_all = lambda doctype, *a, **kw: (
            [] if doctype == "POS Opening Shift" else [_make_invoice_row(name="POS-INV-006")]
        )

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"], {})

    # ---------------------------------------------------------------
    # Closed shift (POS Opening Shift has pos_closing_shift set)
    # should not be returned by _resolve_active_opening_shift → all vacant
    # ---------------------------------------------------------------
    def test_closed_shift_frees_all_tables(self):
        # Simulate no open shift found (all existing shifts are closed)
        self.restaurant.frappe.get_all = lambda doctype, *a, **kw: (
            [] if doctype == "POS Opening Shift" else [_make_invoice_row(name="POS-INV-007")]
        )

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"], {})

    # ---------------------------------------------------------------
    # Invoice linked to a different (non-active) shift → treated as vacant
    # ---------------------------------------------------------------
    def test_invoice_on_different_shift_is_ignored(self):
        self.restaurant.frappe.get_all = lambda doctype, *a, **kw: (
            [{"name": _ACTIVE_SHIFT}]
            if doctype == "POS Opening Shift"
            else []  # no invoices on the active shift
        )

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"], {})

    # ---------------------------------------------------------------
    # Floor filter still works with shift filtering
    # ---------------------------------------------------------------
    def test_floor_filter_with_shift(self):
        self.restaurant.frappe.get_all = lambda doctype, *a, **kw: (
            [{"name": _ACTIVE_SHIFT}]
            if doctype == "POS Opening Shift"
            else [
                _make_invoice_row(
                    name="POS-INV-008",
                    restaurant_table="P-5",
                    restaurant_floor="FLOOR_A",
                ),
                _make_invoice_row(
                    name="POS-INV-009",
                    restaurant_table="P-6",
                    restaurant_floor="FLOOR_B",
                ),
            ]
        )

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
            floor="FLOOR_A",
        )

        self.assertIn("P-5", result["tables"])
        self.assertNotIn("P-6", result["tables"])

    # ---------------------------------------------------------------
    # Missing column guard
    # ---------------------------------------------------------------
    def test_missing_restaurant_table_column_returns_empty(self):
        original = self.restaurant.frappe.db.has_column

        def mock_has_column(doctype, field):
            if field == "restaurant_table":
                return False
            return True

        self.restaurant.frappe.db.has_column = mock_has_column
        result = self.restaurant.get_restaurant_table_status()
        self.assertEqual(result["tables"], {})
        self.restaurant.frappe.db.has_column = original

    def test_missing_posa_pos_opening_shift_column_returns_empty(self):
        original = self.restaurant.frappe.db.has_column

        def mock_has_column(doctype, field):
            if field == "posa_pos_opening_shift":
                return False
            return True

        self.restaurant.frappe.db.has_column = mock_has_column
        result = self.restaurant.get_restaurant_table_status()
        self.assertEqual(result["tables"], {})
        self.restaurant.frappe.db.has_column = original


def _default_get_all_for_test(doctype, *args, **kwargs):
    if doctype == "POS Opening Shift":
        return [{"name": _ACTIVE_SHIFT}]
    return []


if __name__ == "__main__":
    unittest.main()
