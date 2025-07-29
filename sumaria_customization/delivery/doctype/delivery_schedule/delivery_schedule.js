// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Delivery Schedule", {
    on_submit: function (frm) {
        if (frm.doc.docstatus === 1 && frm.doc.__last_sync_on_submit !== 1) {
            frm.doc.__last_sync_on_submit = 1; // prevent duplicate calls
            print(frm);
        }
    },
    refresh: function (frm) {
        frm.add_custom_button('Print Documents', function () {
            print(frm);
        });


        frm.set_query("transporter", function (doc, cdt, cdn) {
            var d = locals[cdt][cdn];
            return {
                filters: [
                    ['Supplier', 'is_transporter', '=', 1],
                ]
            };
        });

    },
    get_deliveries: function (frm) {
        if (frm.doc.date_up_to) {
            frm.call({
                method: "get_deliveries",
                doc: frm.doc,
                callback: function (r, rt) {
                    console.log("Called");
                }
            });
        } else {
            frappe.throw("first select date");
        }
    }
});


function print(frm) {
    frm.call({
        method: "get_details",
        doc: frm.doc,
        callback: function (r, rt) {
            if (r.message) {
                if (r.message.dns.length > 0) {
                    const w1 = window.open(
                        "/api/method/frappe.utils.print_format.download_multi_pdf?doctype=" + encodeURIComponent("Delivery Note") +
                        "&name=" + encodeURIComponent(JSON.stringify(r.message.dns)) +
                        "&format=" + encodeURIComponent(r.message.dn_pf) +
                        "&no_letterhead=" + ("1") +
                        "&letterhead=" + encodeURIComponent("No Letterhead") +
                        "&options=" + encodeURIComponent(`{"page-size":"A4"}`)
                    );
                    if (!w1) {
                        frappe.msgprint(__("Please enable pop-ups"));
                    }
                }
                if (r.message.ses.length > 0) {
                    const w2 = window.open(
                        "/api/method/frappe.utils.print_format.download_multi_pdf?doctype=" + encodeURIComponent("Stock Entry") +
                        "&name=" + encodeURIComponent(JSON.stringify(r.message.ses)) +
                        "&format=" + encodeURIComponent(r.message.se_pf) +
                        "&no_letterhead=" + ("1") +
                        "&letterhead=" + encodeURIComponent("No Letterhead") +
                        "&options=" + encodeURIComponent(`{"page-size":"A4"}`)
                    );
                    if (!w2) {
                        frappe.msgprint(__("Please enable pop-ups"));
                    }
                }
                const w3 = window.open(
                    "/api/method/frappe.utils.print_format.download_multi_pdf?doctype=" + encodeURIComponent("Delivery Schedule") +
                    "&name=" + encodeURIComponent(JSON.stringify([frm.doc.name])) +
                    "&format=" + encodeURIComponent(r.message.ds_pf) +
                    "&no_letterhead=" + ("1") +
                    "&letterhead=" + encodeURIComponent("No Letterhead") +
                    "&options=" + encodeURIComponent(`{"page-size":"A4"}`)
                );
                if (!w3) {
                    frappe.msgprint(__("Please enable pop-ups"));
                }

            }
        }
    });

}


frappe.ui.form.on("Delivery Schedule Delivery Item", {
    pick_serial_batch_no(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.type_of_transaction = "Outward";

        let dialogHandler = new SerialBatchDialog(frm, row);
    }
});

frappe.ui.form.on("Delivery Schedule Transfer Item", {
	pick_serial_batch_no(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.type_of_transaction = "Outward";

        let dialogHandler = new SerialBatchDialog(frm, row);
    }
})

class SerialBatchDialog {
    constructor(frm, row) {
        this.frm = frm;
        this.row = row;
		this.make();
		this.render_data();
    }

