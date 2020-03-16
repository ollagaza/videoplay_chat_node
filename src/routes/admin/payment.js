import { Router } from 'express';
import Auth from '../../middlewares/auth.middleware';
import Util from '../../utils/baseutil';
import Role from "../../constants/roles";
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import PaymentService from '../../service/payment/PaymentService';

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
  output.add('paymentinfo2', payment_info);
  res.json(output);
}));

routes.put('/paymentInsert', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const payment_insert = await PaymentService.insertPayment(DBMySQL, req.body.pg_data);
  output.add('result', payment_insert);
  res.json(output);
}));

routes.put('/paymentUpdate', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const payment_update = await PaymentService.updatePayment(DBMySQL, req.body.pg_data);
  output.add('result', payment_update);
  res.json(output);
}));

routes.put('/paymentPeriodUpdate', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const payment_update = await PaymentService.updatePayment(DBMySQL, req.body.pg_data);
  output.add('result', payment_update);
  res.json(output);
}));

routes.post('/paymentResult', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const output = await PaymentService.getPaymentResult(DBMySQL, member_seq);

  res.json(output);
}));
export default routes;
