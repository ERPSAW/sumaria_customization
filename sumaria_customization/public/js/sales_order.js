frappe.ui.form.on("Sales Order Item", {
    item_code: function (frm, cdt, cdn) {
        update_price(frm, cdt, cdn);
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
        if (row.custom_is_retur) {
            frappe.model.set_value(cdt, cdn, 'custom_return_qty', 1);
            frappe.model.set_value(cdt, cdn, 'qty', 1);
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