    make(){
        this.row.item_code = this.row.item;
        let label = this.row?.has_serial_no ? __("Serial Nos") : __("Batch Nos");
		let primary_label = this.row.serial_and_batch_bundle ? __("Update") : __("Add");

		if (this.row?.has_serial_no && this.row?.has_batch_no) {
			label = __("Serial Nos / Batch Nos");
		}

		primary_label += " " + label;

		if (!this.row.has_batch_no && !this.row.has_serial_no) {
			return frappe.msgprint(__("Item has no Serial Nos or Batch Nos"));
		}

		this.dialog = new frappe.ui.Dialog({
			title: primary_label,
			size: "large",
			fields: this.get_dialog_fields(),
			primary_action_label: primary_label,
			primary_action: () => this.update_bundle_entries()
		});

		this.dialog.show();
		this.$scan_btn = this.dialog.$wrapper.find(".link-btn");
		this.$scan_btn.css("display", "inline");

		let qty = this.row.qty;

		qty = Math.abs(qty);
		if (qty > 0 && !this.row.serial_and_batch_bundle) {
			this.dialog.set_value("qty", qty).then(() => {
				if (this.row.serial_no && !this.row.serial_and_batch_bundle) {
					let serial_nos = this.row.serial_no.split("\n");
					if (serial_nos.length > 1) {
						serial_nos.forEach((serial_no) => {
							this.dialog.fields_dict.entries.df.data.push({
								serial_no: serial_no,
								batch_no: this.row.batch_no,
							});
						});
					} else {
						this.dialog.set_value("scan_serial_no", this.row.serial_no);
					}
					frappe.model.set_value(this.row.doctype, this.row.name, "serial_no", "");
				} else if (this.row.batch_no && !this.row.serial_and_batch_bundle) {
					this.dialog.set_value("scan_batch_no", this.row.batch_no);
					frappe.model.set_value(this.row.doctype, this.row.name, "batch_no", "");
				}

				this.dialog.fields_dict.entries.grid.refresh();
			});
		}
    }

    get_dialog_fields(){
        let fields = [];

		fields.push({
			fieldtype: "Link",
			fieldname: "warehouse",
			label: __("Warehouse"),
			options: "Warehouse",
			default: this.row.delivery_source_warehouse || this.row.s_warehouse,
			read_only: 1,
			onchange: () => {
                this.row.delivery_source_warehouse = this.dialog.get_value("warehouse");
				this.get_auto_data();
			},
			get_query: () => {
				return {
					filters: {
						is_group: 0,
						company: this.frm.doc.company,
					},
				};
			},
		});

		fields.push({
			fieldtype: "Column Break",
		});

		if (this.row.has_serial_no) {
			fields.push({
				fieldtype: "Data",
				options: "Barcode",
				fieldname: "scan_serial_no",
				label: __("Scan Serial No"),
				get_query: () => {
					return {
						filters: this.get_serial_no_filters(),
					};
				},
				onchange: () => this.scan_barcode_data(),
			});
		}

		if (this.row.has_batch_no && !this.row.has_serial_no) {
			fields.push({
				fieldtype: "Data",
				options: "Barcode",
				fieldname: "scan_batch_no",
				label: __("Scan Batch No"),
				onchange: () => this.scan_barcode_data(),
			});
		}

		if (this.row?.type_of_transaction === "Outward") {
			fields = [...this.get_filter_fields(), ...fields];
		}

		fields.push({
			fieldtype: "Section Break",
			depends_on: "eval:doc.enter_manually !== 1 || doc.entries?.length > 0",
		});

		fields.push({
			fieldname: "entries",
			fieldtype: "Table",
			allow_bulk_edit: true,
			depends_on: "eval:doc.enter_manually !== 1 || doc.entries?.length > 0",
			data: [],
			fields: this.get_dialog_table_fields(),
		});

		return fields;
    }

