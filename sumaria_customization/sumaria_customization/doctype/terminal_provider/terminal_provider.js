// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Terminal Provider", {
    refresh: function (frm) {
        frm.set_query("account", function (doc, cdt, cdn) {
            var d = locals[cdt][cdn];
            return {
                filters: [
                    ['Account', 'account_type', '=', 'Receivable'],
                ]
            };
        });
    }
});
