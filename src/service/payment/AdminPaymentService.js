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

  getPaymentHome = async (database) => {
    const paymentResultModel = this.getPaymentResultModel(database);
    const PaymentToDayAmount = await paymentResultModel.getPaymentToDayAmount();
    const PaymentToMonthAmount = await paymentResultModel.getPaymentToMonthAmount();
    const PaymentChart = await paymentResultModel.getPaymentChart();

    const output = new StdObject();
    output.add('PaymentToDayAmount', PaymentToDayAmount[0]);
    output.add('PaymentToMonthAmount', PaymentToMonthAmount[0]);
    output.add('PaymentChart', PaymentChart[0]);

    return output;
  };

  getPaymentintoMemberList = async (database, filters) => {
    const output = new StdObject();
    try {
      const paymentResultModel = this.getPaymentResultModel(database);
      const PaymentintoMemberList = await paymentResultModel.getPaymentintoMemberList(filters.query, filters.page_navigation);
      output.add('data', PaymentintoMemberList);
      return output;
    } catch (e) {
      throw new StdObject(-1, '데이터 조회중 오류가 발생하였습니다', 400);
    }
  };
}

const payment_service = new PaymentServiceClass()

export default payment_service
