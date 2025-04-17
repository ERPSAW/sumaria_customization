import frappe


def validate(doc, method=None):
    if doc.mode_of_payment == "Consumer Finance":
        create_journal_entry(doc)
        create_charges_invoice(doc)
        frappe.enqueue(
            "sumaria_customization.overrides.payment_entry.delete_pe",
            enqueue_after_commit=True,
            queue="short",
            name=doc.name,
        )
    if doc.mode_of_payment == "Credit Card":
        create_journal_entry_credit_card(doc)
        frappe.enqueue(
            "sumaria_customization.overrides.payment_entry.delete_pe",
            enqueue_after_commit=True,
            queue="short",
            name=doc.name,
        )

def create_journal_entry(doc):
    amount = doc.custom_disbursement_amount + doc.custom_finance_charges
    reference = None
    for ref in doc.references:
        reference = ref.reference_name
    journal_entry = {
        "doctype": "Journal Entry",
        "company": doc.company,
        "entry_type": "Journal Entry",
        "posting_date": doc.posting_date,
        "total_debit": (amount),
        "total_credit": (amount),
        "custom_finance_company":doc.custom_finance_company,
        "custom_product_price":doc.custom_product_price,
        "custom_doid":doc.custom_doid,
        "custom_down_payment":doc.custom_down_payment,
        "custom_dealer_interest_subsidy":doc.custom_dealer_interest_subsidy,
        "custom_disbursement_amount":doc.custom_disbursement_amount,
        "custom_finance_charges":doc.custom_finance_charges,
        "custom_payment_type":"Finance"
    }
    jvdoc = frappe.get_doc(journal_entry)
    jvdoc.append(
        "accounts",
        {
            "account": frappe.db.get_value(
                "Consumer Finance Provider", doc.custom_finance_company, "account"
            ),
            "party_type": "Consumer Finance Provider",
            "party": doc.custom_finance_company,
            "debit_in_account_currency": amount,
            "branch": doc.branch,
        },
    )
    jvdoc.append(
        "accounts",
        {
            "account": frappe.db.get_value(
                "Company", doc.company, "default_receivable_account"
            ),
            "party_type": doc.party_type,
            "party": doc.party,
            "credit_in_account_currency": amount,
            "branch": doc.branch,
            "reference_type": "Sales Order",
            "reference_name": reference,
        },
    )
    jvdoc.save()
    jvdoc.submit()
    doc.remarks = jvdoc.name


def create_journal_entry_credit_card(doc, method=None):
    reference = None
    for ref in doc.references:
        reference = ref.reference_name
    journal_entry = {
        "doctype": "Journal Entry",
        "company": doc.company,
        "entry_type": "Journal Entry",
        "posting_date": doc.posting_date,
        "custom_transaction_id": doc.custom_transaction_id,
        "custom_terminal_id": doc.custom_terminal_id,
        "custom_swipe_amount": doc.custom_swipe_amount,
        "custom_instant_cash_discount": doc.custom_instant_cash_discount,
        "custom_interest_subvention": doc.custom_interest_subvention,
        "custom_payment_type": "Credit Card"
    }
    jvdoc = frappe.get_doc(journal_entry)
    terminal_provider = frappe.db.get_value(
        "Terminal Master Record", doc.custom_terminal_id, "terminal_provider"
    )
    bank_account = frappe.db.get_value(
        "Terminal Master Record", doc.custom_terminal_id, "merchant_bank"
    )
    if doc.custom_instant_cash_discount != 0 and doc.custom_interest_subvention != 0:
        jvdoc.append(
            "accounts",
            {
                "account": frappe.db.get_value(
                    "Terminal Provider", terminal_provider, "account"
                ),
                "party_type": "Terminal Provider",
                "party": terminal_provider,
                "debit_in_account_currency": doc.custom_instant_cash_discount
                + doc.custom_interest_subvention,
                "branch": doc.branch,
            },
        )
    jvdoc.append(
        "accounts",
        {
            "account": frappe.db.get_value(
                "Bank Account", bank_account, "custom_merchant_account"
            ),
            "bank_account": bank_account,
            "party_type": frappe.db.get_value("Bank Account", bank_account, "party"),
            "party": frappe.db.get_value("Bank Account", bank_account, "party"),
            "debit_in_account_currency": doc.custom_swipe_amount
            - (doc.custom_instant_cash_discount + doc.custom_interest_subvention),
            "branch": doc.branch,
        },
    )
    jvdoc.append(
        "accounts",
        {
            "account": frappe.db.get_value(
                "Company", doc.company, "default_receivable_account"
            ),
            "party_type": doc.party_type,
            "party": doc.party,
            "credit_in_account_currency": doc.custom_swipe_amount,
            "branch": doc.branch,
            "reference_type": "Sales Order",
            "reference_name": reference,
        },
    )
    jvdoc.save()
    jvdoc.submit()
    doc.remarks = jvdoc.name

def create_charges_invoice(doc):
    sales_invoice={
            "doctype"    :    "Sales Invoice",
            "company"    :    doc.company,
            "posting_date"    :    doc.posting_date,
            "customer"    :    doc.party,
            "branch"    :   doc.branch,
        }
    document=frappe.get_doc(sales_invoice)
    document.append("items",{
                "item_code":frappe.db.get_value("Sumaria Settings","Sumaria Settings","finance_item"),
                "qty":1,
                "rate":doc.custom_finance_charges,
                "gst_treatment":"Taxable"
            })
    document.set_missing_values()
    document.save()
    document.submit()


def delete_pe(name):
    frappe.delete_doc("Payment Entry", name)
