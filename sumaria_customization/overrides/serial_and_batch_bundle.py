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

		super().on_trash()

	
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