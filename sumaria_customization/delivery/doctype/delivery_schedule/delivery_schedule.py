# Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from erpnext.stock.doctype.delivery_note.delivery_note import make_sales_return
from frappe.utils import cint
from erpnext.stock.doctype.serial_no.serial_no import get_serial_nos_for_outward


class DeliverySchedule(Document):
    def get_serials(self,item_code,warehouse,qty):

        kwargs = frappe._dict(
			{
				"item_code": item_code,
				"warehouse": warehouse,
				"based_on": frappe.db.get_single_value("Stock Settings", "pick_serial_and_batch_based_on"),
			}
		)
        serial_nos = get_serial_nos_for_outward(kwargs)

        return "\n".join(serial_nos[: cint(qty)])

    @frappe.whitelist()
    def get_deliveries(self):
        # Deliver
        self.items_to_deliver = []
        orders = frappe.db.sql(
            """SELECT soi.name as sales_order_item,so.name as sales_order,soi.qty as quantity,soi.item_code as item, so.custom_zone_id as zone,so.custom_zone_name as zone_name, so.customer as customer,so.branch as branch,soi.warehouse as warehouse from `tabSales Order Item` as soi join `tabSales Order` as so on soi.parent = so.name WHERE so.docstatus = 1 AND soi.delivery_date <= %(date)s AND soi.qty > soi.delivered_qty AND ((so.custom_is_credit_delivery = 'No' AND so.rounded_total = so.advance_paid) OR (so.custom_is_credit_delivery = 'Yes')) order by so.custom_zone_id;""",
            {"date": self.date_up_to},
            as_dict=True,
        )
        for order in orders:
            flag = True
            if self.zone:
                if order.zone != self.zone:
                    flag = False
            if self.branch:
                if order.branch != self.branch:
                    flag = False
            if self.warehouse:
                if order.warehouse != self.warehouse:
                    flag = False
            if frappe.db.get_value("Item",order.item,'is_stock_item') and flag:
                item_data = {
                    "item": order.item,
                    "qty": order.quantity,
                    "sales_order": order.sales_order,
                    "zone": order.zone,
                    "zone_name": order.zone_name,
                    "customer": order.customer,
                    "sales_order_item": order.sales_order_item,
                }
                self.append("items_to_deliver", item_data)

        # Pickups
        self.items_to_receive = []
        docs = frappe.db.sql(
            """SELECT *,
(SELECT custom_zone_id from `tabSales Order` WHERE name = query.sales_order) as zone,
(SELECT custom_zone_name from `tabSales Order` WHERE name = query.sales_order) as zone_name,
(SELECT branch from `tabSales Order` WHERE name = query.sales_order) as branch 
FROM 
(SELECT mri.item_code as item, mri.qty as quantity,mri.sales_order as sales_order, mr.name as material_request,mri.name as material_request_item ,mr.customer as customer,'' as delivery_note,'' as delivery_note_item,'' as sales_return_item,mri.warehouse as warehouse from `tabMaterial Request Item` as mri join `tabMaterial Request` as mr on mri.parent = mr.name 
WHERE mr.docstatus = 1 AND mri.schedule_date <= %(date)s AND mr.material_request_type = 'Customer Provided' AND mri.qty > mri.ordered_qty
UNION
SELECT sri.item as item, sri.quantity as quantity,sr.sales_order as sales_order, '' as material_request,'' as material_request_item,sr.customer as customer, sri.delivery_note as delivery_note, sri.delivery_note_item as delivery_note_item, sri.name as sales_return_item, (SELECT custom_return_godown FROM `tabSales Order` WHERE name = sr.sales_order) as warehouse FROM `tabSales Return` as sr join `tabSales Return Item` as sri on sr.name = sri.parent 
WHERE sr.docstatus = 1 AND sri.schedule_date <= %(date)s and sri.quantity > sri.delivered_qty) as query
order by zone""",
            {"date": self.date_up_to},
            as_dict=True,
        )
        for doc in docs:
            flag = True
            if self.branch:
                if self.branch != doc.branch:
                    flag = False
            if self.warehouse:
                if self.warehouse != doc.warehouse:
                    flag = False
            if self.zone:
                if self.zone != doc.zone:
                    flag = False

            if frappe.db.get_value("Item",doc.item,'is_stock_item') and flag: 
                self.append(
                    "items_to_receive",
                    {
                        "item": doc.item,
                        "qty": doc.quantity,
                        "sales_order": doc.sales_order,
                        "zone": doc.zone,
                        "zone_name": doc.zone_name,
                        "material_request": doc.material_request,
                        "material_request_item": doc.material_request_item,
                        "customer": doc.customer,
                        "delivery_note": doc.delivery_note,
                        "delivery_note_item": doc.delivery_note_item,
                        "sales_return_item":doc.sales_return_item
                    },
                )

        # Transfer
        self.items_to_transfer = []
        mrs = frappe.db.sql(
            """SELECT mri.item_code as item, mri.qty as quantity, mr.name as material_request,mri.name as material_request_item,mri.warehouse as t_warehouse, mri.from_warehouse as s_warehouse,mri.from_warehouse as warehouse,mr.custom_branch as branch from `tabMaterial Request Item` as mri join `tabMaterial Request` as mr on mri.parent = mr.name WHERE mr.docstatus = 1 AND mri.schedule_date <= %(date)s AND mr.material_request_type = 'Material Transfer' AND mri.qty > mri.ordered_qty order by mr.creation""",
            {"date": self.date_up_to},
            as_dict=True,
        )
        for mr in mrs:
            flag = True
            if self.zone:
                if frappe.db.get_value("Warehouse",mr.t_warehouse,"custom_zone") != self.zone:
                    flag = False
            if self.warehouse:
                if self.warehouse != mr.t_warehouse:
                    flag = False
            if self.branch:
                if self.branch != mr.branch:
                    flag = False
            if frappe.db.get_value("Item",mr.item,'is_stock_item') and flag:
                self.append(
                    "items_to_transfer",
                    {
                        "item": mr.item,
                        "qty": mr.quantity,
                        "material_request": mr.material_request,
                        "material_request_item": mr.material_request_item,
                        "s_warehouse": mr.s_warehouse,
                        "t_warehouse": mr.t_warehouse,
                    },
                )

    def on_submit(self):

        def is_delivery_created(self,order, order_item):
            result = frappe.db.sql("""SELECT parent FROM `tabDelivery Note Item` WHERE docstatus = 0 AND against_sales_order = %(order)s AND so_detail = %(order_item)s""",{'order':order,'order_item':order_item},as_dict=1)
            for res in result:
                doc = frappe.get_doc("Delivery Note",res.parent)
                doc.set_posting_time = 1
                doc.posting_date = self.date_up_to
                doc.save()
            if len(result)>0:
                return True
            else:
                return False

        # delivery
        customers = {}
        for item in self.items_to_deliver:
            if not is_delivery_created(self,item.sales_order,item.sales_order_item):                       
                if item.customer not in customers:
                    customers[item.customer] = [item]
                else:
                    customers[item.customer].append(item)

        for customer in customers.keys():
            document = {
                "doctype": "Delivery Note",
                "customer": customer,
                "set_warehouse": "",
                "set_posting_time":1,
                "posting_date":self.date_up_to
            }
            note = frappe.get_doc(document)
            for item in customers[customer]:
                data = {}
                if item.sales_order_item:
                    (
                        rate,
                        price_list_rate,
                        custom_return_item_rate,
                        custom_return_item,
                        custom_return_item_group,
                        custom_return_qty,
                        custom_return_item_amount,
                        custom_additional_discount,
                        custom_additional_discount_amount,
                        discount_percentage,
                        discount_amount,
                        margin_type,
                        margin_rate_or_amount,
                        custom_is_return
                    ) = frappe.db.get_value(
                        "Sales Order Item",
                        item.sales_order_item,
                        [
                            "rate",
                            "price_list_rate",
                            "custom_return_item_rate",
                            "custom_return_item",
                            "custom_return_item_group",
                            "custom_return_qty",
                            "custom_return_item_amount",
                            "custom_additional_discount",
                            "custom_additional_discount_amount",
                            "discount_percentage",
                            "discount_amount",
                            "margin_type",
                            "margin_rate_or_amount",
                            "custom_is_return"
                        ],
                    )
                    data = {
                        "rate": rate,
                        "price_list_rate": price_list_rate,
                        "custom_return_item_rate": custom_return_item_rate,
                        "custom_return_item": custom_return_item,
                        "custom_return_item_group": custom_return_item_group,
                        "custom_return_qty": custom_return_qty,
                        "custom_return_item_amount": custom_return_item_amount,
                        "custom_additional_discount": custom_additional_discount,
                        "custom_additional_discount_amount": custom_additional_discount_amount,
                        "discount_percentage": discount_percentage,
                        "discount_amount": discount_amount,
                        "margin_type": margin_type,
                        "margin_rate_or_amount": margin_rate_or_amount,
                        "custom_is_return":custom_is_return
                    }
                item_data = {
                        "item_code": item.item,
                        "qty": item.qty,
                        "schedule_date": self.date_up_to,
                        "against_sales_order": item.sales_order,
                        "so_detail": item.sales_order_item,
                        "serial_no":item.serial_no,
                        "custom_delivery_schedule":item.parent,
                        "custom_ds_detail":item.name
                    }
                item_data.update(data),
                serial_no = self.get_serials(item.item,frappe.db.get_value('Sales Order Item',item.sales_order_item,'warehouse'),item.qty)
                if not item_data['serial_no']:
                    item_data["serial_no"] = serial_no
                    item.serial_no = serial_no
                if item_data['serial_no']:
                    item_data["use_serial_batch_fields"] = 1

                note.append(
                    "items",
                    item_data,
                )
            note.save()

        # buyback & return
        customers_buy = {}
        notes_ret = {}
        item_details = {}
        for item in self.items_to_receive:
            if item.material_request:
                if item.customer not in customers_buy:
                    customers_buy[item.customer] = [item]
                else:
                    customers_buy[item.customer].append(item)
            else:
                if item.delivery_note not in notes_ret:
                    notes_ret[item.delivery_note] = [item]
                    item_details[item.delivery_note] = [item.delivery_note_item]
                else:
                    notes_ret[item.delivery_note].append(item)
                    item_details[item.delivery_note].append(item.delivery_note_item)            

        def is_buy_se_created(request, request_item):
            result = frappe.db.sql("""SELECT parent FROM `tabStock Entry Detail` WHERE docstatus = 0 AND material_request = %(request)s AND material_request_item = %(request_item)s""",{'request':request,'request_item':request_item},as_dict=1)
            for res in result:
                doc = frappe.get_doc("Stock Entry",res.parent)
                doc.set_posting_time = 1
                doc.posting_date = self.date_up_to
                doc.save()
            if len(result)>0:
                return True
            else:
                return False

        for customer in customers_buy.keys():
            document = {
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Receipt",
                "set_posting_time":1,
                "posting_date":self.date_up_to
            }
            buy_se = frappe.get_doc(document)
            for item in customers_buy[customer]:
                t_warehouse = frappe.db.get_value(
                    "Material Request Item", item.material_request_item, "warehouse"
                )
                if not is_buy_se_created(item.material_request,item.material_request_item):
                    buy_se.append(
                        "items",
                        {
                            "item_code": item.item,
                            "qty": item.qty,
                            "t_warehouse": t_warehouse, 
                            "custom_delivery_schedule": item.parent,
                            "custom_ds_detail": item.name,
                            "material_request":item.material_request,
                            "material_request_item":item.material_request_item,
                        },
                    )
            if buy_se.items and len(buy_se.items) > 0:
                buy_se.save()

        def is_return_created(sr_detail):
            result = frappe.db.sql("""SELECT parent FROM `tabDelivery Note Item` WHERE docstatus = 0 AND custom_sr_detail = %(sr_detail)s""",{'sr_detail':sr_detail},as_dict=1)
            for res in result:
                doc = frappe.get_doc("Delivery Note",res.parent)
                doc.set_posting_time = 1
                doc.posting_date = self.date_up_to
                doc.save()
            if len(result)>0:
                return True
            else:
                return False

        for del_note in notes_ret.keys():
            items = []
            note_doc = make_sales_return(del_note)
            note_doc.set_posting_time = 1
            note_doc.posting_date = self.date_up_to
            # remove unwanted items
            for item in note_doc.items:
                if item.dn_detail in item_details[del_note]:
                    items.append(item)
            note_doc.items = items

            # update quantities
            for item in note_doc.items:
                for it in notes_ret[del_note]:
                    if item.dn_detail == it.delivery_note_item:
                        item.qty = -(it.qty)
                        item.custom_sr_detail = it.sales_return_item
                        item.custom_delivery_schedule = it.parent,
                        item.custom_ds_detail = it.name
            items = []
            for item in note_doc.items:
                if not is_return_created(item.custom_sr_detail):
                    items.append(item)
            note_doc.items = items
            if len(items)>0:
                note_doc.save()

        def is_transfer_created(self,request, request_item):
            result = frappe.db.sql("""SELECT parent FROM `tabStock Entry Detail` WHERE docstatus = 0 AND material_request = %(request)s AND material_request_item = %(request_item)s""",{'request':request,'request_item':request_item},as_dict=1)
            for res in result:
                doc = frappe.get_doc("Stock Entry",res.parent)
                doc.set_posting_time = 1
                doc.posting_date = self.date_up_to
                doc.save()
            if len(result)>0:
                return True
            else:
                return False

        # transfer
        warehouses = {}
        for item in self.items_to_transfer:
            if not is_transfer_created(self,item.material_request, item.material_request_item):
                if (item.s_warehouse, item.t_warehouse) not in warehouses:
                    warehouses[(item.s_warehouse, item.t_warehouse)] = [item]
                else:
                    warehouses[(item.s_warehouse, item.t_warehouse)].append(item)

        for s_warehouse, t_warehouse in warehouses.keys():
            document = {
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Transfer",
                "set_posting_time":1,
                "posting_date":self.date_up_to
            }
            note = frappe.get_doc(document)
            for item in warehouses[(s_warehouse, t_warehouse)]:
                note.append(
                    "items",
                    {
                        "item_code": item.item,
                        "qty": item.qty,
                        "s_warehouse": s_warehouse,
                        "t_warehouse": t_warehouse,
                        "custom_delivery_schedule":item.parent,
                        "custom_ds_detail":item.name,
                        "material_request":item.material_request,
                        "material_request_item":item.material_request_item,
                    },
                )
            note.save()
