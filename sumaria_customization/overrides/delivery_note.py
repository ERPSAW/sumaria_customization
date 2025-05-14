import frappe

def update_sales_return(doc,method = None):
    if doc.is_return:
        for item in doc.items:
            if item.custom_sr_detail:
                res = frappe.db.sql("""SELECT abs(sum(qty)) as qty FROM `tabDelivery Note Item` WHERE docstatus = 1 AND custom_sr_detail = %(detail)s""",{"detail":item.custom_sr_detail},as_dict=1)
                if len(res)>0:
                    frappe.db.set_value("Sales Return Item",item.custom_sr_detail,'delivered_qty',res[0].qty)