frappe.ui.form.on("Address", {
   pincode : function (frm) {
        frm.set_value("custom_pin_code",frm.doc.pincode);
    },
});