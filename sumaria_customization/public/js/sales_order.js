frappe.ui.form.on("Sales Order Item", {
    price_list_rate: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        row.custom_additional_discount_amount = row.price_list_rate * (row.custom_additional_discount / 100);
        frappe.model.set_value(cdt, cdn, 'discount_amount', row.custom_return_item_amount + row.custom_additional_discount_amount);
        frm.refresh_fields("items");
    },
    qty: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.qty < row.custom_return_qty)
            frappe.throw("return quantity cannot be greater than item quantity");
    },
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
        if (row.qty < row.custom_return_qty)
            frappe.throw("return quantity cannot be greater than item quantity");
        frappe.model.set_value(cdt, cdn, 'custom_return_item_amount', (row.custom_return_qty * row.custom_return_item_rate));

    },
    custom_return_item_amount: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, 'discount_amount', row.custom_return_item_amount + row.custom_additional_discount_amount);
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
                }
            }
        });
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
    }
});