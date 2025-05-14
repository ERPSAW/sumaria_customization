// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Delivery Schedule", {
    get_deliveries: function (frm) {
        if (frm.doc.date_up_to) {
            frm.call({
                method: "get_deliveries",
                doc: frm.doc,
                callback: function (r, rt) {
                    console.log("Called");
                }
            });
        }else{
            frappe.throw("first select date");
        }
    }
});
