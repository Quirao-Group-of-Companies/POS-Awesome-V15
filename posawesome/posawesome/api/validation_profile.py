"""POS Profile–driven toggles for POS Awesome validation behavior."""

import frappe
from frappe.utils import cint


def pos_profile_skips_posawesome_business_checks(pos_profile) -> bool:
    """When true, POS Awesome skips optional business-rule checks for this terminal.

    Does not disable ERPNext document validation, accounting rules, or database
    constraints. Intended for fork customization and non-standard workflows.
    """
    if not pos_profile:
        return False
    if isinstance(pos_profile, dict):
        return bool(cint(pos_profile.get("posa_skip_posawesome_business_checks")))
    try:
        return bool(
            cint(
                frappe.db.get_value(
                    "POS Profile",
                    pos_profile,
                    "posa_skip_posawesome_business_checks",
                )
                or 0
            )
        )
    except Exception:
        return False
