from frappe import _


def get_data():
    return {
        "fieldname": "custom_delivery_schedule",
        "transactions": [
            {
                "label": _("Transfers"),
                "items": ["Stock Entry"],
            },
            {"label": _("Delivery & Returns"), "items": ["Delivery Note"]},
        ],
    }
