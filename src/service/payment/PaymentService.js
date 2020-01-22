import DBMySQL from '../../database/knex-mysql'
import PaymentModel from '../../database/mysql/payment/PaymentModel'
import PaymentResultModel from '../../database/mysql/payment/PaymentResultModel'

const PaymentServiceClass = class {
  constructor () {
    this.log_prefix = '[PaymentServiceClass]'
  }

  getPaymentModel = (database = null) => {
    if (database) {
      return new PaymentModel(database)
    }
    return new PaymentModel(DBMySQL)
  }
  getPaymentResultModel = (database = null) => {
    if (database) {
      return new PaymentResultModel(database)
    }
    return new PaymentResultModel(DBMySQL)
  }

  getPaymentList = async (database, lang='Kor') => {
    const payment_model = this.getPaymentModel(database);
    const payment_list = await payment_model.getPaymentList(lang);

    return payment_list;
  };

  insertPayment = async (database, pg_data) => {
    let result = null;
    const payment_result_model = this.getPaymentResultModel(database);
    result = await payment_result_model.getPaymentCreate(pg_data);

    return result;
  };

  updatePayment = async (database, pg_data) => {
    let result = null;
    const payment_result_model = this.getPaymentResultModel(database);
    result = await payment_result_model.getPaymentModify(pg_data);

    return result;
  };
}

const payment_service = new PaymentServiceClass()

export default payment_service
