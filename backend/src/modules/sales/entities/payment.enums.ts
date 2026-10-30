export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  PDQ = 'PDQ', // Card machine
  CREDIT = 'CREDIT',
}

export enum MpesaChannel {
  TILL = 'TILL',
  PAYBILL = 'PAYBILL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL', // For credit payments that are partially paid
}

/** How a payment reads on screens and receipts, e.g. "M-Pesa Till" or "Card (PDQ)". */
export function paymentLabel(method?: string | null, mpesaChannel?: string | null): string {
  switch (method) {
    case PaymentMethod.MPESA:
      if (mpesaChannel === MpesaChannel.TILL) return 'M-Pesa Till';
      if (mpesaChannel === MpesaChannel.PAYBILL) return 'M-Pesa Paybill';
      return 'M-Pesa';
    case PaymentMethod.PDQ:
      return 'Card (PDQ)';
    case PaymentMethod.CREDIT:
      return 'Credit';
    default:
      return 'Cash';
  }
}
