import { Router } from 'express';
import Auth from '../../middlewares/auth.middleware';
import Util from '../../utils/baseutil';
import Role from "../../constants/roles";
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import PaymentService from '../../service/payment/PaymentService';
import IamportApiService from '../../service/payment/IamportApiService';
import group_service from "../../service/member/GroupService";
import log from "../../libs/logger"

const routes = Router();

routes.get('/paymentlist', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();

  const payment_info = await PaymentService.getPaymentList(DBMySQL, 'Kor');
  const result = {};

  Object.keys(payment_info).forEach((key) => {
    if (payment_info[key].code === 'free') {
      result.free = payment_info[key];
    } else {
      let group = payment_info[key].group;

      if (!result[group]) {
        result[group] = {};
      }
      result[group][payment_info[key].code] = payment_info[key];
    }
  });
  output.add('paymentinfo_origin', payment_info);
  output.add('paymentinfo', result);
  res.json(output);
}));

routes.post('/paymentResult', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const group_type = req.body.group_type;
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const group_info = await group_service.getUserGroupInfo(DBMySQL, member_seq);
  const output = await PaymentService.getPaymentResult(DBMySQL, member_seq, group_type);

  output.add('group_info', group_info);
  res.json(output);
}));

routes.put('/paymentInsert', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const payment_insert = await PaymentService.insertPayment(DBMySQL, req.body.pg_data);
  output.add('result', payment_insert);
  res.json(output);
}));

routes.put('/paymentUpdate', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const payment_update = await PaymentService.updatePayment(DBMySQL, req.body.pg_data);
  output.add('result', payment_update);
  res.json(output);
}));

routes.put('/paymentFinalUpdate', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  try {
    const output = new StdObject();
    const token_info = req.token_info;
    const member_seq = token_info.getId();
    const pg_data = req.body.pg_data;
    const pay_data = req.body.pay_data;
    const moneys = req.body.moneys;
    const numPatten = /(^[0-9]+)/g;
    const textPatten = /([^0-9])([A-Z])/g;
    const payment_update = await PaymentService.updatePayment(DBMySQL, pg_data);

    if (pg_data.success) {
      log.d(req, '[pg_data.success] - pay_data', pay_data)
      const pay_code = pay_data.code;
      let storage_size = 0
      const expire_month_code = moneys.pay;

      switch (textPatten.exec(pay_data.storage)[0]) {
        case 'TB':
          storage_size = 1024 * 1024 * 1024 * 1024 * Number(numPatten.exec(pay_data.storage)[0]);
          break;
        default:
          storage_size = 1024 * 1024 * 1024 * 30;
          break;
      }

      const filter = {
        member_seq: member_seq,
        group_type: pay_data.group === 'person' ? 'P' : 'G',
      };

      const groupUpdate = await group_service.updatePaymentToGroup(DBMySQL, filter, pay_code, storage_size, expire_month_code);

      res.json(new StdObject(0,'정상결제 되었습니다.', 200));
    }
  } catch (error) {
    log.e(req, error)
    throw new StdObject(-1, '결재 중 오류가 발생 하였습니다.', 400);
  }
}));

routes.post('/getScribeInfo', Wrap(async(req, res) => {
  try {
    req.accepts('application/json');
    const member_seq = req.body.member_seq;
    const output = new StdObject();
    const subScribe = await PaymentService.getSubScribetoBuyerSeq(DBMySQL, member_seq);
    output.add('subScribe', subScribe);
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, '오류가 발생 하였습니다.', 400);
  }
}));

routes.post('/deleteSubscribeCode', Wrap(async(req, res) => {
  try {
    const subScribeDelete_data = await PaymentService.deleteSubscribe(req.body.customer_uid);
    const result = await IamportApiService.subScribeDelete(req.body.customer_uid);
    res.json(result);
  } catch (e) {
    log.e(req, e)
    throw new StdObject(-1, '오류가 발생 하였습니다.', 400);
  }
}));

