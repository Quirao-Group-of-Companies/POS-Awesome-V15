import importlib.util
import pathlib
import sys
import types
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]


def _install_frappe_stub():
    frappe_module = types.ModuleType("frappe")
    frappe_module.whitelist = lambda *args, **kwargs: (lambda fn: fn)
    frappe_module.db = types.SimpleNamespace(
        has_column=lambda doctype, field: doctype in ("POS Invoice", "Sales Invoice")
        and field == "restaurant_table",
        get_value=lambda *args, **kwargs: 1,
    )
    frappe_module.get_all = lambda *args, **kwargs: []
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


class TestRestaurantApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _install_frappe_stub()
        cls.restaurant = _load_restaurant_module()

    def test_draft_invoice_marks_table_occupied(self):
        self.restaurant.frappe.get_all = lambda *args, **kwargs: [
            {
                "name": "POS-INV-001",
                "restaurant_table": "P-1",
                "restaurant_table_label": "P-1",
                "restaurant_floor": "PALUTO",
                "docstatus": 0,
                "modified": "2026-05-19 10:00:00",
                "outstanding_amount": 100,
            }
        ]

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"]["P-1"]["status"], "Occupied")
        self.assertEqual(result["tables"]["P-1"]["invoice_name"], "POS-INV-001")

    def test_paid_submitted_invoice_frees_table(self):
        self.restaurant.frappe.get_all = lambda *args, **kwargs: [
            {
                "name": "POS-INV-002",
                "restaurant_table": "P-2",
                "restaurant_table_label": "P-2",
                "restaurant_floor": "",
                "docstatus": 1,
                "modified": "2026-05-19 11:00:00",
                "outstanding_amount": 0,
            }
        ]

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"], {})

    def test_unpaid_submitted_invoice_is_bill_cut(self):
        self.restaurant.frappe.get_all = lambda *args, **kwargs: [
            {
                "name": "POS-INV-003",
                "restaurant_table": "P-3",
                "restaurant_table_label": "P-3",
                "restaurant_floor": "",
                "docstatus": 1,
                "modified": "2026-05-19 12:00:00",
                "outstanding_amount": 50,
            }
        ]

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"]["P-3"]["status"], "Bill-Cut")

    def test_draft_wins_over_bill_cut_for_same_table(self):
        self.restaurant.frappe.get_all = lambda *args, **kwargs: [
            {
                "name": "POS-INV-004",
                "restaurant_table": "P-4",
                "restaurant_table_label": "P-4",
                "restaurant_floor": "",
                "docstatus": 1,
                "modified": "2026-05-19 13:00:00",
                "outstanding_amount": 20,
            },
            {
                "name": "POS-INV-005",
                "restaurant_table": "P-4",
                "restaurant_table_label": "P-4",
                "restaurant_floor": "",
                "docstatus": 0,
                "modified": "2026-05-19 14:00:00",
                "outstanding_amount": 10,
            },
        ]

        result = self.restaurant.get_restaurant_table_status(
            company="Test Co",
            pos_profile="Test POS",
        )

        self.assertEqual(result["tables"]["P-4"]["status"], "Occupied")
        self.assertEqual(result["tables"]["P-4"]["invoice_name"], "POS-INV-005")


if __name__ == "__main__":
    unittest.main()
