import frappe

def create_journal_entry(doc,method=None):
	if doc.custom_is_financed:
		amount = 0 
		if doc.custom_dis_paid_by_customer:
			amount = doc.custom_disbursement_amount
		else:
			amount = doc.custom_disbursement_amount + doc.custom_dealer_interest_subsidy
		reference = None
		for ref in doc.references:
			reference = ref.reference_name	
		journal_entry={
				"doctype":"Journal Entry",
				"company":doc.company,
				"entry_type":"Journal Entry",
				"posting_date":doc.posting_date,
				"total_debit":(amount),
				"total_credit":(amount),
				}
		jvdoc = frappe.get_doc(journal_entry)
		jvdoc.append("accounts", {"account":frappe.db.get_value("Consumer Finance Provider",doc.custom_finance_company,"account"),"party_type":"Consumer Finance Provider","party":doc.custom_finance_company,"debit_in_account_currency": amount,"branch":doc.branch})
		jvdoc.append("accounts", {"account":frappe.db.get_value("Company",doc.company,"default_receivable_account"),"party_type":doc.party_type,"party":doc.party,"credit_in_account_currency": amount,"branch":doc.branch,"reference_type":"Sales Order","reference_name":reference})
		jvdoc.save()
		jvdoc.submit()