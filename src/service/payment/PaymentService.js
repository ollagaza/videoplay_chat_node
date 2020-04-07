import log from '../../libs/logger';
import DBMySQL from '../../database/knex-mysql'
import PaymentModel from '../../database/mysql/payment/PaymentModel'
import PaymentResultModel from '../../database/mysql/payment/PaymentResultModel'
import Payment_SubscribeModel from '../../database/mysql/payment/Payment_SubscribeModel'
import Serviceconfig from '../service-config';
import StdObject from "../../wrapper/std-object";

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

  getPaymentResult = async(database, member_seq, group_type, lang = 'kor') => {
    const output = new StdObject();

    const payment_model = this.getPaymentModel(database);
    const payment_list = await payment_model.getPaymentList(lang, group_type);
    output.add('payment_list', payment_list);

    const payment_result_model = this.getPaymentResultModel(database);
    const payment_result = await payment_result_model.getPaymentResult(member_seq, group_type);
    output.add('payment_result', payment_result[0]);

    return output;
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

  usedUpdateSubscribe = async (database, old_customer_uid) => {
    let result = null;
    const subscribeModel = this.getSubscribeModel(database);
    result = await subscribeModel.SubscribeNotUsedModify(old_customer_uid);

    return result;
  };

  deleteSubscribe = async (database, customer_uid) => {
    let result = null;
    const subscribeModel = this.getSubscribeModel(database);
    result = await subscribeModel.putSubscribeDelete(customer_uid);

    return result;
  };

  getSubscribe_list = async (database, filters) => {
    let result = null;
    return result;
  };

  getPaymentLastResult = async (database, filters) => {
    const payment_result_model = this.getPaymentResultModel(database);
    const result = await payment_result_model.getPaymentLastResult(filters);
    return result;
  };

  chkCustomer_uid = async (database, customer_uid) => {
    const subscribeModel = this.getSubscribeModel(database);
    const chkCustomerUid = await subscribeModel.getSubScribeOne({ customer_uid: customer_uid });
    return chkCustomerUid.customer_uid != undefined ? true : false;
  };

  getSubScribetoBuyerSeq = async (database, buyer_seq) => {
    const subscribeModel = this.getSubscribeModel(database);
    const subscribe = await subscribeModel.getSubScribeOne({ buyer_seq: buyer_seq });
    return subscribe;
  };
}

const payment_service = new PaymentServiceClass()

export default payment_service
