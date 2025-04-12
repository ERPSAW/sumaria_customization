
frappe.ui.form.on("Payment Entry", {
    custom_is_financed: function (frm) {
        if (frm.doc.custom_is_financed) {
            let orders = []
            for(var i in frm.doc.references){
                if(frm.doc.references[i].reference_doctype = 'Sales Order')
                    orders.push(frm.doc.references[i].reference_name);
            }
            frappe.call({
                method: 'sumaria_customization.overrides.finance.get_details',
                args: {
                    orders: orders
                },
                callback: function (response) {
                    if(response.message){
                        frm.set_value('custom_product_price', response.message.price);
                        frm.set_value('custom_dealer_interest_subsidy', response.message.fee);
                        if(response.message.fee > 0)
                            frm.set_value('custom_dis_paid_by_customer', 1);
                        else
                            frm.set_value('custom_dis_paid_by_customer', 0);
                    }
                },
            });

        }
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
    }
});
function calculate_finance(frm) {
    if (frm.doc.custom_is_financed) {
        if(frm.doc.custom_dis_paid_by_customer)
            disbursement_amount = frm.doc.custom_product_price - frm.doc.custom_down_payment;
        else
            disbursement_amount = frm.doc.custom_product_price - frm.doc.custom_dealer_interest_subsidy - frm.doc.custom_down_payment;
        frm.set_value('custom_disbursement_amount', disbursement_amount);
        if (frm.doc.custom_dis_paid_by_customer)
            if(frm.doc.custom_dis_included_in_down_payment == "Yes")
                frm.set_value('paid_amount', frm.doc.custom_down_payment);
            else
                frm.set_value('paid_amount', frm.doc.custom_down_payment + frm.doc.custom_dealer_interest_subsidy);
        else
            frm.set_value('paid_amount', frm.doc.custom_down_payment);

    }
}

function calculate_credit_card(frm){
    if (frm.doc.mode_of_payment == "Credit Card") {
        let paid_amount = frm.doc.custom_swipe_amount - frm.doc.custom_instant_cash_discount - frm.doc.custom_interest_subvention;
        frm.set_value('paid_amount', paid_amount);
    }
}