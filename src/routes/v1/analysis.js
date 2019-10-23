import {Router} from 'express';
import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import analisys from '@/data/analysis_response';
import log from "@/classes/Logger";

const routes = Router();

routes.get('/analysis_data', Wrap(async(req, res) => {
  const output = new StdObject();
  output.add('analysis_data', analisys.getJson());
  res.json(output);
}));

export default routes;