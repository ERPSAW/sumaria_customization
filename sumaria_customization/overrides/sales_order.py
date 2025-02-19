import frappe

def check_discount(doc,method=None):
    max_discount = 0
    for item in doc.items:
        if item.discount_percentage > max_discount:
            max_discount = item.discount_percentage

    if max_discount < 5:
        doc.custom_workflow_role = "Sales User"
    elif max_discount <= 15:
        doc.custom_workflow_role = "Sales Manager"
    elif max_discount > 15:
        doc.custom_workflow_role = "Sales Director"
        
