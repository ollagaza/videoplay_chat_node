import { Router } from 'express';
import wrap from '@/utils/express-async';
import auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import MemberAuthMailModel from '@/models/MemberAuthMailModel';
import Util from '@/utils/baseutil';
import member_template from '@/template/mail/member.template';

const routes = Router();

/**
 * @swagger
 * tags:
 *  name: Users
 *  description: 회원정보 조회, 수정
 *
 */

const checkUserParams = (params) => {
  if (Util.isEmpty(params)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400);
  }
  if (Util.isEmpty(params.position)) {
    throw new StdObject(-1, '핸드폰 번호를 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.license_no)) {
    throw new StdObject(-1, '면허번호을(를) 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.hospital_code)) {
    throw new StdObject(-1, '병원명을 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.branch_code)) {
    throw new StdObject(-1, '진료분야를 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.position)) {
    throw new StdObject(-1, '직위를 입력해 주세요.', 400);
  }
}

/**
 * @swagger
 * /users/{member_seq}:
 *  get:
 *    summary: "회원 고유번호로 회원정보 찾기"
 *    tags: [Users]
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "member_seq"
 *      in: "path"
 *      description: "회원 고유번호"
 *      required: true
 *      type: "integer"
 *    responses:
 *      200:
 *        description: "회원정보"
 *        schema:
 *           $ref: "#/definitions/UserInfo"
 *    security:
 *    - access_token: []
 */
routes.get('/:member_seq(\\d+)', auth.isAuthenticated(roles.LOGIN_USER), wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = req.params.member_seq;

  if (token_info.getId() != member_seq){
    if(token_info.getRole() == roles.MEMBER){
      throw new StdObject(-1, "잘못된 요청입니다.", 403);
    }
  }

  const member_info = await new MemberModel({database}).getMemberInfo(member_seq);

  // 메니저 권한 도입 시 예시. 병원 또는 부서가 동일한지 체크..
  if(token_info.getRole() == roles.MANAGER){
    if(token_info.getHospital() != member_info.hospital_code || token_info.getBranch() != member_info.branch_code) {
      throw new StdObject(-1, "권한이 없습니다.", 403);
    }
  }

  const output = new StdObject();
  output.adds(member_info);
  res.json(output);
}));

/**
 * @swagger
 * /users:
 *  post:
 *    summary: "회원을 생성하고 인증메일을 발송한다"
 *    tags: [Users]
 *    consumes:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "body"
 *      in: "body"
 *      description: "회원 가입 정보"
 *      required: true
 *      schema:
 *        $ref: "#/definitions/UserCreateInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *
 */
routes.post('/', wrap(async(req, res) => {
  req.accepts('application/json');

  const params = req.body;

  checkUserParams(params);
  if (Util.isEmpty(params.user_name)) {
    throw new StdObject(-1, '성명을 입력해 주세요.', 400);
  }
  if (params.user_name.length > 10) {
    return new StdObject(-1, '이름은 열자 이하로 입력하셔야 합니다.', 400);
  }
  if (Util.isEmpty(params.email_address)) {
    throw new StdObject(-1, '아이디를 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.password)) {
    throw new StdObject(-1, '암호를 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.password_confirm)) {
    throw new StdObject(-1, '암호확인을 입력해 주세요.', 400);
  }

  params.password = Util.trim(params.password);
  params.password_confirm = Util.trim(params.password_confirm);
  if (params.password != params.password_confirm) {
    throw new StdObject(-1, '입력하신 암호화 암호확인이 일치하지 않습니다.', 400);
  }

  // 커밋과 롤백은 자동임
  await database.transaction(async(trx) => {
    // 트랜잭션 사용해야 하므로 trx를 넘김
    const oMemberModel = new MemberModel({ database: trx });

    // 사용자 삽입
    const member_seq = await oMemberModel.createMember(params);
    if (member_seq <= 0){
      throw new StdObject(-1, '회원정보 생성 실패', 500);
    }

    const email_address = params.email_address;

    const mail_auth_key = await new MemberAuthMailModel({ database: trx }).getMailAuthKey(member_seq, email_address);
    if (mail_auth_key == null) {
      throw new StdObject(-1, '이메일 인증정보 생성 실패', 500);
    }

    const template_data = {
      "user_name": params.user_name,
      "auth_key": mail_auth_key,
      "member_seq": member_seq
    };
    const send_mail_result = await new SendMail().sendMailHtml([email_address], 'MTEG 가입 인증 메일입니다.', member_template.create(template_data));

    if (send_mail_result.isSuccess()) {
      res.json(new StdObject());
    } else {
      throw send_mail_result;
    }
  });
}));

/**
 * @swagger
 * /users/{member_seq}:
 *  put:
 *    summary: "회원정보를 수정한다"
 *    tags: [Users]
 *    consumes:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "member_seq"
 *      in: "path"
 *      description: "회원 고유번호"
 *      required: true
 *      type: "integer"
 *    - name: "body"
 *      in: "body"
 *      description: "수정 할 회원 정보"
 *      required: true
 *      schema:
 *        $ref: "#/definitions/UserModifyInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *    security:
 *    - access_token: []
 *
 */
routes.put('/:member_seq(\\d+)', auth.isAuthenticated(roles.DEFAULT), wrap(async(req, res) => {
  req.accepts('application/json');

  const token_info = req.token_info;
  const member_seq = req.params.member_seq;

  if(token_info.getId() != member_seq){
    if(token_info.getRole() == roles.MEMBER){
      throw new StdObject(-1, "잘못된 요청입니다.", 403);
    }
  }

  const params = req.body;
  checkUserParams(params);

  if (Util.isEmpty(params.user_name) == false) {
    if (params.user_name.length > 10) {
      return new StdObject(-1, '이름은 열자 이하로 입력하셔야 합니다.', 400);
    }
  }

  if (Util.isEmpty(params.password) == false) {
    if (Util.isEmpty(params.password_confirm)) {
      throw new StdObject(-1, '암호확인을 입력해 주세요.', 400);
    }
  }

  params.password = Util.trim(params.password);
  params.password_confirm = Util.trim(params.password_confirm);
  if (params.password != params.password_confirm) {
    throw new StdObject(-1, '입력하신 암호화 암호확인이 일치하지 않습니다.', 400);
  }

  await database.transaction(async(trx) => {
    const oMemberModel = new MemberModel({ database: trx });

    // 사용자 정보 수정
    const result = await oMemberModel.modifyMember(member_seq, params);
    if (!result) {
      throw new StdObject(-1, '회원정보 수정 실패', 400);
    }
    const output = new StdObject();
    res.json(output);
  });
}));


/**
 * @swagger
 * /users/reset/password:
 *  put:
 *    summary: "회원의 비밀번호를 무작위로 재 설정하고 이메일을 발송한다."
 *    tags: [Users]
 *    consumes:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "body"
 *      in: "body"
 *      description: "회원가입 확인을 위한 기본 정보"
 *      required: true
 *      schema:
 *        $ref: "#/definitions/UserResetPasswordInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *
 */
routes.put('/reset/password', wrap(async(req, res) => {
  req.accepts('application/json');

  const params = req.body;

  if (Util.isEmpty(params.user_name) == false) {
    throw new StdObject(-1, '성명을 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.email_address) == false) {
    throw new StdObject(-1, '아이디를 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.cellphone) == false) {
    throw new StdObject(-1, '핸드폰 번호를 입력해 주세요.', 400);
  }

  await database.transaction(async(trx) => {
    const oMemberModel = new MemberModel({ database: trx });

    // 사용자 정보 수정
    const result = await oMemberModel.resetPassword(member_seq, params);
    if (!result) {
      throw new StdObject(-1, '회원정보 수정 실패', 400);
    }
    const output = new StdObject();
    res.json(output);
  });
}));

export default routes;
