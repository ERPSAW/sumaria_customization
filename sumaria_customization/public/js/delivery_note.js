frappe.ui.form.on("Delivery Note Item", {
    price_list_rate: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        row.custom_additional_discount_amount = row.price_list_rate * (row.custom_additional_discount / 100);
        frappe.model.set_value(cdt, cdn, 'discount_amount', row.custom_return_item_amount + row.custom_additional_discount_amount);
        frm.refresh_fields("items");
    },
});