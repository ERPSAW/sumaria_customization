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
frappe.ui.form.on("Discount Approval Matrix Detail", {
    details_add:function(frm,cdt,cdn){
        previous = 0
        $.each(frm.doc.details,function(idx,row){
            frappe.model.set_value(row.doctype,row.name,'discount_from',previous);
            previous = row.discount;
        });
    }
});

