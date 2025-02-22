import frappe
from frappe.query_builder.functions import IfNull

@frappe.whitelist()
def get_rate(item_code,transaction_date,price_list):

	ip = frappe.qb.DocType("Item Price")
	query = (
		frappe.qb.from_(ip)
		.select(ip.name, ip.price_list_rate, ip.uom)
		.where(
			(ip.item_code == item_code)
			& (ip.price_list == price_list)
		)
		.orderby(ip.valid_from, order=frappe.qb.desc)
		.orderby(IfNull(ip.batch_no, ""), order=frappe.qb.desc)
		.orderby(ip.uom, order=frappe.qb.desc)
	)

	if transaction_date:
		query = query.where(
			(IfNull(ip.valid_from, "2000-01-01") <= transaction_date)
			& (IfNull(ip.valid_upto, "2500-12-31") >= transaction_date)
		)

	result = query.run()
	if len(result) > 0:
		return {"price_list_rate":result[0][1]}
	else:
		return {"price_list_rate":0}