frappe.ui.form.on("Sales Order Item", {
    item_code: function (frm, cdt, cdn) {
        update_price(frm, cdt, cdn);
        var row = locals[cdt][cdn];
        if (row.item_code) {   
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Item",
                    filters: {
                        name: row.item_code,
                    },
                    fieldname: ["has_batch_no", "has_serial_no"],
                },
                callback: function (r) {
                    if (r.message) {
                        frappe.model.set_value(cdt, cdn, "custom_has_batch_no", r.message.has_batch_no);
                        frappe.model.set_value(cdt, cdn, "custom_has_serial_no", r.message.has_serial_no);
                    }
                },
            })
        }
    },
    qty: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.custom_is_return) {
            if (row.qty > 1) {
                frappe.model.set_value(cdt, cdn, 'qty', 1);
                frappe.throw("As Has Buyback is enable only one item is allowed on one Row. In case of more than 1 sales Item add the item on next row");
            }
            frappe.model.set_value(cdt, cdn, 'custom_return_qty', row.qty);
            update_price(frm, cdt, cdn);
        }
    },
    price_list_rate: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (!row.custom_is_return && row.price_list_rate != row.custom_item_price) {
            frappe.model.set_value(cdt, cdn, 'price_list_rate', row.custom_item_price);
        }
    },
    custom_is_return: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.custom_is_return) {
            if (row.qty > 1) {
                frappe.msgprint("Buyback can only be selected if the new item quantity is 1")
                frappe.model.set_value(cdt, cdn, 'custom_is_return', 0);
            }
        }
    },
    custom_item_price: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.custom_is_return) {
            frappe.model.set_value(cdt, cdn, 'price_list_rate', row.custom_item_price - row.custom_return_item_rate);
        }
    },
    custom_return_item_rate: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, 'custom_return_item_amount', (row.custom_return_qty * row.custom_return_item_rate));

    },
    custom_return_qty: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.qty != row.custom_return_qty)
            frappe.throw("return quantity should be same as item quantity");
        frappe.model.set_value(cdt, cdn, 'custom_return_item_amount', (row.custom_return_qty * row.custom_return_item_rate));

    },
    custom_return_item: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.call({
            method: "sumaria_customization.overrides.item_price.get_rate",
            args: {
                item_code: row.custom_return_item,
                price_list: frm.doc.selling_price_list,
                transaction_date: frm.doc.transaction_date,
            },
            callback: function (r) {
                if (!r.exc) {
                    frappe.model.set_value(cdt, cdn, "custom_return_item_rate", r.message.price_list_rate)
                    frappe.model.set_value(cdt, cdn, 'price_list_rate', row.custom_item_price - row.custom_return_item_rate);
                    frappe.model.set_value(cdt, cdn, "margin_type", "Amount")
                    frappe.model.set_value(cdt, cdn, "margin_rate_or_amount", row.custom_return_item_rate)
                }
            }
        });
    },
    discount_percentage: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, 'custom_additional_discount', row.discount_percentage);
        frappe.model.set_value(cdt, cdn, 'custom_additional_discount_amount', (row.discount_percentage / 100) * row.price_list_rate);
    },
    discount_amount: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, 'custom_additional_discount_amount', row.discount_amount);
        frappe.model.set_value(cdt, cdn, 'custom_additional_discount', (row.discount_amount / row.price_list_rate) * 100);
    },

    custom_pick_serial__batch_no(frm, cdt, cdn) {
		if (frm.is_new()){
			frappe.msgprint(__("Please save the Sales Order first"));
			return;
		}
        if (frm.doc.docstatus == 0) {
            let row = locals[cdt][cdn];
            row.type_of_transaction = "Outward";
    
            let dialogHandler = new SerialBatchDialog(frm, row);
        }
    }

});
frappe.ui.form.on("Sales Order", {
    refresh: function (frm) {
        frm.set_query("custom_return_item", "items", function (doc, cdt, cdn) {
            var d = locals[cdt][cdn];
            return {
                filters: [
                    ['Item', 'custom_is_return_item', '=', 1],
                    ['Item', 'custom_buy_back_item_group', '=', d.custom_return_item_group],
                ]
            };
        });
        frm.set_query("item_code", "items", function (doc, cdt, cdn) {
            var d = locals[cdt][cdn];
            return {
                filters: [
                    ['Item', 'custom_is_return_item', '=', 0],
                    ['Item', 'is_sales_item', '=', 1],
                    ['Item', 'has_variants', '=', 0],
                ]
            };
        });
    },
    onload_post_render: function (frm) {
        frm.set_query("item_code", "items", function (doc, cdt, cdn) {
            var d = locals[cdt][cdn];
            return {
                filters: [
                    ['Item', 'custom_is_return_item', '=', 0],
                    ['Item', 'is_sales_item', '=', 1],
                    ['Item', 'has_variants', '=', 0],
                ]
            };
        });
    },
    validate: async function (frm) {
        if (frm.is_new()) {
            for (let i = 0; i < frm.doc.items.length; i++) {
                const item_code = frm.doc.items[i].item_code;
                if (item_code) {
                    try {
                        const r = await frappe.call({
                            method: "frappe.client.get_value",
                            args: {
                                doctype: "Item",
                                filters: { name: item_code },
                                fieldname: ["has_batch_no", "has_serial_no"]
                            }
                        });

                        if (r.message) {
                            frappe.model.set_value(
                                "Sales Order Item",
                                frm.doc.items[i].name,
                                "custom_has_batch_no",
                                r.message.has_batch_no
                            );
                            frappe.model.set_value(
                                "Sales Order Item",
                                frm.doc.items[i].name,
                                "custom_has_serial_no",
                                r.message.has_serial_no
                            );
                        }
                    } catch (err) {
                        console.error(`Error fetching item ${item_code}:`, err);
                    }
                }
            }
            frm.refresh_field("items");
        }
    }
});


