import {Router} from 'express';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import FindPasswordModel from '@/models/FindPasswordModel';
import Util from '@/utils/baseutil';
import MemberTemplate from '@/template/mail/member.template';
import MemberInfo from "@/classes/surgbook/MemberInfo";
import service_config from '@/config/service.config';

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

  if (token_info.getId() !== member_seq){
    if(token_info.getRole() === roles.MEMBER){
      throw new StdObject(-1, "잘못된 요청입니다.", 403);
    }
  }

  const member_info = await new MemberModel({database}).getMemberInfo(member_seq);
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

  const member_info = new MemberInfo(req.body, ['password_confirm', 'url_prefix', 'request_domain']);
  member_info.checkDefaultParams();
  member_info.checkUserId();
  member_info.checkPassword();
  member_info.checkUserName();
  member_info.checkUserNickname();
  member_info.checkEmailAddress();

  // 커밋과 롤백은 자동임
  await database.transaction(async(trx) => {
    // 트랜잭션 사용해야 하므로 trx를 넘김
    const oMemberModel = new MemberModel({ database: trx });

    // 사용자 삽입
    const member_seq = await oMemberModel.createMember(member_info);
    if (member_seq <= 0){
      throw new StdObject(-1, '회원정보 생성 실패', 500);
    }

    // const email_address = member_info.email_address;
    //
    // const mail_auth_key = await new MemberAuthMailModel({ database: trx }).getMailAuthKey(member_seq, email_address);
    // if (mail_auth_key == null) {
    //   throw new StdObject(-1, '이메일 인증정보 생성 실패', 500);
    // }
    //
    // const template_data = {
    //   "user_name": member_info.user_name,
    //   "auth_key": mail_auth_key,
    //   "member_seq": member_seq,
    //   "url_prefix": req.body.url_prefix,
    //   "request_domain": req.body.request_domain
    // };
    // const send_mail_result = await new SendMail().sendMailHtml([email_address], 'MTEG 가입 인증 메일입니다.', MemberTemplate.createUser(template_data));
    //
    // if (!send_mail_result.isSuccess()) {
    //   throw send_mail_result;
    // }
  });

  res.json(new StdObject());
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
  const member_seq = Util.parseInt(req.params.member_seq);

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
  });

  res.json(new StdObject());
}));

routes.post('/find/id', Wrap(async(req, res) => {
  req.accepts('application/json');

  const member_info = new MemberInfo(req.body);
  member_info.setKeys(['user_name', 'email_address']);
  member_info.checkUserName();
  member_info.checkEmailAddress();

  const output = new StdObject();
  let is_find = false;
  await database.transaction(async(trx) => {
    const oMemberModel = new MemberModel({ database: trx });
    const find_member_info = await oMemberModel.findMemberId(member_info);
    if (find_member_info && !find_member_info.isEmpty()) {
      output.add('user_id', find_member_info.user_id);
      output.add('user_name', find_member_info.user_name);
      output.add('email_address', find_member_info.email_address);
      is_find = true;
    }
  });
  output.add('is_find', is_find);
  res.json(output);
}));

routes.post('/send_auth_code', Wrap(async(req, res) => {
  req.accepts('application/json');

  const member_info = new MemberInfo(req.body);
  member_info.setKeys(['user_name', 'email_address', 'user_id']);
  member_info.checkUserId();
  member_info.checkUserName();
  member_info.checkEmailAddress();

  const output = new StdObject();
  let is_send = false;
  await database.transaction(async(trx) => {
    const remain_time = 600;
    const expire_time = Math.floor(Date.now() / 1000) + remain_time;

    const member_model = new MemberModel({ database: trx });
    const find_member_info = await member_model.findMemberInfo(member_info);
    if (find_member_info && !find_member_info.isEmpty()) {
      const auth_info = await new FindPasswordModel( { database: trx }).createAuthInfo(find_member_info.seq, find_member_info.email_address, expire_time);
      output.add('seq', auth_info.seq);
      output.add('check_code', auth_info.check_code);
      output.add('remain_time', remain_time);

      const template_data = {
        "user_name": find_member_info.user_name,
        "user_id": find_member_info.user_id,
        "email_address": find_member_info.email_address,
        "send_code": auth_info.send_code,
        "url_prefix": req.body.url_prefix,
        "request_domain": req.body.request_domain
      };

      const send_mail_result = await new SendMail().sendMailHtml([find_member_info.email_address], 'Surgstory 비밀번호 인증코드 입니다.', MemberTemplate.findUserInfo(template_data));
      if (send_mail_result.isSuccess() == false) {
        throw send_mail_result;
      }

      is_send = true;
    }
  });
  output.add('is_send', is_send);
  res.json(output);
}));

