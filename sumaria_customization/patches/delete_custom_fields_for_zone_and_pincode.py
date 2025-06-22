import frappe

def execute():
    doc_to_delete = [
        "Warehouse-custom_zone_name",
        "Warehouse-custom_pin_code",
        "Warehouse-custom_zone",
        "Address-custom_pin_code",
        "Address-custom_zone",
        "Sales Order-custom_pin_code",
        "Sales Order-custom_zone_id",
        "Sales Order-custom_zone_name",
    ]

    for doc_name in doc_to_delete:
        if frappe.db.exists("Custom Field", doc_name, cache=True):
            frappe.delete_doc("Custom Field", doc_name,)
            frappe.db.commit()
