import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import ContactUsService from '../../service/etc/ContactUsService'
import SendMail_Service from "../../service/etc/SendMailService";

const routes = Router();

routes.post('/sendmail', Wrap(async (req, res) => {
  try {
    const is_send_success = await SendMail_Service.createSendMail(req.body)
    const result = new StdObject();
    result.add('result', is_send_success);
    res.json(result);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.post('/contact_us', Wrap(async (req, res, next) => {
  const is_success = await ContactUsService.createContactUs(req.body)
  const result = new StdObject();
  result.add('result', is_success);
  res.json(result);
}));

export default routes;
