// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Discount Approval Matrix", {
	refresh:function(frm) {
        frm.set_query("role", "details", function (doc, cdt, cdn) {
            var d = locals[cdt][cdn];
            return {
                filters: [
                    ['Role', 'disabled', '=', 0],
                ]
            };
        });
	},
});

