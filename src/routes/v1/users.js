import { Router } from 'express';
import _ from 'lodash';
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

const checkUserParams = (params) => {
  if (Util.isEmpty(params)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400);
  }
  if (Util.isEmpty(params.user_name)) {
    throw new StdObject(-1, '성명을 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.email_address)) {
    throw new StdObject(-1, '아이디를 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.position)) {
    throw new StdObject(-1, '핸드폰 번호를 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.password)) {
    throw new StdObject(-1, '암호를 입력해 주세요.', 400);
  }
  if (Util.isEmpty(params.password_confirm)) {
    throw new StdObject(-1, '암호확인을 입력해 주세요.', 400);
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
  if (params.user_name.length > 10) {
    return new StdObject(-1, '이름은 열자 이하로 입력하셔야 합니다.', 400);
  }
}

/**
 * @api {get} /users/:member_seq 회원 정보 조회
 * @apiName GetUserInfo
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiPermission member, manager, admin
 *
 * @apiHeader {String} Authorization `Bearer 인증토큰`
 *
 * @apiParam {Number} member_seq 회원 고유 번호
 *
 * @apiSuccess {Number} seq 회원 고유 번호
 * @apiSuccess {String} regist_date 회원 등록 일자 (yyyy-mm-dd HH:MM:ss)
 * @apiSuccess {String} user_name 회원 이름
 * @apiSuccess {String} email_address 회원 E-Mail
 * @apiSuccess {String} cellphone 회원 연락처
 * @apiSuccess {String} hospital_code 병원 명
 * @apiSuccess {String} branch_code 진료과목
 * @apiSuccess {String} custom_hospital 직접 입력한 병원 명
 * @apiSuccess {String} custom_branch 직접 입력한 진료과목
 * @apiSuccess {String} position 직위
 * @apiSuccess {String} license_no 면허 번호
 * @apiSuccess {String} etc 기타 정보
 *
 * @apiSuccessExample 회원정보
 * HTTP/1.1 200 OK
 * {
 *  "seq": 25,
 *  "regist_date": "2018-10-24 03:30:06",
 *  "user_name": "강소라",
 *  "email_address": "test@mteg.com",
 *  "cellphone": "0101234567",
 *  "hospital_code": "EHMD",
 *  "branch_code": "OBG",
 *  "custom_hospital": "",
 *  "custom_branch": "",
 *  "position": "교수",
 *  "license_no": "1111",
 *  "etc": " "
 * }
 *
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
 * @api {post} /users 회원 가입
 * @apiName CreateUserInfo
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 *
 * @apiHeader {String} Content-Type=application/json json content type
 *
 * @apiParam {String} user_name 회원 이름
 * @apiParam {String} email_address 회원 E-Mail
 * @apiParam {String} password 비밀번호
 * @apiParam {String} password_confirm 비밀번호 확인
 * @apiParam {String} cellphone 회원 연락처
 * @apiParam {String} hospital_code 병원 명
 * @apiParam {String} branch_code 진료과목
 * @apiParam {String} custom_hospital 직접 입력한 병원 명
 * @apiParam {String} custom_branch 직접 입력한 진료과목
 * @apiParam {String} position 직위
 * @apiParam {String} license_no 면허 번호
 * @apiParam {String} [etc] 기타 정보
 *
 * @apiParamExample 회원 가입 정보
 * HTTP/1.1 200 OK
 * {
 *  "user_name": "강소라",
 *  "email_address": "test@mteg.com",
 *  "password": "1111",
 *  "password_confirm": "1111",
 *  "cellphone": "0101234567",
 *  "hospital_code": "EHMD",
 *  "branch_code": "OBG",
 *  "custom_hospital": "",
 *  "custom_branch": "",
 *  "position": "교수",
 *  "license_no": "1111",
 *  "etc": " "
 * }
 *
 * @apiSuccess {Boolean} success 회원가입 성공 true
 *
 */
routes.post('/', wrap(async(req, res) => {
  req.accepts('application/json');

  const params = req.body;

  checkUserParams(params);

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
    const member_seq = await oMemberModel.create(params);
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
 * @api {put} /users/:member_seq 회원 정보 수정
 * @apiName ModifyUserInfo
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 *
 * @apiHeader {String} Authorization `Bearer 인증토큰`
 * @apiHeader {String} Content-Type=application/json json content type
 *
 * @apiParam {Number} member_seq 회원 고유 번호
 * @apiParam {String} user_name 회원 이름
 * @apiParam {String} email_address 회원 E-Mail
 * @apiParam {String} password 비밀번호
 * @apiParam {String} password_confirm 비밀번호 확인
 * @apiParam {String} cellphone 회원 연락처
 * @apiParam {String} hospital_code 병원 명
 * @apiParam {String} branch_code 진료과목
 * @apiParam {String} custom_hospital 직접 입력한 병원 명
 * @apiParam {String} custom_branch 직접 입력한 진료과목
 * @apiParam {String} position 직위
 * @apiParam {String} license_no 면허 번호
 * @apiParam {String} [etc] 기타 정보
 *
 * @apiParamExample 회원 정보
 * HTTP/1.1 200 OK
 * {
 *  "user_name": "강소라",
 *  "email_address": "test@mteg.com",
 *  "password": "1111",
 *  "password_confirm": "1111",
 *  "cellphone": "0101234567",
 *  "hospital_code": "EHMD",
 *  "branch_code": "OBG",
 *  "custom_hospital": "",
 *  "custom_branch": "",
 *  "position": "교수",
 *  "license_no": "1111",
 *  "etc": " "
 * }
 *
 * @apiSuccess {Boolean} success 회원가입 성공 true
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
    const seq = await oMemberModel.create(params);
    const output = new StdObject();
    res.json(output);
  });
}));

export default routes;
