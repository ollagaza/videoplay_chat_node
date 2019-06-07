import { Router } from 'express';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import MemberAuthMailModel from '@/models/MemberAuthMailModel';
import Util from '@/utils/baseutil';

const routes = Router();
/**
 * @swagger
 * tags:
 *  name: Auth
 *  description: 회원, 이메일 인증
 * definitions:
 *  AuthLogin:
 *    type: "object"
 *    description: "로그인을 위한 회원 정보"
 *    properties:
 *      email_address:
 *        type: "string"
 *        description: "이메일 주소"
 *      password:
 *        type: "string"
 *        description: "비밀번호"
 *    required:
 *      - email_address
 *      - password
 *  AuthEmail:
 *    type: "object"
 *    description: "이메일 인증 정보"
 *    properties:
 *      auth_key:
 *        type: "string"
 *        description: "이메일 인증용 랜덤키"
 *      member_seq:
 *        type: "integer"
 *        description: "회원 고유번호"
 *    required:
 *      - auth_key
 *      - member_seq
 *  AuthAccessToken:
 *    type: "object"
 *    description: "인증 토큰 정보"
 *    properties:
 *      token:
 *        type: "string"
 *        description: "api access token"
 *      remain_time:
 *        type: "integer"
 *        description: "토큰 만료까지 남은 시간"
 *      member_seq:
 *        type: "integer"
 *        description: "회원 고유번호"
 *      role:
 *        type: "integer"
 *        description: "회원 권한 (5: 의사, 8: 매니저, 99: 관리자)"
 */

/**
 * @swagger
 * /auth:
 *  post:
 *    summary: "아이디, 비밀번호로 회원 인증 후 토큰발급"
 *    tags: [Auth]
 *    consumes:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "body"
 *      in: "body"
 *      description: "회원 아이디, 비밀번호"
 *      required: true
 *      schema:
 *         $ref: "#/definitions/AuthLogin"
 *    responses:
 *      200:
 *        description: "인증 토큰 정보"
 *        schema:
 *          type: "object"
 *          properties:
 *            error:
 *              type: "integer"
 *              description: "에러코드"
 *              default: 0
 *            message:
 *              type: "string"
 *              description: "에러 메시지"
 *              default: ""
 *            httpStatusCode:
 *              type: "integer"
 *              description: "HTTP Status Code"
 *              default: 200
 *            variables:
 *              $ref: "#/definitions/AuthAccessToken"
 *
 */
routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');

  if (!req.body || !req.body.user_id || !req.body.password) {
    const output = new StdObject(-1, "아이디 비밀번호를 확인해 주세요.", 400);
    return res.json(output);
  }

  const user_id = req.body.user_id;
  const password = req.body.password;

  const member_model = new MemberModel({ database });
  const member_info = await member_model.findOne({"user_id": user_id});

  if (member_info == null || member_info.user_id != user_id) {
    throw new StdObject(-1, "등록된 회원 정보가 없습니다.", 400);
  }

  // 임시 프리패스 비밀번호 설정. 데이터 연동 확인 후 삭제
  if (password !== 'dpaxldlwl_!') {
    if (member_info.password.length <= 32) {
      if (member_info.password !== Util.md5(password)){
        throw new StdObject(-1, "회원정보가 일치하지 않습니다.", 400);
      }
      await member_model.upgradePassword(member_info.seq, password);
    } else {
      if (member_info.password !== member_model.encryptPassword(password)) {
        throw new StdObject(-1, "회원정보가 일치하지 않습니다.", 400);
      }
      await member_model.updateLastLogin(member_info.seq);
    }
  }

  const member_seq = member_info.seq;

  const has_auth_mail = await new MemberAuthMailModel({ database }).hasAuthMail(member_seq);
  if (has_auth_mail) {
    throw new StdObject(-1, "이메일 인증 후 사용 가능합니다.", 400);
  }

  member_info.role = roles.MEMBER;

  const token_result = await Auth.generateTokenByMemberInfo(member_info);

  const output = new StdObject();
  if (token_result != null && token_result.token != null) {
    output.add("token", token_result.token);
    output.add("remain_time", token_result.remain);
    output.add("member_seq", member_seq);
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

/**
 * @swagger
 * /email:
 *  post:
 *    summary: "회원 이메일 인증"
 *    tags: [Auth]
 *    consumes:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "body"
 *      in: "body"
 *      description: "회원 고유번호, 이메일 인증 키"
 *      required: true
 *      schema:
 *         $ref: "#/definitions/AuthEmail"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
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

/**
 * @swagger
 * /auth/token/refresh:
 *  post:
 *    summary: "토큰 재발급"
 *    tags: [Auth]
 *    security:
 *    - access_token: []
 *    produces:
 *    - "application/json"
 *    responses:
 *      200:
 *        description: "인증 토큰 정보"
 *        schema:
 *          type: "object"
 *          properties:
 *            error:
 *              type: "integer"
 *              description: "에러코드"
 *              default: 0
 *            message:
 *              type: "string"
 *              description: "에러 메시지"
 *              default: ""
 *            httpStatusCode:
 *              type: "integer"
 *              description: "HTTP Status Code"
 *              default: 200
 *            variables:
 *              $ref: "#/definitions/AuthAccessToken"
 *
 */
routes.post('/token/refresh', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();

  const member_model = new MemberModel({ database });
  const member_info = await member_model.findOne({"seq": member_seq});

  member_info.role = roles.MEMBER;

  const token_result = await Auth.generateTokenByMemberInfo(member_info);

  const output = new StdObject();
  if (token_result != null && token_result.token != null) {
    output.add("token", token_result.token);
    output.add("remain_time", token_result.remain);
    output.add("member_seq", member_seq);
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
