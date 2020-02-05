import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import MemberService from '../../service/member/MemberService'
import MemberInfo from "../../wrapper/member/MemberInfo";
import MemberInfoSub from "../../wrapper/member/MemberInfoSub";

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
routes.get('/me', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const lang = Auth.getLanguage(req);
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const member_info = await MemberService.getMemberInfoWithSub(DBMySQL, member_seq, lang);

  const output = new StdObject();
  output.add('member_info', member_info.member_info);
  output.add('member_sub_info', member_info.member_sub_info);

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
routes.get('/:member_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);

  if (token_info.getId() !== member_seq){
    if(token_info.getRole() === Role.MEMBER){
      throw new StdObject(-1, "잘못된 요청입니다.", 403);
    }
  }

  const member_info = await MemberService.getMemberInfo(member_seq);
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

  // 커밋과 롤백은 자동임
  await DBMySQL.transaction(async(transaction) => {
    await MemberService.createMember(transaction, req.body);
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
routes.put('/:member_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');

  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);

  if(!MemberService.checkMyToken(token_info, member_seq)){
    throw new StdObject(-1, "잘못된 요청입니다.", 403);
  }

  const member_info = new MemberInfo(req.body, MemberService.member_private_fields);
  const member_sub_info = new MemberInfoSub(req.body, MemberService.member_sub_private_fields);

  member_info.checkUserNickname();
  member_info.checkEmailAddress();

  await DBMySQL.transaction(async(transaction) => {
    const result = await MemberService.modifyMemberWithSub(transaction, member_seq, member_info, member_sub_info)
    if (!result) {
      throw new StdObject(-1, '회원정보 수정 실패', 400);
    }
  });

  res.json(new StdObject());
}));

routes.put('/change_password/:member_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');

  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);

  if(!MemberService.checkMyToken(token_info, member_seq)){
    throw new StdObject(-1, "잘못된 요청입니다.", 403);
  }

  const output = new StdObject();
  const is_change = await MemberService.changePassword(DBMySQL, member_seq, req.body)
  output.add('is_change', is_change);
  res.json(output);
}));

routes.post('/find/id', Wrap(async(req, res) => {
  req.accepts('application/json');

  const output = MemberService.findMemberId(DBMySQL, req.body)
  res.json(output);
}));

routes.post('/send_auth_code', Wrap(async(req, res) => {
  req.accepts('application/json');

  const output = await MemberService.sendAuthCode(DBMySQL, req.body)
  res.json(output);
}));

routes.post('/check_auth_code', Wrap(async(req, res) => {
  req.accepts('application/json');

  const output = await MemberService.checkAuthCode(DBMySQL, req.body)
  res.json(output);
}));

routes.post('/reset_password', Wrap(async(req, res) => {
  req.accepts('application/json');

  const output = await MemberService.resetPassword(DBMySQL, req.body)
  res.json(output);
}));

routes.put('/:member_seq(\\d+)/files/profile_image', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);
  if (token_info.getId() !== member_seq){
    if(token_info.getRole() === Role.MEMBER){
      throw new StdObject(-1, "잘못된 요청입니다.", 403);
    }
  }

  const output = await MemberService.changeProfileImage(DBMySQL, member_seq, req, res)

  res.json(output);
}));

routes.post('/verify/user_id', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_id = req.body.user_id;
  const is_duplicate = await MemberService.isDuplicateId(user_id);

  const output = new StdObject();
  output.add('is_verify', !is_duplicate);

  res.json(output);
}));

routes.post('/verify/nickname', Wrap(async(req, res) => {
  req.accepts('application/json');
  const nickname = req.body.nickname;
  const is_duplicate = await MemberService.isDuplicateNickname(nickname);

  const output = new StdObject();
  output.add('is_verify', !is_duplicate);

  res.json(output);
}));

routes.get('/:member_seq(\\d+)/data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);
  if(!MemberService.checkMyToken(token_info, member_seq)){
    throw new StdObject(-1, "잘못된 요청입니다.", 403);
  }

  const user_data = await MemberService.getMemberMetadata(member_seq)

  const output = new StdObject();
  output.add('user_data', user_data);
  res.json(output);
}));

routes.put('/:member_seq(\\d+)/data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);
  if(!MemberService.checkMyToken(token_info, member_seq)){
    throw new StdObject(-1, "잘못된 요청입니다.", 403);
  }

  const user_data = await MemberService.updateMemberMetadata(member_seq, req.body.changes)

  const output = new StdObject();
  output.add('user_data', user_data);
  res.json(output);
}));

routes.put('/Leave/:member_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');

  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);
  const leave_text = req.body.leaveText;

  if(!MemberService.checkMyToken(token_info, member_seq)){
    throw new StdObject(-1, "잘못된 요청입니다.", 403);
  }

  await MemberService.leaveMember(DBMySQL, member_seq, leave_text)

  res.json(new StdObject());
}));

routes.post('/finds', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const search_text = req.body.searchText;

  const find_user_info_list = MemberService.findMembers(DBMySQL, search_text)

  output.add('user_data', find_user_info_list);
  output.add("searchText", search_text);

  res.json(output);
}));

export default routes;
