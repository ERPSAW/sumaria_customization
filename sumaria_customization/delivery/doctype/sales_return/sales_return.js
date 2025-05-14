// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Sales Return", {
    refresh: function (frm) {
        cur_frm.set_query("sales_order", function (doc, cdt, cdn) {
			var d = locals[cdt][cdn];
			return {
				filters: [
					['Sales Order', 'docstatus', '=', 1],
				]
			};
		});
    },
    sales_order: function (frm) {
        if(frm.doc.sales_order){
            frm.call({
                method: "get_items",
                doc: frm.doc,
                callback: function (r, rt) {
                    console.log("Called");
                }
            });

        }
    }
});
