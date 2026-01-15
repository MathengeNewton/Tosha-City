export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  CREDIT = 'CREDIT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL', // For credit payments that are partially paid
}

