import { Router } from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import Util from '@/utils/baseutil';
import DoctorModel from '@/models/DoctorModel';
import database from '@/config/database';

const routes = Router();

let aa = 0;

routes.get('/media/:media_id', wrap(async(req, res) => {
  const media_info = await new DoctorModel({ database }).getMediaInfo(req.params.media_id, true);

  const output = new StdObject();

  output.add('media', media_info.toJson());

  res.json(output);
}));

routes.get('/add', wrap(async(req, res) => {
  aa++;
  res.send({'aa': aa});
}));

routes.post('/media/operation/:media_id', wrap(async(req, res) => {
  req.accepts('application/json');

  const result = await new DoctorModel({ database }).updateOperationInfo(req.params.media_id, req.body);
  console.log(result);

  const output = new StdObject();
  output.add('result', result);

  res.json(output);
}));


routes.get('/checkutils', wrap(async(req, res) => {

  const media_root = "C:\\surgbook";
  const media_path = "\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\SEQ\\";

  const output = new StdObject();

  output.add('dir', Util.getMediaDirectory(media_root, media_path));
  output.add('url', Util.getUrlPrefix(media_root, media_path));

  const file_info = Util.parseIndexFileName('Trans_180510_000167418_M_s001.mp4_1540100496_10496_0x00000004_0.jpg');
  output.add('fileInfo', file_info);
  output.add('videoName', file_info.getVideoName());

  const time_str = '03:10:25';
  const sec = Util.timeStrToSecond(time_str);
  output.add('time_str', time_str);
  output.add('sec', sec);
  output.add('timeStr', Util.secondToTimeStr(sec));

  const json = await Util.loadXmlFile(media_root, media_path, 'Custom');
  output.add('xml', json);

  Util.writeXmlFile(media_root, media_path, 'Custom2', json);

  res.json(output);
}));



export default routes;
