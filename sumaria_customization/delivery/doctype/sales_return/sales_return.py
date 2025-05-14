# Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SalesReturn(Document):
    @frappe.whitelist()
    def get_items(self):
        self.items = []
        items = frappe.db.sql(
            """SELECT * FROM `tabDelivery Note Item` WHERE docstatus = 1 AND against_sales_order = %(order)s""",
            {"order": self.sales_order},
            as_dict=1,
        )
        for item in items:
            self.append(
                "items",
                {
                    "item": item.item_code,
                    "quantity": item.qty,
                    "delivery_note": item.parent,
                    "delivery_note_item": item.name,
                    "sales_order_item": item.so_detail,
                },
            )

        # order = frappe.get_doc('Sales Order',self.sales_order) 
        # for item in order.items:
        # 	self.append('items',{'item':item.item_code,'quantity':item.qty}) 
