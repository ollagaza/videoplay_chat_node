import { Router } from 'express';
import Wrap from '@/utils/express-async';
import StdObject from "@/classes/StdObject";
import service_config from '@/config/service.config';

const routes = Router();

routes.get('/reload', Wrap(async(req, res) => {
  await service_config.load();
  res.json(new StdObject());
}));

export default routes;
