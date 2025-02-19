import frappe

def execute():
    role_name = "Sales Director"
    role_description = "Sales Director"
    
    if not frappe.db.exists("Role", role_name):
        new_role = frappe.get_doc({
            "doctype": "Role",
            "role_name": role_name,
            "description": role_description
        })
        
        new_role.insert()
        print(f"Role '{role_name}' has been created successfully.")
    else:
        print(f"Role '{role_name}' already exists.")
