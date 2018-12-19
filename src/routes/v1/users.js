import { Router } from 'express';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import MemberAuthMailModel from '@/models/MemberAuthMailModel';
import Util from '@/utils/baseutil';
import member_template from '@/template/mail/member.template';
import MemberInfo from "@/classes/surgbook/MemberInfo";

const routes = Router();

/**
 * @swagger
 * tags:
 *  name: Users
 *  description: 회원정보 조회, 수정
 *
 */

/**
 * @swagger
 * /users/me:
 *  get:
 *    summary: "토큰에 저장된 정보로 본인의 정보 확인"
 *    tags: [Users]
 *    security:
 *    - access_token: []
 *    produces:
 *    - "application/json"
 *    responses:
 *      200:
 *        description: "회원정보"
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
 *              type: "object"
 *              description: "결과 정보"
 *              properties:
 *                member_info:
 *                  $ref: "#definitions/UserInfo"
 *
 */
routes.get('/me', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const member_info = await new MemberModel({database}).getMemberInfo(member_seq);

  // 메니저 권한 도입 시 예시. 병원 또는 부서가 동일한지 체크..
  if(token_info.getRole() == roles.MANAGER){
    if(token_info.getHospital() != member_info.hospital_code || token_info.getBranch() != member_info.branch_code) {
      throw new StdObject(-1, "권한이 없습니다.", 403);
    }
  }

  const output = new StdObject();
  output.add('member_info', member_info);
  res.json(output);
}));

/**
 * @swagger
 * /users/{member_seq}:
 *  get:
 *    summary: "회원 고유번호로 회원정보 찾기"
 *    tags: [Users]
 *    security:
 *    - access_token: []
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
 *              type: "object"
 *              description: "결과 정보"
 *              properties:
 *                member_info:
 *                  $ref: "#definitions/UserInfo"
 *
 */
routes.get('/:member_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
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
  output.add('member_info', member_info);
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
routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');

  const member_info = new MemberInfo(req.body, ['password_confirm']);
  member_info.checkDefaultParams();
  member_info.checkUserName();
  member_info.checkEmailAddress();
  member_info.checkPassword();

  // 커밋과 롤백은 자동임
  await database.transaction(async(trx) => {
    // 트랜잭션 사용해야 하므로 trx를 넘김
    const oMemberModel = new MemberModel({ database: trx });

    // 사용자 삽입
    const member_seq = await oMemberModel.createMember(member_info);
    if (member_seq <= 0){
      throw new StdObject(-1, '회원정보 생성 실패', 500);
    }

    const email_address = member_info.email_address;

    const mail_auth_key = await new MemberAuthMailModel({ database: trx }).getMailAuthKey(member_seq, email_address);
    if (mail_auth_key == null) {
      throw new StdObject(-1, '이메일 인증정보 생성 실패', 500);
    }

    const template_data = {
      "user_name": member_info.user_name,
      "auth_key": mail_auth_key,
      "member_seq": member_seq
    };
    const send_mail_result = await new SendMail().sendMailHtml([email_address], 'MTEG 가입 인증 메일입니다.', member_template.createUser(template_data));

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
 *    security:
 *    - access_token: []
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
 *
 */
routes.put('/:member_seq(\\d+)', Auth.isAuthenticated(roles.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');

  const token_info = req.token_info;
  const member_seq = req.params.member_seq;

  if(token_info.getId() != member_seq){
    if(token_info.getRole() == roles.MEMBER){
      throw new StdObject(-1, "잘못된 요청입니다.", 403);
    }
  }

  const member_info = new MemberInfo(req.body, ['seq', 'password_confirm']);
  member_info.checkDefaultParams();
  member_info.checkUserName();
  member_info.checkPassword(false);

  await database.transaction(async(trx) => {
    const oMemberModel = new MemberModel({ database: trx });

    // 사용자 정보 수정
    const result = await oMemberModel.modifyMember(member_seq, member_info);
    if (!result) {
      throw new StdObject(-1, '회원정보 수정 실패', 400);
    }
    const output = new StdObject();
    res.json(output);
  });
}));


/**
 * @swagger
 * /users/find:
 *  post:
 *    summary: "회원정보검색 후 비밀번호를 재설정하고 이메일 발송"
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
routes.post('/find', Wrap(async(req, res) => {
  req.accepts('application/json');

  const member_info = new MemberInfo(req.body);
  member_info.setKeys(['user_name', 'email_address', 'cellphone']);
  member_info.checkUserName();
  member_info.checkEmailAddress();
  member_info.checkCellphone();

  await database.transaction(async(trx) => {
    const oMemberModel = new MemberModel({ database: trx });
    const find_info = await oMemberModel.findMember(member_info);
    const temp_password = Util.getRandomString();
    const update_result = await oMemberModel.updateTempPassword(find_info.seq, temp_password);
    if (!update_result) {
      throw new StdObject(-1, '비밀번호 재설정 실패', 400);
    }

    const template_data = {
      "user_name": find_info.user_name,
      "email_address": find_info.email_address,
      "tmp_password": temp_password
    };

    const send_mail_result = await new SendMail().sendMailHtml([find_info.email_address], 'MTEG 계정정보 찾기를 요청하셨습니다.', member_template.findUserInfo(template_data));
    if (send_mail_result.isSuccess() == false) {
      throw send_mail_result;
    }

    const output = new StdObject();
    res.json(output);
  });
}));

export default routes;