routes.put('/createSubscribefinal', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const pg_data = req.body.pg_data;
  const payment = req.body.payment;
  const pay_data = req.body.pay_data;
  const moneys = req.body.moneys;
  const token_info = req.token_info;
  const member_seq = token_info.getId();

  try {
    const numPatten = /(^[0-9]+)/g;
    const textPatten = /([^0-9])([A-Z])/g;
    const customer_uid = await PaymentService.chkCustomer_uid(DBMySQL, pay_data.customer_uid);

    await DBMySQL.transaction(async (transaction) => {
      if (!customer_uid) {
        const addSubScribeData = await IamportApiService.getSubscripbeInfo(pay_data.customer_uid);
        pay_data.card_code = addSubScribeData.response[0].card_code;
        pay_data.card_name = addSubScribeData.response[0].card_name;
        pay_data.card_number = addSubScribeData.response[0].card_number;
        const subScribe_insert = await PaymentService.insertSubscribe(transaction, pay_data);
      }
      const subScribeResult = await IamportApiService.subScribePayment(pay_data);
      const payData = await IamportApiService.makePayData(subScribeResult, pay_data);
      const payment_insert = await PaymentService.insertPayment(transaction, payData);
    });

    const pay_code = payment.code;
    let storage_size = 0;
    const expire_month_code = moneys.pay;

    switch (textPatten.exec(payment.storage)[0]) {
      case 'TB':
        storage_size = 1024 * 1024 * 1024 * 1024 * Number(numPatten.exec(payment.storage)[0]);
        break;
      default:
        storage_size = 1024 * 1024 * 1024 * 30;
        break;
    }

    const filter = {
      member_seq: member_seq,
      group_type: payment.group === 'person' ? 'P' : 'G',
    };

    await DBMySQL.transaction(async (transaction) => {
      const groupUpdate = await group_service.updatePaymentToGroup(transaction, filter, pay_code, storage_size, expire_month_code);
    });

    res.json(new StdObject(0, '정상결제 되었습니다.', 200));
  } catch (e) {
    const result = await IamportApiService.subScribeDelete(pg_data.customer_uid);
    throw new StdObject(-1, '결재 중 오류가 발생 하였습니다.', 400);
  }
}));

routes.put('/updatesubscribe', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const old_customer_uid = req.body.old_customer_uid;
  const pg_data = req.body.pg_data;

  try {
    await DBMySQL.transaction(async (transaction) => {
      const subScribe_insert = await PaymentService.insertSubscribe(transaction, pg_data);
      const updateResult = await PaymentService.usedUpdateSubscribe(transaction, old_customer_uid);
    });

    const result = await IamportApiService.subScribeDelete(old_customer_uid);
    res.json(new StdObject(0, '정상 등록 되었습니다.', 200));
  } catch (e) {
    const result = await IamportApiService.subScribeDelete(pg_data.customer_uid);
    throw new StdObject(-1, `결재 변경 중 오류가 발생 하였습니다.\n${e}`, 400);
  }
}));

routes.post('/payment_cancel', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const options = req.body.options;
  const token_info = req.token_info;
  const member_seq = token_info.getId();

  try {
    const result = await IamportApiService.paymentCancel(options.last_payment, options.cancel_text, options.cancel_type);

    if (options.cancel_type !== 'C' && options.last_payment.customer_uid !== null) {
      const subScribeDelete_result = await IamportApiService.subScribeDelete(options.last_payment.customer_uid);
      const subScribeDelete_data = await PaymentService.deleteSubscribe(DBMySQL, options.last_payment.customer_uid);
    }

    const pg_data = {
      merchant_uid: result.response.merchant_uid,
      status: result.response.status ? result.response.status : 'cancelled',
      cancel_amount: result.response.cancel_amount,
      cancel_history: JSON.stringify(result.response.cancel_history),
      cancel_reason: result.response.cancel_reason,
      cancel_receipt_urls: JSON.stringify(result.response.cancel_receipt_urls),
      cancelled_at: result.response.cancelled_at,
    };

    const pay_code = 'free';
    const storage_size = 1024 * 1024 * 1024 * 30;
    const expire_month_code = null;

    const filter = {
      member_seq: member_seq,
      group_type: 'P',
    };

    await DBMySQL.transaction(async(transaction) => {
      const payment_update = await PaymentService.updatePayment(DBMySQL, pg_data);
      if (options.cancel_type !== 'C') {
        const groupUpdate = await group_service.updatePaymentToGroup(transaction, filter, pay_code, storage_size, expire_month_code);
      }
    });

    res.json(output);
  } catch (e) {
    throw new StdObject(-1, '취소 중 오류가 발생 하였습니다.', 400);
  }
}));

export default routes;
