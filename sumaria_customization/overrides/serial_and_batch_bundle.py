import frappe
import json
from frappe.utils import cint, nowtime
from erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle import (
    add_serial_batch_ledgers as _add_serial_batch_ledgers, 
    SerialandBatchBundle as BaseSerialAndBatchBundle, 
    get_reserved_serial_nos, 
    get_serial_nos_based_on_posting_date,
	get_non_expired_batches,
	get_auto_batch_nos
)

class SerialAndBatchBundle(BaseSerialAndBatchBundle):
	@property
	def child_table(self):
		if self.voucher_type == "Job Card":
			return

		parent_child_map = {
			"Asset Capitalization": "Asset Capitalization Stock Item",
			"Asset Repair": "Asset Repair Consumed Item",
			"Quotation": "Packed Item",
			"Stock Entry": "Stock Entry Detail",
			"Delivery Schedule": "Delivery Schedule Delivery Item",
		}

		return (
			parent_child_map[self.voucher_type]
			if self.voucher_type in parent_child_map
			else f"{self.voucher_type} Item"
		)
	
	def on_trash(self):
		for item in frappe.db.get_all("Delivery Schedule Delivery Item", {"serial_and_batch_bundle": self.name}):
			frappe.db.set_value("Delivery Schedule Delivery Item", item.name, "serial_and_batch_bundle", None)

		self.validate_voucher_no_docstatus()
		if self.voucher_type != "Sales Order":
			self.delink_refernce_from_voucher()
			self.delink_reference_from_batch()

	
	def on_cancel(self):
		for item in frappe.db.get_all("Delivery Schedule Delivery Item", {"serial_and_batch_bundle": self.name}):
			frappe.db.set_value("Delivery Schedule Delivery Item", item.name, "serial_and_batch_bundle", None)

		super().on_cancel()


@frappe.whitelist()
def add_serial_batch_ledgers(entries, child_row, doc, warehouse, do_not_save=False) -> object:
	serial_and_batch_doc = _add_serial_batch_ledgers(entries, child_row, doc, warehouse, do_not_save=do_not_save)
	doc = json.loads(doc)
	child_row = json.loads(child_row)
	serial_and_batch_doc.voucher_no = doc.get("name")
	serial_and_batch_doc.voucher_detail_no = child_row.get("name")
	serial_and_batch_doc.save(ignore_permissions=True)
	return serial_and_batch_doc


@frappe.whitelist()
def is_serial_batch_no_exists(item_code, type_of_transaction, serial_no=None, batch_no=None, warehouse=None):
	if serial_no and frappe.db.exists("Serial No", {"name": serial_no, "status": "Active"}):
		serial_warehouse = frappe.db.get_value("Serial No", serial_no, "warehouse")
		if serial_warehouse and serial_warehouse != warehouse:
			return {
				"warehouse": serial_warehouse,
				"status": "success"
			}
	else:
		return {
			"status": "error",
			"message": "Serial No does not exist or is not active"
		}


@frappe.whitelist()
def get_auto_data(**kwargs):
	kwargs = frappe._dict(kwargs)
	if cint(kwargs.has_serial_no):
		return get_available_serial_nos(kwargs)

	elif cint(kwargs.has_batch_no):
		return get_auto_batch_nos(kwargs)


def get_available_serial_nos(kwargs):
	fields = ["name as serial_no", "warehouse"]
	if kwargs.has_batch_no:
		fields.append("batch_no")

	order_by = "creation"
	if kwargs.based_on == "LIFO":
		order_by = "creation desc"
	elif kwargs.based_on == "Expiry":
		order_by = "amc_expiry_date asc"

	filters = {"item_code": kwargs.item_code}

	# ignore_warehouse is used for backdated stock transactions
	# There might be chances that the serial no not exists in the warehouse during backdated stock transactions
	if not kwargs.get("ignore_warehouse"):
		filters["warehouse"] = ("is", "set")
		if kwargs.warehouse:
			filters["warehouse"] = kwargs.warehouse

	# Since SLEs are not present against Reserved Stock [POS invoices, SRE], need to ignore reserved serial nos.
	ignore_serial_nos = get_reserved_serial_nos(kwargs)

	# To ignore serial nos in the same record for the draft state
	if kwargs.get("ignore_serial_nos"):
		ignore_serial_nos.extend(kwargs.get("ignore_serial_nos"))

	if kwargs.get("posting_date"):
		if kwargs.get("posting_time") is None:
			kwargs.posting_time = nowtime()

		time_based_serial_nos = get_serial_nos_based_on_posting_date(kwargs, ignore_serial_nos)

		if not time_based_serial_nos:
			return []

		filters["name"] = ("in", time_based_serial_nos)
	elif ignore_serial_nos:
		filters["name"] = ("not in", ignore_serial_nos)

	if kwargs.get("batches"):
		batches = get_non_expired_batches(kwargs.get("batches"))
		if not batches:
			return []

		filters["batch_no"] = ("in", batches)

	used_serial_no = frappe.db.sql(f"""
		SELECT sb.serial_no
		FROM `tabSerial and Batch Entry` sb
		INNER JOIN `tabSerial and Batch Bundle` sbb
			ON sb.parent = sbb.name
		WHERE sbb.docstatus < 2
		AND sbb.voucher_type IN ('Sales Order', 'Delivery Schedule', 'Delivery Note')
		AND sb.serial_no IS NOT NULL
		AND sbb.item_code = %(item_code)s
	""", {
		"item_code": kwargs.item_code
	})

	if used_serial_no:
		filters["name"] = ("not in", [d[0] for d in used_serial_no])

	return frappe.get_all(
		"Serial No",
		fields=fields,
		filters=filters,
		limit=cint(kwargs.qty) or 10000000,
		order_by=order_by,
	)