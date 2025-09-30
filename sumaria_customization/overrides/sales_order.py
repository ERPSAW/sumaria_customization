import frappe
from frappe.desk.reportview import get_filters_cond, get_match_cond


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

        for item in doc.items:
            if (item.custom_has_batch_no or item.custom_has_serial_no) and not item.custom_serial_and_batch_bundle:
                frappe.throw("serial and batch bundle is required for {} item in row {}".format(item.item_name, item.idx))
        
        for item in doc.packed_items:
            is_serial_no, is_batch_no = frappe.db.get_value("Item", item.item_code, ["has_serial_no", "has_batch_no"])
            if not item.serial_and_batch_bundle and (is_serial_no or is_batch_no):
                frappe.throw("serial and batch bundle is required for {} packed item in row {}".format(item.item_name, item.idx))

def cancel_serial_batch_bundle(doc, method):
    serial_and_batch_bundle = frappe.db.get_list("Serial and Batch Bundle",{"voucher_type":"Sales Order","voucher_no":doc.name},["name", "voucher_detail_no"])
    for item in serial_and_batch_bundle:
        if item.name:
            frappe.db.set_value("Sales Order Item", item.voucher_detail_no, "custom_serial_and_batch_bundle", None)
            frappe.delete_doc("Serial and Batch Bundle",item.name)

@frappe.whitelist()
def get_warehouse_from_serial_no(serial_no):
    serial_doc = frappe.get_doc("Serial No",serial_no)
    return serial_doc.warehouse

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_available_serial_nos(doctype, txt, searchfield, start, page_len, filters, as_dict=False):
    """
    Custom query for Serial Nos.
    Only show serials that are 'Available' and NOT linked to Sales Order,
    Delivery Schedule, or Delivery Note via Serial and Batch Bundle.
    """

    # Apply filters safely (item_code, warehouse, etc.)
    fcond = get_filters_cond(doctype, filters, [])
    mcond = get_match_cond(doctype)

    fcond = fcond.replace("`tabSerial No`", "sn").replace("`", "")
    mcond = mcond.replace("`tabSerial No`", "sn").replace("`", "")

    query = f"""
        SELECT sn.name, sn.item_code, sn.warehouse
        FROM `tabSerial No` sn
        WHERE sn.{searchfield} LIKE %(txt)s
          AND sn.status = 'Active'
          {fcond} {mcond}
          AND sn.name NOT IN (
              SELECT sb.serial_no
              FROM `tabSerial and Batch Entry` sb
              INNER JOIN `tabSerial and Batch Bundle` sbb
                  ON sb.parent = sbb.name
              WHERE sbb.docstatus < 2
                AND sbb.voucher_type IN ('Sales Order', 'Delivery Schedule', 'Delivery Note')
                AND sb.serial_no IS NOT NULL
          )
        ORDER BY sn.{searchfield} ASC
        LIMIT %(page_len)s OFFSET %(start)s
    """

    return frappe.db.sql(
        query,
        {
            "txt": f"%{txt}%",
            "start": start,
            "page_len": page_len,
        },
        as_dict=as_dict,
    )