// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Delivery Schedule", {
    refresh: function (frm) {
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
