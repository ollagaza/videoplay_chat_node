import log from '../../libs/logger';
import DBMySQL from '../../database/knex-mysql'
import PaymentModel from '../../database/mysql/payment/PaymentModel'
import PaymentResultModel from '../../database/mysql/payment/PaymentResultModel'
import Payment_SubscribeModel from '../../database/mysql/payment/Payment_SubscribeModel'
import Serviceconfig from '../service-config';

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

  getSubscribeModel = (database = null) => {
    if (database) {
      return new Payment_SubscribeModel(database)
    }
    return new Payment_SubscribeModel(DBMySQL)
  }

  getPaymentList = async (database, lang='Kor') => {
    const payment_model = this.getPaymentModel(database);
    const payment_list = await payment_model.getPaymentList(lang);

    return payment_list;
  };

  getPaymentResult = async(database, member_seq) => {
    const payment_result_model = this.getPaymentResultModel(database);
    const result = await payment_result_model.getPaymentResult(member_seq);

    return result;
  };

  createDefaultPaymentResult = async (database, payData, member_seq) => {
    const payment_result_model = this.getPaymentResultModel(database)
    await payment_result_model.createPaymentResultByMemberSeq(payData, member_seq)
  }

  insertPayment = async (database, pg_data) => {
    let result = null;
    const payment_result_model = this.getPaymentResultModel(database);
    result = await payment_result_model.putPaymentCreate(pg_data);

    return result;
  };

  updatePayment = async (database, pg_data) => {
    let result = null;
    const payment_result_model = this.getPaymentResultModel(database);
    result = await payment_result_model.putPaymentModify(pg_data);

    return result;
  };

  insertSubscribe = async (database, pg_data) => {
    let result = null;
    const subscribeModel = this.getSubscribeModel(database);
    result = await subscribeModel.putSubscribeCreate(pg_data);

    return result;
  };

  updateSubscribe = async (database, pg_data) => {
    let result = null;
    const subscribeModel = this.getSubscribeModel(database);
    result = await subscribeModel.putSubscribeModify(pg_data);

    return result;
  };

  getSubscribe_list = async (database, filters) => {
    let result = null;
    return result;
  };
}

const payment_service = new PaymentServiceClass()

export default payment_service