routes.post('/check_auth_code', Wrap(async(req, res) => {
  req.accepts('application/json');

  const output = new StdObject();
  let is_verify = false;
  await database.transaction(async(trx) => {
    const find_password_model = new FindPasswordModel( { database: trx });
    const auth_info = await find_password_model.findAuthInfo(req.body.seq);
    if (!auth_info) {
      throw new StdObject(-1, '인증정보를 찾을 수 없습니다.', 400);
    }
    if (auth_info.send_code === req.body.send_code && auth_info.check_code === req.body.check_code) {
      await find_password_model.setVerify(req.body.seq);
      is_verify = true;
    } else {
      throw new StdObject(-1, '인증코드가 일치하지 않습니다.', 400);
    }
  });
  output.add('is_verify', is_verify);
  res.json(output);
}));

routes.post('/change_password', Wrap(async(req, res) => {
  req.accepts('application/json');

  if (req.body.password !== req.body.password_confirm) {
    throw new StdObject(-1, '입력한 비밀번호가 일치하지 않습니다.', 400);
  }

  const output = new StdObject();
  let is_change = false;
  await database.transaction(async(trx) => {
    const find_password_model = new FindPasswordModel( { database: trx });
    const auth_info = await find_password_model.findAuthInfo(req.body.seq);
    if (!auth_info) {
      throw new StdObject(-1, '인증정보를 찾을 수 없습니다.', 400);
    }
    if (auth_info.is_verify === 1) {
      const member_model = new MemberModel({ database: trx });
      await member_model.changePassword(auth_info.member_seq, req.body.password);
      is_change = true;
    } else {
      throw new StdObject(-2, '인증정보가 존재하지 않습니다.', 400);
    }
  });
  output.add('is_change', is_change);
  res.json(output);
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
      "tmp_password": temp_password,
      "url_prefix": req.body.url_prefix,
      "request_domain": req.body.request_domain
    };

    const send_mail_result = await new SendMail().sendMailHtml([find_info.email_address], 'MTEG 계정정보 찾기를 요청하셨습니다.', MemberTemplate.findUserInfo(template_data));
    if (send_mail_result.isSuccess() == false) {
      throw send_mail_result;
    }
  });

  res.json(new StdObject());
}));

routes.put('/:member_seq(\\d+)/files/profile_image', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);
  if (token_info.getId() !== member_seq){
    if(token_info.getRole() === roles.MEMBER){
      throw new StdObject(-1, "잘못된 요청입니다.", 403);
    }
  }

  const output = new StdObject(-1, '프로필 업로드 실패');

  await database.transaction(async(trx) => {
    const member_model = new MemberModel({ database: trx });
    const member_info = await member_model.getMemberInfo(member_seq);

    const media_root = service_config.get('media_root');
    const upload_path = member_info.user_media_path + "_upload_\\profile";
    const upload_full_path = media_root + upload_path;
    if (!(await Util.fileExists(upload_full_path))) {
      await Util.createDirectory(upload_full_path);
    }

    await Util.uploadByRequest(req, res, 'profile', upload_full_path, Util.getRandomId());

    const upload_file_info = req.file;
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
    }

    const origin_image_path = upload_file_info.path;
    const resize_image_path = upload_path + '\\' + Util.getRandomId() + '.png';
    const resize_image_full_path = media_root + resize_image_path;
    const resize_result = await Util.getThumbnail(origin_image_path, resize_image_full_path, 0, 300, 400);

    await Util.deleteFile(origin_image_path);

    if (resize_result.success) {
      const update_profile_result = await member_model.updateProfileImage(member_seq, resize_image_path);
      if (update_profile_result) {
        if (!Util.isEmpty(member_info.profile_image_path)) {
          await Util.deleteFile(media_root + member_info.profile_image_path);
        }
        output.error = 0;
        output.message = '';
        output.add('profile_image_url', Util.getUrlPrefix(service_config.get('static_storage_prefix'), resize_image_path));
      } else {
        await Util.deleteFile(resize_image_full_path);
        output.error = -2;
      }
    } else {
      output.error = -3;
    }
  });

  res.json(output);
}));

routes.post('/verify/user_id', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_id = req.body.user_id;
  const is_duplicate = await new MemberModel({ database }).isDuplicateId(user_id);

  const output = new StdObject();
  output.add('is_verify', !is_duplicate);

  res.json(output);
}));

routes.post('/verify/nickname', Wrap(async(req, res) => {
  req.accepts('application/json');
  const nickname = req.body.nickname;
  const is_duplicate = await new MemberModel({ database }).isDuplicateNickname(nickname);

  const output = new StdObject();
  output.add('is_verify', !is_duplicate);

  res.json(output);
}));

export default routes;
