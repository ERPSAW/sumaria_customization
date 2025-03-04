from erpnext.stock.get_item_details import get_item_details as gid,apply_price_list as apl
import frappe
import json

@frappe.whitelist()
def get_item_details(args, doc=None, for_validate=False, overwrite_warehouse=True):
    data =  gid(args, doc=None, for_validate=False, overwrite_warehouse=True)
    doc_dict = json.loads(doc)
    if doc_dict["doctype"] in ["Sales Order","Delivery Note","Sales Invoice"]:
        data.custom_item_price = data.price_list_rate
        args_dict = json.loads(args)
        row = {}
        for item in doc_dict["items"]:
            if item["name"] == args_dict["child_docname"]:
                row = item
        data.price_list_rate = data.custom_item_price - row["custom_return_item_rate"]
    return data

@frappe.whitelist()
def apply_price_list(args, as_doc=False, doc=None):
    data =  apl(args, as_doc=False, doc=None)
    doc_dict = json.loads(doc)
    if doc_dict["doctype"] in ["Sales Order","Delivery Note","Sales Invoice"]:
        if len( data["children"])>0:
            for idx,item in enumerate(doc_dict["items"]):
                data["children"][idx]["price_list_rate"] =  data["children"][idx]["price_list_rate"] - item["custom_return_item_rate"]
    return data