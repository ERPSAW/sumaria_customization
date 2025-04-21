import frappe
import json
@frappe.whitelist()
def get_details(types,docs):
    do_list = json.loads(docs)
    ty_list = json.loads(types)
    price = 0
    for idx,doc in enumerate(do_list):
        doc = frappe.get_doc(ty_list[idx],doc)
        for item in doc.items:
            price = price + item.amount
    return {'price':price}