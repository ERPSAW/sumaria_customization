import frappe

@frappe.whitelist()
def get_options(item):
    data = frappe.db.sql("SELECT rate FROM `tabReturn Item Rate Detail` WHERE parent = %(item)s ORDER BY rate",{"item":item},as_dict=1)
    result = []
    for row in data:
        result.append(row.rate)
    return result