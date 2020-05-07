import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import ContactUsService from '../../service/etc/ContactUsService'

const routes = Router();

routes.post('/contact_us', Wrap(async (req, res, next) => {
  const is_success = await ContactUsService.createContactUs(req.body)
  const result = new StdObject();
  result.add('result', is_success);
  res.json(result);
}));

export default routes;