function update_price(frm, cdt, cdn) {
    var item = frappe.get_doc(cdt, cdn);
    var update_stock = 0, show_batch_dialog = 0;

    item.weight_per_unit = 0;
    item.weight_uom = '';
    item.conversion_factor = 0;

    if (item.item_code || item.serial_no) {
        item.pricing_rules = ''
        return frm.call({
            method: "erpnext.stock.get_item_details.get_item_details",
            child: item,
            args: {
                doc: frm.doc,
                args: {
                    item_code: item.item_code,
                    barcode: item.barcode,
                    serial_no: item.serial_no,
                    batch_no: item.batch_no,
                    set_warehouse: frm.doc.set_warehouse,
                    warehouse: item.warehouse,
                    customer: frm.doc.customer || me.frm.doc.party_name,
                    quotation_to: frm.doc.quotation_to,
                    supplier: frm.doc.supplier,
                    currency: frm.doc.currency,
                    is_internal_supplier: frm.doc.is_internal_supplier,
                    is_internal_customer: frm.doc.is_internal_customer,
                    update_stock: update_stock,
                    conversion_rate: frm.doc.conversion_rate,
                    price_list: frm.doc.selling_price_list || me.frm.doc.buying_price_list,
                    price_list_currency: frm.doc.price_list_currency,
                    plc_conversion_rate: frm.doc.plc_conversion_rate,
                    company: frm.doc.company,
                    order_type: frm.doc.order_type,
                    is_pos: cint(frm.doc.is_pos),
                    is_return: cint(frm.doc.is_return),
                    is_subcontracted: frm.doc.is_subcontracted,
                    ignore_pricing_rule: frm.doc.ignore_pricing_rule,
                    doctype: frm.doc.doctype,
                    name: frm.doc.name,
                    project: item.project || frm.doc.project,
                    qty: item.qty || 1,
                    net_rate: item.rate,
                    base_net_rate: item.base_net_rate,
                    stock_qty: item.stock_qty,
                    conversion_factor: item.conversion_factor,
                    weight_per_unit: item.weight_per_unit,
                    uom: item.uom,
                    weight_uom: item.weight_uom,
                    manufacturer: item.manufacturer,
                    stock_uom: item.stock_uom,
                    pos_profile: cint(frm.doc.is_pos) ? me.frm.doc.pos_profile : '',
                    cost_center: item.cost_center,
                    tax_category: frm.doc.tax_category,
                    item_tax_template: item.item_tax_template,
                    child_doctype: item.doctype,
                    child_docname: item.name,
                    is_old_subcontracting_flow: frm.doc.is_old_subcontracting_flow,
                    use_serial_batch_fields: item.use_serial_batch_fields,
                    serial_and_batch_bundle: item.serial_and_batch_bundle,
                }
            },

            callback: function (r) {
                if (!r.exc) {
                    frappe.model.set_value(cdt, cdn, "custom_item_price", r.message.custom_item_price)
                }
            }
        });

    }
}


