import frappe

def check_discount(doc,method=None):
    max_discount = 0
    for item in doc.items:
        if item.discount_percentage >= max_discount:
            max_discount = item.discount_percentage
    doc.custom_max_discount = max_discount
        
