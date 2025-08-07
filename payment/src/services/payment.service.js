const PAYMENT_COLLECTION = 'paymentMethods';

export class PaymentService {
  constructor({ db }) {
    this.db = db;
    this.paymentCollection = this.db.collection(PAYMENT_COLLECTION);
  }
}
