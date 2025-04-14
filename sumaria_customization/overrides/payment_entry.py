import frappe
from frappe.utils import get_url_to_form


def create_journal_entry(doc, method=None):
    if doc.custom_is_financed:
        amount = 0
        if doc.custom_dis_paid_by_customer:
            amount = doc.custom_disbursement_amount
        else:
            amount = doc.custom_disbursement_amount + doc.custom_dealer_interest_subsidy
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


def create_journal_entry_credit_card(doc, method=None):
    if doc.mode_of_payment:
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
        }
        jvdoc = frappe.get_doc(journal_entry)
        terminal_provider = frappe.db.get_value(
            "Terminal Master Record", doc.custom_terminal_id, "terminal_provider"
        )
        bank_account = frappe.db.get_value(
            "Terminal Master Record", doc.custom_terminal_id, "merchant_bank"
        )
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
                "party_type": frappe.db.get_value(
                    "Bank Account", bank_account, "party"
                ),
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
        frappe.enqueue(
            "sumaria_customization.overrides.payment_entry.delete_pe",
            enqueue_after_commit=True,
            queue="short",
            name=doc.name,
        )


def delete_pe(name):
    frappe.delete_doc("Payment Entry", name)
