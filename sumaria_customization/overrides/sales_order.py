import frappe


def check_discount(doc, method=None):
    max_discount = 0
    return_flag = False
    for item in doc.items:
        if item.custom_is_return:
             return_flag = True
        if item.discount_percentage >= max_discount:
            max_discount = item.discount_percentage
    doc.custom_max_discount = max_discount
    if return_flag and not doc.custom_return_godown:
         frappe.throw("return godown is required for buyback item")


def create_mr(doc, method=None):
        return_flag = False
        document = {
            "doctype": "Material Request",
            "material_request_type": "Customer Provided",
            "customer":doc.customer,
            "set_warehouse":doc.custom_return_godown,
            "custom_customer_address":doc.customer_address,
            "custom_address":doc.address_display,
            "custom_contact_person":doc.contact_person,
            "custom_contact":doc.contact_display,     
            "custom_mobile_no":doc.contact_mobile,
            "custom_branch":doc.branch
        }
        request = frappe.get_doc(document)
        for item in doc.items:
            if item.custom_is_return and item.custom_return_item:
                request.append('items',{'item_code':item.custom_return_item ,'qty':item.custom_return_qty,'warehouse':doc.custom_return_godown,'schedule_date':item.delivery_date,'sales_order':doc.name,'sales_order_item':item.name})
                return_flag = True
        if return_flag:
            request.save()
            request.submit()
        for item in doc.items:
            if item.custom_is_return and item.custom_return_item:
                frappe.msgprint(f"Material Request is created for buyback item {item.custom_return_item}")


def cancel_serial_batch_bundle(doc, method):
    serial_and_batch_bundle = frappe.db.get_list("Serial and Batch Bundle",{"voucher_type":"Sales Order","voucher_no":doc.name},["name", "voucher_detail_no"])
    for item in serial_and_batch_bundle:
        if item.name:
            frappe.db.set_value("Sales Order Item", item.voucher_detail_no, "custom_serial_and_batch_bundle", None)
            frappe.delete_doc("Serial and Batch Bundle",item.name)