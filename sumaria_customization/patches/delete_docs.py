import frappe

def execute():
    doc_to_delete = [
        ('Property Setter', 'Sales Order Item-discount_percentage-read_only'),
        ('Property Setter', 'Sales Order Item-discount_amount-read_only'),
        ('Custom Field', 'Sales Order-custom_workflow_role')
    ]
    
    for doc_type, doc_name in doc_to_delete:
        document = frappe.get_all(doc_type, filters={'name': doc_name})
        
        if document:
            frappe.delete_doc(doc_type, document[0].name)
            frappe.db.commit()
            frappe.log_error(f"Deleted {doc_type}: {doc_name}", "Patch Script")
