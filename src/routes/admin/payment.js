import { Router } from 'express';
import Auth from '../../middlewares/auth.middleware';
import Util from '../../utils/baseutil';
import Role from "../../constants/roles";
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import AdminPaymentService from '../../service/payment/AdminPaymentService';

const routes = Router();

routes.post('/payment_home', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = await AdminPaymentService.getPaymentHome(DBMySQL);
  res.json(output);
}));

routes.post('/paymentintomember', Wrap(async(req, res) => {
  req.accepts('application/json');
  const filters = req.body.filters;
  const output = await AdminPaymentService.getPaymentintoMemberList(DBMySQL, filters);
  res.json(output);
}));

export default routes;
