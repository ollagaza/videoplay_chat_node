import {Router} from 'express';
import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import PaymentService from '@/service/payment/PaymentService';
import log from "@/classes/Logger";

const routes = Router();

routes.get('/paymentlist', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();

  const paymentinfo = await PaymentService.getPaymentList(database, 'Kor');
  const result = {};

  Object.keys(paymentinfo).forEach((key) => {
    if (paymentinfo[key].code === 'free') {
      result.free = paymentinfo[key];
    } else {
      let group = paymentinfo[key].group;

      if (!result[group]) {
        result[group] = {};
      }
      result[group][paymentinfo[key].code] = paymentinfo[key];
    }
  });
  output.add('paymentinfo', result);
  res.json(output);
}));

routes.put('/paymentInsert', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const payment_insert = await PaymentService.insertPayment(database, req.body.pg_data);
  output.add('result', payment_insert);
  res.json(output);
}));

routes.put('/paymentUpdate', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const payment_update = await PaymentService.updatePayment(database, req.body.pg_data);
  output.add('result', payment_update);
  res.json(output);
}));

export default routes;