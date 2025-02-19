// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Return Item Rate", {
refresh:function(frm) {
        frm.set_query("item_code", function (doc, cdt, cdn) {
            var d = locals[cdt][cdn];
            return {
                filters: [
                    ['Item', 'custom_is_return_item', '=', 1],
                ]
            };
        });
},
});
