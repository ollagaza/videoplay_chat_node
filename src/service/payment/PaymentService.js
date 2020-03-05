import log from '../../libs/logger';
import request from 'request';
import DBMySQL from '../../database/knex-mysql'
import PaymentModel from '../../database/mysql/payment/PaymentModel'
import PaymentResultModel from '../../database/mysql/payment/PaymentResultModel'
import Payment_Subscribe_List_Model from '../../database/mysql/payment/Payment_Subscribe_List_Model'
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

  getPayment_subscribe_list = async (database) => {
    let result = null;
    const payment_result_model = this.getPaymentResultModel(database);
    result = await payment_result_model.putPaymentModify(pg_data);

    return result;
  };

  getImportToken = async () => {
    const Options = {
      headers: {'Content-Type': 'application/json'},
      url: 'https://api.iamport.kr/users/getToken',
      body: {
        imp_key: Serviceconfig.get('import_api_key'),
        imp_secret: Serviceconfig.get('import_api_secret'),
      }
    };
    request.post(Options, (err, res, result) => {
      log.debug(result);
      return result.access_token;
    });
  };

  sendIamport_subScribe = async () => {
    const Options = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getImportToken(),
      },
      url: 'https://api.iamport.kr/subscribe/onetime',
      body: {}
    };
    request.post(Options, (err, res, result) => {
      log.debug(result);
    });
  };
}

const payment_service = new PaymentServiceClass()

export default payment_service
