import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import DBMySQL from "../../database/knex-mysql";
import Util from "../../utils/baseutil";
import ServiceConfig from "../../service/service-config";
import ContactUsService from '../../service/etc/ContactUsService'
import SendMail_Service from "../../service/etc/SendMailService";
import EditorService from "../../service/etc/EditorService";

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

routes.put('/editorimage/:contentid', Wrap(async(req, res) => {
  try {
    const contentid = req.params.contentid;
    const output = new StdObject();
    const result = await EditorService.uploadEditorImage(contentid, req, res)
    output.add('result', result);
    output.add('path', Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), `/editor/${contentid}/${result.filename}`));
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.post('/checkeditorimage', Wrap(async(req, res) => {
  try {
    const contentid = req.body.contentid;
    const arrImages = req.body.arrImages;
    const output = new StdObject();
    const result = await EditorService.checkImageFiles(contentid, arrImages)
    output.add('result', result);
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.post('/deletecontentdirectory', Wrap(async(req, res) => {
  try {
    const contentid = req.body.contentid;
    const output = new StdObject();
    const result = await EditorService.deleteContentDirectory(contentid)
    output.add('result', result);
    res.json(output);
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