class SerialBatchDialog {
    constructor(frm, row) {
        this.frm = frm;
        this.row = row;
		this.make();
		this.render_data();
    }

    make(){
        this.row.has_serial_no = this.row.custom_has_serial_no;
        this.row.has_batch_no = this.row.custom_has_batch_no;
        let label = this.row?.has_serial_no ? __("Serial Nos") : __("Batch Nos");
		let primary_label = this.row.custom_serial_and_batch_bundle ? __("Update") : __("Add");

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
		if (qty > 0 && !this.row.custom_serial_and_batch_bundle) {
			this.dialog.set_value("qty", qty).then(() => {
				if (this.row.serial_no && !this.row.custom_serial_and_batch_bundle) {
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
				} else if (this.row.batch_no && !this.row.custom_serial_and_batch_bundle) {
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
			default: this.row.warehouse || this.row.s_warehouse,
			onchange: () => {
                this.row.warehouse = this.dialog.get_value("warehouse");
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
						query: "sumaria_customization.overrides.sales_order.get_available_serial_nos",
						filters: this.get_serial_no_filters(),
					};
				},
				onchange: () => {
					let dialog_values = this.dialog.get_values();

					if (!dialog_values.warehouse && dialog_values.entries[0].serial_no) {
						frappe.call({
							method: "sumaria_customization.overrides.sales_order.get_warehouse_from_serial_no",
							args: {
								serial_no: dialog_values.entries[0].serial_no,
							},
							callback: (r) => {
								if (r.message) {
									this.dialog.set_value("warehouse", r.message);
									this.row.warehouse = r.message;
								}
							},
						})
					}
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
									this.row.warehouse || this.row.s_warehouse ,
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
			this.row?.type_of_transaction === "Outward" ? this.dialog.get_value("warehouse") || '' : "";

		let filters = {
			item_code: this.row.item_code,
		}

		if (warehouse) {
			filters.warehouse = warehouse;
		}
		return filters
	}

    scan_barcode_data() {
		const { scan_serial_no, scan_batch_no } = this.dialog.get_values();

		this.dialog.set_value("enter_manually", 0);

		if (scan_serial_no || scan_batch_no) {
			frappe.call({
				method: "sumaria_customization.overrides.serial_and_batch_bundle.is_serial_batch_no_exists",
				args: {
					item_code: this.row.item_code,
					type_of_transaction: this.row.type_of_transaction,
					serial_no: scan_serial_no,
					batch_no: scan_batch_no,
					warehouse: this.row.warehouse
				},
				callback: (r) => {
					if(r.message.status == "success" || this.dialog.fields_dict.entries.df.data.length == 0){
						this.row.warehouse = r.message.warehouse;
						this.dialog.set_value("warehouse", r.message.warehouse);
					} else if (r.message.status == "error") {
						frappe.throw(r.message.message);
					}
				},
			})
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

		if (this.row.custom_serial_and_batch_bundle) {
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

		let warehouse = this.row.warehouse || this.row.s_warehouse;

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
		if (this.row.custom_serial_and_batch_bundle) {
			frappe
				.call({
					method: "erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_serial_batch_ledgers",
					args: {
						item_code: this.row.item_code,
						name: this.row.custom_serial_and_batch_bundle,
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
						frappe.model.set_value(this.row.doctype, this.row.name, "custom_serial_and_batch_bundle", r.message.name);
					},
					() => this.frm.save(),
				]);
			});
	}
}
