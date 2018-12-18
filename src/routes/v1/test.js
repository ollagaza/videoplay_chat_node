import {Router} from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import Util from '@/utils/baseutil';
import DoctorModel from '@/models/DoctorModel';
import database from '@/config/database';

const routes = Router();

routes.get('/xml/:xml_name', wrap(async (req, res) => {
  const xml_name = req.params.xml_name;
  const media_path = "C:\\surgbook\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\";

  const json = await Util.loadXmlFile(media_path, xml_name + '.xml');
  const output = new StdObject();
  output.add('xml', json);

  await Util.writeXmlFile(media_path, xml_name + '2.xml', json);

  res.json(output);
}));

routes.get('/mail', wrap(async (req, res) => {
  await new SendMail().test();
  res.send('ok');
}));

export default routes;
