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
  output.add('paymentinfo', result);
  res.json(output);
}));

routes.post('/paymentResult', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const output = new StdObject();
  const result = await PaymentService.getPaymentResult(DBMySQL, member_seq);
  output.add('result', result);
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


    log.d(req, '[req.body]', req.body)

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


routes.put('/insertsubscribe', Wrap(async(req, res) => {
  req.accepts('application/json');
  const pg_data = req.body.pg_data;

  try {
    const output = new StdObject();
    await DBMySQL.transaction(async(transaction) => {
      const subScribe_insert = await PaymentService.insertSubscribe(transaction, pg_data);
      const access_token = await IamportApiService.getIamportToken();
      if (access_token.code === 0) {
        const subScribeResult = await IamportApiService.subScribePayment(access_token.token, pg_data);
        const payData = await IamportApiService.makePayData(subScribeResult, pg_data);
        const payment_insert = await PaymentService.insertPayment(transaction, payData);
      }
    });
    res.json(output);
  } catch (e) {
    const access_token = await IamportApiService.getIamportToken();
    const result = await IamportApiService.subScribeDelete(access_token.token, pg_data.customer_uid);
    throw new StdObject(-1, '결재 중 오류가 발생 하였습니다.', 400);
  }
}));

routes.post('/deleteSubscribeCode', Wrap(async(req, res) => {
  const access_token = await IamportApiService.getIamportToken();
  const result = await IamportApiService.subScribeDelete(access_token.token, req.body.customer_uid);
  res.json(result);
}));

routes.put('/subscribefinalupdate', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
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

    const groupUpdate = await group_service.updatePaymenttoGroup(DBMySQL, filter, pay_code, storage_size, expire_month_code);

    res.json(new StdObject(0, '정상결제 되었습니다.', 200));
  } catch (e) {
    throw new StdObject(-1, '결재 중 오류가 발생 하였습니다.', 400);
  }
}));

export default routes;
