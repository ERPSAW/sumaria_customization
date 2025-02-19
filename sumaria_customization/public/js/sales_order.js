frappe.ui.form.on("Sales Order Item", {
    custom_additional_discount: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        row.custom_additional_discount_amount = row.price_list_rate * (row.custom_additional_discount / 100);
        frappe.model.set_value(cdt, cdn, 'discount_amount', row.custom_return_item_amount + row.custom_additional_discount_amount);
        frm.refresh_fields("items");
    },
    custom_additional_discount_amount: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        row.custom_additional_discount = (row.custom_additional_discount_amount / row.price_list_rate) * 100;
        frappe.model.set_value(cdt, cdn, 'discount_amount', row.custom_return_item_amount + row.custom_additional_discount_amount);
        frm.refresh_fields("items");
    },
    custom_return_item_rate: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, 'custom_return_item_amount', (row.custom_return_qty * row.custom_return_item_rate));

    },
    custom_return_qty: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, 'custom_return_item_amount', (row.custom_return_qty * row.custom_return_item_rate));

    },
    custom_return_item_amount: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, 'discount_amount', row.custom_return_item_amount + row.custom_additional_discount_amount);
    },
    custom_select_return_item_rate: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, "custom_return_item_rate", row.custom_select_return_item_rate);
    },
    form_render: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.custom_return_item) {
            frappe.call({
                method: 'sumaria_customization.overrides.rate_options.get_options',
                args: {
                    'item': row.custom_return_item
                },
                callback: function (response) {
                    if (response.message) {
                        frm.fields_dict.items.grid.update_docfield_property("custom_select_return_item_rate", "options", response.message);
                    }
                }
            });
        }
    },
    custom_return_item: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.custom_return_item) {
            frappe.call({
                method: 'sumaria_customization.overrides.rate_options.get_options',
                args: {
                    'item': row.custom_return_item
                },
                callback: function (response) {
                    if (response.message) {
                        frm.fields_dict.items.grid.update_docfield_property("custom_select_return_item_rate", "options", response.message);
                    }
                }
            });
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
                ]
            };
        });


    }
});