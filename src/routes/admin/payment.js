import { Router } from 'express';
import _ from 'lodash';
import log from '../../libs/logger'
import Auth from '../../middlewares/auth.middleware';
import Util from '../../utils/baseutil';
import Role from "../../constants/roles";
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import AdminPaymentService from '../../service/payment/AdminPaymentService';
import IamportApiService from "../../service/payment/IamportApiService";
import PaymentService from "../../service/payment/PaymentService";
import group_service from "../../service/member/GroupService";

const routes = Router();

routes.post('/payment_home', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = await AdminPaymentService.getPaymentHome(DBMySQL);
  res.json(output);
}));

routes.post('/paymentintomember', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const filters = req.body.filters;
  const output = await AdminPaymentService.getPaymentintoMemberList(DBMySQL, filters);
  res.json(output);
}));

routes.post('/paymentCancelAndChange', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const filters = req.body.filters;
  const output = await AdminPaymentService.getPaymentCancelAndChangeList(DBMySQL, filters);
  res.json(output);
}));

routes.post('/memberpaymentalllist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const member_seq = req.body.member_seq;
  const searchOrder = req.body.searchOrder;
  const page_navigation = req.body.page_navigation;
  const output = await AdminPaymentService.getMemberPaymentAllList(DBMySQL, member_seq, searchOrder, page_navigation);
  res.json(output);
}));

routes.post('/getOrderInfo', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const merchant_uid = req.body.merchant_uid;
  const output = await AdminPaymentService.getOrderInfo(DBMySQL, merchant_uid);
  res.json(output);
}));

routes.post('/getAdminLog', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  try {
    const merchant_uid = req.body.merchant_uid;
    const member_seq = req.body.member_seq;
    const output = await AdminPaymentService.getAdminLog(DBMySQL, merchant_uid, member_seq);
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, `오류가 발생 하였습니다.\n${e}`, 400);
  }
}));

routes.put('/cudAdminLog', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  try {
    const cud_code = req.body.cud_code;
    const cu_Param = req.body.cu_param;
    const output = await AdminPaymentService.cudAdminLog(DBMySQL, cud_code, cu_Param);
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, `오류가 발생 하였습니다.\n${e}`, 400);
  }
}));

routes.put('/cancelforadmin', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  try {
    const output = new StdObject();
    const merchant_uid = req.body.merchant_uid;
    const cancelMoney = req.body.cancelMoney;
    const cancelData = await AdminPaymentService.getPaymentResultOne(DBMySQL, merchant_uid);
    const result = await IamportApiService.adminPaymentCancel(cancelData, cancelMoney);

    if (cancelData.customer_uid !== null) {
      const subScribeDelete_result = await IamportApiService.subScribeDelete(cancelData.customer_uid);
      const subScribeDelete_data = await PaymentService.deleteSubscribe(DBMySQL, cancelData.customer_uid);
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
      member_seq: cancelData.buyer_seq,
      group_type: 'P',
    };

    await DBMySQL.transaction(async(transaction) => {
      const payment_update = await PaymentService.updatePayment(DBMySQL, pg_data);
      const groupUpdate = await group_service.updatePaymentToGroup(transaction, filter, pay_code, storage_size, expire_month_code);
    });

    res.json(output);
  } catch (e) {
    throw new StdObject(-1, `오류가 발생 하였습니다.\n${e}`, 400);
  }
}));

routes.post('/getChangePayment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  try {
    const member_seq = req.body.member_seq;
    const searchOrder = req.body.searchOrder;
    const page_navigation = req.body.page_navigation;
    const output = await AdminPaymentService.getChangePayment(DBMySQL, member_seq, searchOrder, page_navigation);
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, `오류가 발생 하였습니다.\n${e}`, 400);
  }
}));

routes.get('/paymentfreelist', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();

  const payment_info = await PaymentService.getPaymentFreeList(DBMySQL, 'Kor');

  output.add('paymentinfo', payment_info);
  res.json(output);
}));

routes.put('/freestorageassign', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const searchObj = req.body.searchObj;
  const setDate = req.body.setDate;
  try {
    let storage_size = 0;
    if (setDate.payment_code === 'free') {
      storage_size = 1024 * 1024 * 1024 * 30;
    } else {
      storage_size = 1024 * 1024 * 1024 * 1024 * Number(setDate.payment_code.replace(/[^0-9]/g, ''));
    }

    _.forEach(searchObj[0].seq, async (value) => {
      const filter = {
        member_seq: value,
        group_type: 'P',
      };
      await DBMySQL.transaction(async(transaction) => {
        const setPaymentResult = await PaymentService.setPaymentFreeStorageAssign(transaction, value, setDate);
        const groupUpdate = await group_service.updatePaymentToGroup(transaction, filter, setDate.payment_code, storage_size, null, setDate.start_date, setDate.expire_date);
      });
    });
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }

  res.json(output);
}));

export default routes;
