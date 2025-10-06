class CustomSerialNoBatchBundleUpdate extends erpnext.SerialBatchPackageSelector {
    get_dialog_table_fields() {
        console.log("SAFAFASF");
		let fields = [];
		let me = this;

		if (this.item.has_serial_no) {
			fields.push({
				fieldtype: "Link",
				options: "Serial No",
				fieldname: "serial_no",
				label: __("Serial No"),
				in_list_view: 1,
				get_query: () => {
					return {
                        query: "sumaria_customization.overrides.sales_order.get_available_serial_nos",
						filters: this.get_serial_no_filters(),
					};
				},
			});
		}

		let batch_fields = [];
		if (this.item.has_batch_no) {
			batch_fields = [
				{
					fieldtype: "Link",
					options: "Batch",
					fieldname: "batch_no",
					label: __("Batch No"),
					in_list_view: 1,
					get_route_options_for_new_doc: () => {
						return {
							item: this.item.item_code,
						};
					},
					change() {
						let doc = this.doc;
						if (!doc.qty && me.item.type_of_transaction === "Outward") {
							me.get_batch_qty(doc.batch_no, (qty) => {
								doc.qty = qty;
								this.grid.set_value("qty", qty, doc);
							});
						}
					},
					get_query: () => {
						let is_inward = false;
						if (
							(["Purchase Receipt", "Purchase Invoice"].includes(this.frm.doc.doctype) &&
								!this.frm.doc.is_return) ||
							(this.frm.doc.doctype === "Stock Entry" &&
								this.frm.doc.purpose === "Material Receipt")
						) {
							is_inward = true;
						}

						let include_expired_batches = me.include_expired_batches();

						return {
							query: "erpnext.controllers.queries.get_batch_no",
							filters: {
								item_code: this.item.item_code,
								warehouse:
									this.item.s_warehouse || this.item.t_warehouse || this.item.warehouse,
								is_inward: is_inward,
								include_expired_batches: include_expired_batches,
							},
						};
					},
				},
			];

			if (!this.item.has_serial_no) {
				batch_fields.push({
					fieldtype: "Float",
					fieldname: "qty",
					label: __("Quantity"),
					in_list_view: 1,
				});
			}
		}

		fields = [...fields, ...batch_fields];

		fields.push({
			fieldtype: "Data",
			fieldname: "name",
			label: __("Name"),
			hidden: 1,
		});

		return fields;
	}
}

erpnext.SerialBatchPackageSelector = CustomSerialNoBatchBundleUpdate;