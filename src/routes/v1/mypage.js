import {Router} from 'express';
import Auth from '@/middlewares/auth.middleware';
import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import Util from '@/utils/baseutil';
import service_config from '@/config/service.config';
import Constants from '@/config/constants';
import log from "@/classes/Logger";
import MemberLogModel from "@/models/MemberLogModel";

const routes = Router();

routes.post('/notice', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_seq = req.body.seq;
  const output = new StdObject();

  await database.transaction(async(trx) => {
    const oMemberLogModel = new MemberLogModel({database: trx});
    const lang = Auth.getLanguage(req);
    const result = await oMemberLogModel.getMemberLog(lang, user_seq);
    output.add("notices", result);
  });

  res.json(output);
}));

export default routes;