frappe.ui.form.on("Bank Account", {
    refresh: function (frm) {
        frm.set_query("custom_merchant_account", function (doc, cdt, cdn) {
            var d = locals[cdt][cdn];
            return {
                filters: [
                    ['Account', 'account_type', '=', 'Bank'],
                    ['Account', 'is_group', '=', 0],
                ]
            };
        });
    
    },
});