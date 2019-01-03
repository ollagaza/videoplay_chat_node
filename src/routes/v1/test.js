import {Router} from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';

const routes = Router();

routes.get('/crypto', wrap(async (req, res) => {
  const data = {
    r: Util.getRandomString(5),
    s: 155
  };

  const enc_text = Util.encrypt(data);
  const dec = JSON.parse(Util.decrypt(enc_text));

  const output = new StdObject();
  output.add("enc", enc_text);
  output.add("dec", dec);

  res.json(output);
}));

routes.get('/xml/:xml_name', wrap(async (req, res) => {
  const xml_name = req.params.xml_name;
  const media_path = "C:\\surgbook\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\";

  const json = await Util.loadXmlFile(media_path, xml_name + '.xml');
  const output = new StdObject();
  output.add('xml', json);

  await Util.writeXmlFile(media_path, xml_name + '2.xml', json);

  res.json(output);
}));

routes.get('/replace', wrap(async (req, res) => {
  const source = "SEQ\\Trans_180510_000167418_M_s001.mp4";
  const dest_rename_regex = /^[\w]+\\([\w]+)\.([\w]+)$/i;
  const start_frame = 12456;
  const end_frame = 35717;
  res.send(source.replace(dest_rename_regex, 'Clip\\$1_' + start_frame + '_' + end_frame + '.$2'));
}));

routes.get('/mail', wrap(async (req, res) => {
  await new SendMail().test();
  res.send('ok');
}));

routes.get('/token', wrap(async (req, res) => {
  const result = await Auth.verifyToken(req);
  res.json(result);
}));

export default routes;