    get_dialog_table_fields() {
		let fields = [];
		let me = this;

		if (this.row.has_serial_no) {
			fields.push({
				fieldtype: "Link",
				options: "Serial No",
				fieldname: "serial_no",
				label: __("Serial No"),
				in_list_view: 1,
				get_query: () => {
					return {
						filters: this.get_serial_no_filters(),
					};
				},
			});
		}

		let batch_fields = [];
		if (this.row.has_batch_no) {
			batch_fields = [
				{
					fieldtype: "Link",
					options: "Batch",
					fieldname: "batch_no",
					label: __("Batch No"),
					in_list_view: 1,
					get_route_options_for_new_doc: () => {
						return {
							item: this.row.item_code,
						};
					},
					change() {
						let doc = this.row;
						if (!doc.qty && doc.type_of_transaction === "Outward") {
							me.get_batch_qty(doc.batch_no, (qty) => {
								doc.qty = qty;
								this.grid.set_value("qty", qty, doc);
							});
						}
					},
					get_query: () => {
						let is_inward = false;

						let include_expired_batches = me.include_expired_batches();

						return {
							query: "erpnext.controllers.queries.get_batch_no",
							filters: {
								item_code: this.row.item_code,
								warehouse:
									this.row.delivery_source_warehouse || this.row.s_warehouse ,
								is_inward: is_inward,
								include_expired_batches: include_expired_batches,
							},
						};
					},
				},
			];

			if (!this.row.has_serial_no) {
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

    include_expired_batches() {
		return (
			this.frm.doc.doctype === "Stock Reconciliation" ||
			(this.frm.doc.doctype === "Stock Entry" &&
				["Material Receipt", "Material Transfer", "Material Issue"].includes(this.frm.doc.purpose))
		);
	}

    get_serial_no_filters() {
		let warehouse =
			this.row?.type_of_transaction === "Outward" ? this.row.delivery_source_warehouse || this.row.s_warehouse : "";

		return {
			item_code: this.row.item_code,
			warehouse: ["=", warehouse],
		};
	}

    scan_barcode_data() {
		const { scan_serial_no, scan_batch_no } = this.dialog.get_values();

		this.dialog.set_value("enter_manually", 0);

		if (scan_serial_no || scan_batch_no) {
			frappe.call({
				method: "erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.is_serial_batch_no_exists",
				args: {
					item_code: this.row.item_code,
					type_of_transaction: this.row.type_of_transaction,
					serial_no: scan_serial_no,
					batch_no: scan_batch_no,
				},
				callback: (r) => {
					this.update_serial_batch_no();
				},
			});
		}
	}

    update_serial_batch_no() {
		const { scan_serial_no, scan_batch_no } = this.dialog.get_values();

		if (scan_serial_no) {
			let existing_row = this.dialog.fields_dict.entries.df.data.filter((d) => {
				if (d.serial_no === scan_serial_no) {
					return d;
				}
			});

			if (existing_row?.length) {
				frappe.throw(__("Serial No {0} already exists", [scan_serial_no]));
			}

			if (!this.row.has_batch_no) {
				this.dialog.fields_dict.entries.df.data.push({
					serial_no: scan_serial_no,
				});

				this.dialog.fields_dict.scan_serial_no.set_value("");
			} else {
				frappe.call({
					method: "erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_batch_no_from_serial_no",
					args: {
						serial_no: scan_serial_no,
					},
					callback: (r) => {
						this.dialog.fields_dict.entries.df.data.push({
							serial_no: scan_serial_no,
							batch_no: r.message,
						});

						this.dialog.fields_dict.scan_serial_no.set_value("");
						this.dialog.fields_dict.entries.grid.refresh();
					},
				});
			}
		} else if (scan_batch_no) {
			let existing_row = this.dialog.fields_dict.entries.df.data.filter((d) => {
				if (d.batch_no === scan_batch_no) {
					return d;
				}
			});

			if (existing_row?.length) {
				existing_row[0].qty += 1;
			} else {
				this.dialog.fields_dict.entries.df.data.push({
					batch_no: scan_batch_no,
					qty: 1,
				});
			}

			this.dialog.fields_dict.scan_batch_no.set_value("");
		}

		this.dialog.fields_dict.entries.grid.refresh();
	}

    get_filter_fields() {
		return [
			{
				fieldtype: "Section Break",
				label: __("Auto Fetch"),
			},
			{
				fieldtype: "Float",
				fieldname: "qty",
				label: __("Qty to Fetch"),
				read_only: 1,
				onchange: () => this.get_auto_data(),
			},
			{
				fieldtype: "Column Break",
			},
			{
				fieldtype: "Select",
				options: ["FIFO", "LIFO", "Expiry"],
				default: "FIFO",
				fieldname: "based_on",
				label: __("Fetch Based On"),
				onchange: () => this.get_auto_data(),
			},
			{
				fieldtype: "Section Break",
			},
		];
	}

    get_auto_data() {
		let { qty, based_on } = this.dialog.get_values();

		if (this.row.serial_and_batch_bundle) {
			if (this.qty && qty === Math.abs(this.qty)) {
				return;
			}
		}

		if (this.row.serial_no || this.row.batch_no) {
			return;
		}

		if (!based_on) {
			based_on = "FIFO";
		}

		let warehouse = this.row.delivery_source_warehouse || this.row.s_warehouse;

		if (qty) {
			frappe.call({
				method: "erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_auto_data",
				args: {
					item_code: this.row.item_code,
					warehouse: warehouse,
					has_serial_no: this.row.has_serial_no,
					has_batch_no: this.row.has_batch_no,
					qty: qty,
					based_on: based_on,
					posting_date: frappe.datetime.now_date(),
					posting_time: frappe.datetime.now_time(),
				},
				callback: (r) => {
					if (r.message) {
						this.dialog.fields_dict.entries.df.data = r.message;
						this.dialog.fields_dict.entries.grid.refresh();
					}
				},
			});
		}
	}

    render_data() {
		if (this.row.serial_and_batch_bundle) {
			frappe
				.call({
					method: "erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_serial_batch_ledgers",
					args: {
						item_code: this.row.item_code,
						name: this.row.serial_and_batch_bundle,
						voucher_no: !this.frm.is_new() ? this.row.parent : "",
						child_row: this.frm.doc.is_return ? this.row : "",
					},
				})
				.then((r) => {
					if (r.message) {
						this.set_data(r.message);
					}
				});
		}
	}

    set_data(data) {
		data.forEach((d) => {
			d.qty = Math.abs(d.qty);
			d.name = d.child_row || d.name;
			this.dialog.fields_dict.entries.df.data.push(d);
		});

		this.dialog.fields_dict.entries.grid.refresh();
		if (this.dialog.fields_dict.entries.df.data?.length) {
			this.dialog.set_value("enter_manually", 0);
		}
	}

	update_bundle_entries() {
		let entries = this.dialog.get_values().entries;
		let warehouse = this.dialog.get_value("warehouse");
		let upload_serial_nos = this.dialog.get_value("upload_serial_nos");

		if (!entries?.length && upload_serial_nos) {
			this.create_serial_nos();
			return;
		}

		if ((entries && !entries.length) || !entries) {
			frappe.throw(__("Please add atleast one Serial No / Batch No"));
		}

		if (!warehouse) {
			frappe.throw(__("Please select a Warehouse"));
		}

		let total_qty = 0;

		entries.forEach((d) => {
			total_qty += d.qty || 1;
		})
		
		if (this.row.qty !== total_qty) {
			frappe.throw(__("Total Qty should be Equal to " + this.row.qty));
		}

		frappe
			.call({
				method: "erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.add_serial_batch_ledgers",
				args: {
					entries: entries,
					child_row: this.row,
					doc: this.frm.doc,
					warehouse: warehouse
				},
			})
			.then((r) => {
				frappe.run_serially([
					() => this.dialog.hide(),
					() => {
						frappe.model.set_value(this.row.doctype, this.row.name, "serial_and_batch_bundle", r.message.name);
					},
					() => this.frm.save(),
				]);
			});
	}
}
