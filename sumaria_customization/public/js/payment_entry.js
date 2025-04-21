
frappe.ui.form.on("Payment Entry Reference", {
    allocated_amount: function (frm, cdt, cdn) {
        calculate_paid(frm);
    },
    references_add: function (frm, cdt, cdn) {
        calculate_paid(frm);
    },
    references_remove: function (frm, cdt, cdn) {
        calculate_paid(frm);
    },
})
function calculate_paid(frm) {
    if (frm.doc.mode_of_payment != "Consumer Finance") {
        let total = 0;
        $.each(frm.doc.references, function (idx, row) {
            total += row.allocated_amount;
        });
        if (total)
            frm.set_value("paid_amount", total);
        if (frm.doc.mode_of_payment == "Credit Card") 
            frm.set_value("custom_swipe_amount", total);

    }
}
frappe.ui.form.on("Payment Entry", {
    after_save: function (frm) {
        if (frm.doc.mode_of_payment == "Consumer Finance" || frm.doc.mode_of_payment == "Credit Card") {
            frappe.set_route("Form", "Journal Entry", frm.doc.remarks);
        }
    },
    mode_of_payment: function (frm) {
        if (frm.doc.mode_of_payment != "Consumer Finance") {
            let docs = []
            let types = []
            for (var i in frm.doc.references) {
                types.push(frm.doc.references[i].reference_doctypes);
                docs.push(frm.doc.references[i].reference_name);
            }
            frappe.call({
                method: 'sumaria_customization.overrides.finance.get_details',
                args: {
                    types: types,
                    docs: docs
                },
                callback: function (response) {
                    if (response.message) {
                        frm.set_value('custom_product_price', response.message.price);
                    }
                },
            });

        }
    },
    party: function (frm) {
        frm.clear_table("references");

        if (!frm.doc.party) {
            return;
        }
        var company_currency = frappe.get_doc(":Company", frm.doc.company).default_currency;

        var args = {
            posting_date: frm.doc.posting_date,
            company: frm.doc.company,
            party_type: frm.doc.party_type,
            payment_type: frm.doc.payment_type,
            party: frm.doc.party,
            party_account: frm.doc.payment_type == "Receive" ? frm.doc.paid_from : frm.doc.paid_to,
            cost_center: frm.doc.cost_center,
        };

        return frappe.call({
            method: "sumaria_customization.overrides.payment_entry.get_refs",
            args: {
                args: args,
            },
            callback: function (r, rt) {
                if (r.message) {
                    var total_positive_outstanding = 0;
                    var total_negative_outstanding = 0;
                    var total = 0;
                    for (var i in r.message) {
                        total += r.message[i].outstanding_amount;
                    }
                    frm.set_value("paid_amount", total);
                    if (frm.doc.mode_of_payment == "Credit Card") 
                        frm.set_value("custom_swipe_amount", total);
                    $.each(r.message, function (i, d) {
                        var c = frm.add_child("references");
                        c.reference_doctype = d.voucher_type;
                        c.reference_name = d.voucher_no;
                        c.due_date = d.due_date;
                        c.total_amount = d.invoice_amount;
                        c.outstanding_amount = d.outstanding_amount;
                        c.bill_no = d.bill_no;
                        c.payment_term = d.payment_term;
                        c.payment_term_outstanding = d.payment_term_outstanding;
                        c.allocated_amount = d.outstanding_amount;
                        c.account = d.account;


                        if (!in_list(frm.events.get_order_doctypes(frm), d.voucher_type)) {
                            if (flt(d.outstanding_amount) > 0)
                                total_positive_outstanding += flt(d.outstanding_amount);
                            else total_negative_outstanding += Math.abs(flt(d.outstanding_amount));
                        }

                        var party_account_currency =
                            frm.doc.payment_type == "Receive"
                                ? frm.doc.paid_from_account_currency
                                : frm.doc.paid_to_account_currency;

                        if (party_account_currency != company_currency) {
                            c.exchange_rate = d.exchange_rate;
                        } else {
                            c.exchange_rate = 1;
                        }
                        if (in_list(frm.events.get_invoice_doctypes(frm), d.reference_doctype)) {
                            c.due_date = d.due_date;
                        }
                    });
                }

            },
        });
    },
    custom_down_payment: function (frm) {
        calculate_finance(frm);
    },
    custom_product_price: function (frm) {
        calculate_finance(frm);
    },
    custom_dealer_interest_subsidy: function (frm) {
        calculate_finance(frm);
    },
    custom_dis_paid_by_customer: function (frm) {
        calculate_finance(frm);
    },
    custom_dis_included_in_down_payment: function (frm) {
        calculate_finance(frm);
    },
    custom_swipe_amount: function (frm) {
        calculate_credit_card(frm);
    },
    custom_instant_cash_discount: function (frm) {
        calculate_credit_card(frm);
    },
    custom_interest_subvention: function (frm) {
        calculate_credit_card(frm);
    },
});
function calculate_finance(frm) {
    if (frm.doc.mode_of_payment == "Consumer Finance") {
        disbursement_amount = frm.doc.custom_product_price - frm.doc.custom_dealer_interest_subsidy - frm.doc.custom_down_payment;
        frm.set_value('custom_disbursement_amount', disbursement_amount);
        frm.set_value('paid_amount', frm.doc.custom_down_payment);
        if ((frm.doc.custom_dealer_interest_subsidy / frm.doc.custom_product_price) * 100 > 3.54) {
            frm.set_value('custom_finance_charges', frm.doc.custom_dealer_interest_subsidy);
        }
        else {
            frm.set_value('custom_finance_charges', frm.doc.custom_product_price * 0.0354);
        }
    }
}

function calculate_credit_card(frm) {
    if (frm.doc.mode_of_payment == "Credit Card") {
        let paid_amount = frm.doc.custom_swipe_amount - frm.doc.custom_instant_cash_discount - frm.doc.custom_interest_subvention;
        frm.set_value('paid_amount', paid_amount);
    }
}