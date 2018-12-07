import { Router } from 'express';
import php from 'phpjs';

import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import MemberAuthMailModel from '@/models/MemberAuthMailModel';
import Auth from '@/middlewares/auth.middleware';

const routes = Router();

routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');

  if (!req.body || !req.body.email || !req.body.password) {
    const output = new StdObject(-1, "이메일과 패스워드를 정확하게 입력해 주세요.");
    return res.json(output);
  }

  const email = req.body.email;
  const password = req.body.password;

  const member_model = new MemberModel({ database });
  const member_info = await member_model.findOne({"email_address": email});

  if (member_info == null || member_info.email_address != email) {
    const output = new StdObject(-1, "등록된 회원 정보가 없습니다.");
    return res.json(output);
  }

  if (member_info.password != php.md5(password)) {
    const output = new StdObject(-1, "회원정보가 일치하지 않습니다.");
    return res.json(output);
  }

  const seq = member_info.seq;

  const member_auth_mail_model = new MemberAuthMailModel({ database });
  const member_auth_info = await member_auth_mail_model.findOne({"member_seq": seq});
  if (member_auth_info != null) {
    const output = new StdObject(-1, "이메일 인증 후 사용 가능합니다.");
    return res.json(output);
  }

  const token = Auth.generateTokenByMemberInfo(member_info);

  const output = new StdObject();
  if (token != null) {
    output.add("token", Auth.generateTokenByMemberInfo(member_info));
    Auth.setAuthHeader(res, token);
  }
  else {
    output.setError(-1);
    output.setMessage("인증토큰 생성 실패");
  }

  return res.json(output);
}));

export default routes;
