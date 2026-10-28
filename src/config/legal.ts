import { brand } from "./brand";

// Business facts the legal pages show (Batch 6.3). The owner fills each one
// here once; every page reads it from here. A value in "[to confirm: ...]"
// is not known yet and shows on the page as written, so nothing launches on
// a guess. The pages are drafts until a Philippine lawyer reviews them.
export const legal = {
  /** The date the policies last changed, shown as "Last updated". */
  updated: "2026-10-27T00:00:00+08:00",

  businessName: "[to confirm: registered business name]",
  tradeName: brand.name,
  businessType: "[to confirm: sole proprietorship, partnership or corporation]",
  registration: "[to confirm: DTI or SEC registration number]",
  tin: "[to confirm: TIN and branch code]",
  birRegistration:
    "[to confirm: BIR Certificate of Registration (Form 2303) number and RDO]",
  vatStatus: "[to confirm: VAT-registered or non-VAT]",
  businessPermit: "[to confirm: city business permit (Mayor's permit) number]",
  address: "[to confirm: registered business address]",

  supportEmail: brand.supportEmail ?? "[to confirm: support email]",
  supportPhone: "[to confirm: support mobile or landline number]",
  supportHours: "[to confirm: support hours, e.g. daily 8 AM to 8 PM]",

  /** The Data Protection Officer (Data Privacy Act, section 21). */
  dpoName: "[to confirm: Data Protection Officer's name]",
  dpoEmail: "[to confirm: Data Protection Officer's email]",

  /** Which SMS sender the shop uses (docs/03 section 2). */
  smsProvider: "[to confirm: Semaphore or Twilio]",
  /** How long Orders, payments and receipts are kept for tax law. */
  taxRecordYears: "[to confirm with the accountant: number of years]",
} as const;
