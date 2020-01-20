import { Router } from 'express';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';

const routes = Router();

routes.get('/reload', Wrap(async(req, res) => {
  await ServiceConfig.load();
  res.json(new StdObject());
}));

export default routes;
