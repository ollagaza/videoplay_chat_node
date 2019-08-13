import {Router} from 'express';
import roles from "@/config/roles";
import Auth from '@/middlewares/auth.middleware';
import Wrap from '@/utils/express-async';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import MemberModel from '@/models/MemberModel';

const routes = Router();

routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');

  if (!req.body || !req.body.user_id) {
    const output = new StdObject(-1, "잘못된 요청입니다.", 400);
    return res.json(output);
  }

  const user_id = req.body.user_id;
  const member_model = new MemberModel({ database });
  const member_info = await member_model.findOne({"user_id": user_id});

  if (member_info == null || member_info.user_id !== user_id) {
    throw new StdObject(-1, "등록된 회원 정보가 없습니다.", 400);
  }

  const output = await Auth.getTokenResult(res, member_info, roles.API);

  return res.json(output);
}));

export default routes;
