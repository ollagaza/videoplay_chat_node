import { Router } from 'express';
import php from 'phpjs';

import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import MemberAuthMailModel from '@/models/MemberAuthMailModel';
import Auth from '@/middlewares/auth.middleware';

const routes = Router();
/**
 * @api {post} /auth 회원 인증
 * @apiName AuthenticationUser
 * @apiGroup Auth
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} Content-Type=application/json json content type
 *
 * @apiParam {String} email 회원등록 시 입력한 이메일 주소
 * @apiParam {String} password 회원등록 시 입력한 비밀번호
 *
 * @apiParamExample {json} 회원 로그인 정보
 * {
 *  "email": "test@mteg.com",
 *  "password": "1111"
 * }
 *
 * @apiSuccess {String} token 인증토큰
 *
 * @apiSuccessExample 회원 인증 성공
 * HTTP/1.1 200 OK
 * {
 *  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbmZvIjp7ImlkIjoyNSwicm9sZSI6NSwiaG9zcGl0YWwiOiJFSE1EIiwiYnJhbmNoIjoiT0JHIn0sImlhdCI6MTU0NDc2Mjg2OCwiZXhwIjoxNTQ0ODQ5MjY4fQ.ZZN2gdxdv8iLZolEj0ttYUQd0gj_wH3Uw476MCIIEBw"
 * }
 *
 */
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
    throw new StdObject(-1, "등록된 회원 정보가 없습니다.");
  }

  if (member_info.password != php.md5(password)) {
    throw new StdObject(-1, "회원정보가 일치하지 않습니다.");
  }

  const member_seq = member_info.seq;

  const has_auth_mail = await new MemberAuthMailModel({ database }).hasAuthMail(member_seq);
  if (has_auth_mail) {
    throw new StdObject(-1, "이메일 인증 후 사용 가능합니다.");
  }

  const token_result = await Auth.generateTokenByMemberInfo(member_info);

  const output = new StdObject();
  if (token_result != null && token_result.token != null) {
    output.add("token", token_result.token);
    Auth.setAuthHeader(res, token_result.token);
  }
  else {
    output.setError(-1);
    output.setMessage("인증토큰 생성 실패");
  }

  return res.json(output);
}));


/**
 * @api {post} /auth/email 이메일 인증
 * @apiName AuthenticationMail
 * @apiGroup Auth
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} Content-Type=application/json json content type
 *
 * @apiParam {String} member_seq 인증메일로 발송한 회원 고유 번호
 * @apiParam {String} auth_key 인증메일로 이메일 인증 키
 *
 * @apiParamExample {json} 이메일 인증 정보
 * {
 *  "auth_key": "a9830839569fd5d1778c6a4661a620c8",
 *  "member_seq": "54"
 * }
 *
 * @apiSuccess {Boolean} success 회원가입 성공 true
 *
 */
routes.post('/email', Wrap(async(req, res) => {
  req.accepts('application/json');

  if (!req.body || !req.body.auth_key || !req.body.member_seq) {
    throw new StdObject(-1, "잘못된 접근입니다.", 400);
  }

  const member_seq = req.body.member_seq;
  const auth_key = req.body.auth_key;

  const member_auth_mail_model =  new MemberAuthMailModel({ database });
  const has_auth_mail = await member_auth_mail_model.hasAuthMail(member_seq, auth_key);
  if (has_auth_mail == false) {
    throw new StdObject(-1, "인증정보가 존재하지 않습니다.", 400);
  }

  member_auth_mail_model.deleteAuthMail(member_seq);

  res.json(new StdObject());
}));

export default routes;
