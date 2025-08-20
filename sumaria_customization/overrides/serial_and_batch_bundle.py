import frappe
import json
from erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle import add_serial_batch_ledgers as _add_serial_batch_ledgers, SerialandBatchBundle as BaseSerialAndBatchBundle

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