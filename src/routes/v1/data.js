import { Router } from 'express';
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import ServiceConfig from '../../service/service-config'

import MedicalSubject from '../../data/MedicalSubject';

const routes = Router();

routes.get('/timestamp', Wrap(async(req, res) => {
  const now = Date.now();
  const output = new StdObject();
  output.add('timestamp', Math.floor(now / 1000));
  output.add('timestamp_mil', now);
  res.json(output);
}));

routes.get('/medical_subject', Wrap(async(req, res) => {
  const output = new StdObject();
  output.add('medical_subject', MedicalSubject.getJson());
  res.json(output);
}));

routes.get('/socket_url', Wrap(async(req, res) => {
  const output = new StdObject();
  output.add('url', ServiceConfig.get('socket_front_server_ip'));
  res.json(output);
}));

export default routes;
