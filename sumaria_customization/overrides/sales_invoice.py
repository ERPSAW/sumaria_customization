import frappe

def update_serial_no(doc,method = None):
    for item in doc.items:
        if item.serial_and_batch_bundle:
            serial_no_list = frappe.db.get_all("Serial and Batch Entry", {"parent": item.serial_and_batch_bundle}, pluck="serial_no")
            item.custom_serial_nos = ", ".join(serial_no_list)

    for item in doc.packed_items:
        if item.serial_and_batch_bundle:
            serial_no_list = frappe.db.get_all("Serial and Batch Entry", {"parent": item.serial_and_batch_bundle}, pluck="serial_no")
            item.custom_serial_nos = ", ".join(serial_no_list)