// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Delivery Schedule", {
    on_submit: function (frm) {
        if (frm.doc.docstatus === 1 && frm.doc.__last_sync_on_submit !== 1) {
            frm.doc.__last_sync_on_submit = 1; // prevent duplicate calls
            print(frm);
        }
    },
    refresh: function (frm) {
        frm.add_custom_button('Print Documents', function () {
            print(frm);
        });


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


function print(frm) {
    frm.call({
        method: "get_details",
        doc: frm.doc,
        callback: function (r, rt) {
            if (r.message) {
                if (r.message.dns.length > 0) {
                    const w1 = window.open(
                        "/api/method/frappe.utils.print_format.download_multi_pdf?doctype=" + encodeURIComponent("Delivery Note") +
                        "&name=" + encodeURIComponent(JSON.stringify(r.message.dns)) +
                        "&format=" + encodeURIComponent(r.message.dn_pf) +
                        "&no_letterhead=" + ("1") +
                        "&letterhead=" + encodeURIComponent("No Letterhead") +
                        "&options=" + encodeURIComponent(`{"page-size":"A4"}`)
                    );
                    if (!w1) {
                        frappe.msgprint(__("Please enable pop-ups"));
                    }
                }
                if (r.message.ses.length > 0) {
                    const w2 = window.open(
                        "/api/method/frappe.utils.print_format.download_multi_pdf?doctype=" + encodeURIComponent("Stock Entry") +
                        "&name=" + encodeURIComponent(JSON.stringify(r.message.ses)) +
                        "&format=" + encodeURIComponent(r.message.se_pf) +
                        "&no_letterhead=" + ("1") +
                        "&letterhead=" + encodeURIComponent("No Letterhead") +
                        "&options=" + encodeURIComponent(`{"page-size":"A4"}`)
                    );
                    if (!w2) {
                        frappe.msgprint(__("Please enable pop-ups"));
                    }
                }
                const w3 = window.open(
                    "/api/method/frappe.utils.print_format.download_multi_pdf?doctype=" + encodeURIComponent("Delivery Schedule") +
                    "&name=" + encodeURIComponent(JSON.stringify([frm.doc.name])) +
                    "&format=" + encodeURIComponent(r.message.ds_pf) +
                    "&no_letterhead=" + ("1") +
                    "&letterhead=" + encodeURIComponent("No Letterhead") +
                    "&options=" + encodeURIComponent(`{"page-size":"A4"}`)
                );
                if (!w3) {
                    frappe.msgprint(__("Please enable pop-ups"));
                }

            }
        }
    });

}
