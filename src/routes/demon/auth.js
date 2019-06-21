import {Router} from 'express';
import service_config from '@/config/service.config';
import roles from "@/config/roles";
import Auth from '@/middlewares/auth.middleware';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import log from "@/classes/Logger";
import MemberModel from '@/models/MemberModel';
import Constants from '@/config/constants';

const routes = Router();

routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');

  if (!req.body || !req.body.user_id) {
    const output = new StdObject(-1, "아이디 비밀번호를 확인해 주세요.", 400);
    return res.json(output);
  }

  const user_id = req.body.user_id;
  const member_model = new MemberModel({ database });
  const member_info = await member_model.findOne({"user_id": user_id});

  if (member_info == null || member_info.user_id !== user_id) {
    throw new StdObject(-1, "등록된 회원 정보가 없습니다.", 400);
  }

  member_info.role = roles.API;

  const token_result = await Auth.generateTokenByMemberInfo(member_info, true);

  const output = new StdObject();
  if (token_result != null && token_result.token != null) {
    output.add("token", token_result.token);
    output.add("remain_time", token_result.remain);
    output.add("member_seq", member_info.seq);
    output.add("role", token_result.token_info.getRole());
    Auth.setResponseHeader(res, token_result.token_info);
  }
  else {
    output.setError(-1);
    output.setMessage("인증토큰 생성 실패");
    output.httpStatusCode = 500;
  }

  return res.json(output);
}));

export default routes;
