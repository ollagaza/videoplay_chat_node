import { Router } from 'express';
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
  res.json(output);
}));

export default routes;
