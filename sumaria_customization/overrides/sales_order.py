import frappe

def check_discount(doc,method=None):
    max_discount = 0
    for item in doc.items:
        if item.custom_additional_discount > max_discount:
            max_discount = item.custom_additional_discount

    matrix = frappe.get_list("Discount Approval Matrix Detail",{"parent":"Discount Approval Matrix"},['role','discount'],order_by="discount asc",ignore_permissions=True)
    for discount in matrix:
        if max_discount <= discount.discount:
            doc.custom_workflow_role = discount.role
            break
        
