// Copyright (c) 2025, Software At Work (India) Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Delivery Schedule", {
    refresh: function (frm) {
        frm.add_custom_button('Print Delivery Notes', function () {
            frm.call({
                method: "get_details",
                doc: frm.doc,
                callback: function (r, rt) {
                    if (r.message) {
                        r.message.print_formats
                        if(!r.message.docs.length>0)
                            frappe.throw("There are no docs to print")
                        const dialog = new frappe.ui.Dialog({
                            title: __("Print Documents"),
                            fields: [
                                {
                                    fieldtype: "Select",
                                    label: __("Print Format"),
                                    fieldname: "print_sel",
                                    options: r.message.print_formats,
                                },
                            ],
                        });

                        dialog.set_primary_action(__("Print"), (args) => {
                            if (!args) return;

                            const w = window.open(
                                "/api/method/frappe.utils.print_format.download_multi_pdf?doctype=" + encodeURIComponent("Delivery Note") +
                                "&name=" + encodeURIComponent(JSON.stringify(r.message.docs)) +
                                "&format=" + encodeURIComponent(args.print_sel ? args.print_sel : "Standard") +
                                "&no_letterhead=" + ("1") +
                                "&letterhead=" + encodeURIComponent("No Letterhead") +
                                "&options=" + encodeURIComponent(`{"page-size":"A4"}`)
                            );

                            if (!w) {
                                frappe.msgprint(__("Please enable pop-ups"));
                            }

                            dialog.hide();
                        });
                        dialog.show();
                    }
                }
            });

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
