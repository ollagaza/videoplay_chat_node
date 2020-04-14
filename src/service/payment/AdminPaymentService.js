import _ from 'lodash';
import log from '../../libs/logger';
import DBMySQL from '../../database/knex-mysql'
import baseutil from "../../utils/baseutil";
import StdObject from "../../wrapper/std-object";
import Serviceconfig from '../service-config';
import PaymentModel from '../../database/mysql/payment/PaymentModel'
import PaymentResultModel from '../../database/mysql/payment/PaymentResultModel'
import Payment_SubscribeModel from '../../database/mysql/payment/Payment_SubscribeModel'
import AdminLogModel from "../../database/mysql/payment/AdminLogModel";

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

  getAdminLogModel = (database = null) => {
    if (database) {
      return new AdminLogModel(database)
    }
    return new AdminLogModel(DBMySQL)
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
      const query = {
        query: filters.where,
        order: filters.order,
      };
      query.is_new = true;
      const paymentResultModel = this.getPaymentResultModel(database);
      const PaymentintoMemberList = await paymentResultModel.getPaymentintoMemberList(query, filters.page_navigation);
      output.add('data', PaymentintoMemberList);
      return output;
    } catch (e) {
      throw new StdObject(-1, '데이터 조회중 오류가 발생하였습니다', 400);
    }
  };

  getPaymentCancelAndChangeList = async (database, filters) => {
    const output = new StdObject();
    try {
      const query = {
        query: filters.where,
        order: filters.order,
      };
      query.is_new = true;
      const paymentResultModel = this.getPaymentResultModel(database);
      const ResultList = await paymentResultModel.getPaymentCancelAndChangeList(query, filters.page_navigation);
      output.add('data', ResultList);
      return output;
    } catch (e) {
      throw new StdObject(-1, '데이터 조회중 오류가 발생하였습니다', 400);
    }
  };

  getMemberPaymentAllList = async (database, member_seq, searchOrder, page_navigation) => {
    const output = new StdObject();
    try {
      const paymentResultModel = this.getPaymentResultModel(database);
      const PaymentintoMemberList = await paymentResultModel.getMemberPaymentAllList(member_seq, searchOrder, page_navigation);
      output.add('PayList', PaymentintoMemberList);
      return output;
    } catch (e) {
      throw new StdObject(-1, '데이터 조회중 오류가 발생하였습니다', 400);
    }
  };

  getOrderInfo = async (database, merchant_uid) => {
    const output = new StdObject();
    try {
      const paymentResultModel = this.getPaymentResultModel(database);
      const data = await paymentResultModel.getOrderInfo(merchant_uid);
      const orderInfo = data[0][0];
      const pay_moneys = JSON.parse(orderInfo.moneys);
      orderInfo.pay_money = _.find(pay_moneys, { paycode: orderInfo['pay_code']});
      orderInfo.paid_at = baseutil.dateFormat(orderInfo.paid_at);
      orderInfo.start_paid_at = baseutil.dateFormat(orderInfo.paid_at, 'yyyy-mm-dd');
      if (orderInfo.pay_money.pay === 'month') {
        orderInfo.end_paid_at = baseutil.getDateMonthAdd(baseutil.dateFormat(orderInfo.paid_at), 1);
      } else {
        orderInfo.end_paid_at = baseutil.getDateYearAdd(baseutil.dateFormat(orderInfo.paid_at), 1);
      }
      if (baseutil.dateFormat(new Date()) >= orderInfo.start_paid_at && baseutil.dateFormat(new Date()) <= orderInfo.end_paid_at) {
        switch (orderInfo.status) {
          case 'cancelled':
            orderInfo.progress_code = 'C';
            orderInfo.progress_status = '결제취소';
            break;
          case null:
            orderInfo.progress_code = 'C';
            orderInfo.progress_status = '결제정보없음';
            break;
          default:
            orderInfo.progress_code = 'S';
            orderInfo.progress_status = '정상';
            break;
        }
      } else {
        switch (orderInfo.status) {
          case 'cancelled':
            orderInfo.progress_code = 'C';
            orderInfo.progress_status = '결제취소';
            break;
          case null:
            orderInfo.progress_code = 'C';
            orderInfo.progress_status = '결제정보없음';
            break;
          default:
            orderInfo.progress_code = 'E';
            orderInfo.progress_status = '계약기간만료';
            break;
        }
      }

      const diffDay = baseutil.dayDiffenrence(orderInfo.start_paid_at);
      let amount = 0;
      if (diffDay > 7) {
        amount = (orderInfo.amount * (31 - diffDay) / 30) * 0.7;
        orderInfo.exp_amount = Math.ceil(Math.ceil(amount / 10) * 10);
      } else {
        orderInfo.exp_amount = orderInfo.amount;
      }

      switch (orderInfo.user_type) {
        case 'P':
          if (orderInfo.used_Admin === 'Y') {
            orderInfo.userGrade = '관리자';
          } else {
            orderInfo.userGrade = '의사회원';
          }
          break;
        case 'H':
          if (orderInfo.used_Admin === 'Y') {
            orderInfo.userGrade = '관리자';
          } else {
            orderInfo.userGrade = '병원회원';
          }
          break;
      }

      output.add('order_info', orderInfo);
      return output;
    } catch (e) {
      throw new StdObject(-1, '데이터 조회중 오류가 발생하였습니다', 400);
    }
  };

  getAdminLog = async (database, merchant_uid, member_seq) => {
    try {
      const output = new StdObject();
      const adminlog_model = this.getAdminLogModel(database);
      const result = await adminlog_model.getAdminLog(merchant_uid, member_seq);
      output.add('admin_log', result);
      return output;
    } catch (e) {
      throw new StdObject(-1, '데이터 조회중 오류가 발생하였습니다', 400);
    }
  };

  cudAdminLog = async (database, cud_code, cu_Param) => {
    try {
      const output = new StdObject();
      const adminlog_model = this.getAdminLogModel(database);
      let result = null;

      if (cud_code.toUpperCase() === 'D') {
        result = await adminlog_model.DelAdminLog(cu_Param);
      } else if (cud_code.toUpperCase() === 'C') {
        result = await adminlog_model.Create_AdminLog(cu_Param);
      } else if (cud_code.toUpperCase() === 'U') {
        result = await adminlog_model.Update_AdminLog(cu_Param);
      }
      output.add('admin_log', result);
      return output;
    } catch (e) {
      throw new StdObject(-1, '데이터 조회중 오류가 발생하였습니다', 400);
    }
  };

  getPaymentResultOne = async(database, merchant_uid) => {
    const payment_result_model = this.getPaymentResultModel(database);
    const payment_result = await payment_result_model.getPaymentResultOne(merchant_uid);
    return payment_result;
  };

  getChangePayment = async (database, member_seq, searchOrder, page_navigation) => {
    const output = new StdObject();
    try {
      const subscribeModel = this.getSubscribeModel(database);
      const SubscribeList = await subscribeModel.getSubscribeList(member_seq, searchOrder, page_navigation);
      output.add('SubscribeList', SubscribeList);
      return output;
    } catch (e) {
      throw new StdObject(-1, '데이터 조회중 오류가 발생하였습니다', 400);
    }
  };
}

const payment_service = new PaymentServiceClass()

export default payment_service
