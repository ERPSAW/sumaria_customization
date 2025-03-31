import frappe
import json
@frappe.whitelist()
def get_details(orders):
    or_list = json.loads(orders)
    fee = 0
    price = 0
    finance_item = frappe.db.get_value("Sumaria Settings","Sumaria Settings","finance_item")
    if finance_item == None or finance_item == '':
        frappe.throw("Please set finance item in Sumaria Settings")
    for order in or_list:
        order_doc = frappe.get_doc("Sales Order",order)
        for item in order_doc.items:
            if item.item_code == finance_item:
                fee = fee + item.amount
            else:
                price = price + item.amount
    return {'price':price ,'fee':fee }