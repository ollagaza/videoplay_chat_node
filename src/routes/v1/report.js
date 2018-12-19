import { Router } from 'express';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import DoctorModel from '@/models/DoctorModel';
import ReportModel from "@/models/xmlmodel/ReportModel";

const routes = Router();

const getMemberQuery = async (token_info) => {
  const member_query = {};
  const member_seq = token_info.getId();

  if (token_info.getRole() == roles.MEMBER) {
    const member_info = await new MemberModel({ database }).findOne({seq: member_seq});
    if (member_info === null) {
      throw new StdObject(-99, '회원 가입 후 사용 가능합니다.');
    }

    member_query.Name = member_info.user_name;
    member_query.Hospital = member_info.hospital_code;
    member_query.Depart = member_info.branch_code;
  }

  return member_query;
}

const getMediaInfo = async (media_id, token_info) => {
  let member_query = {};
  if (token_info.getRole() == roles.MEMBER) {
    member_query = await getMemberQuery(token_info);
  }

  const doctor_model = new DoctorModel({ database });
  const media_info = await doctor_model.getMediaInfo(media_id, member_query);

  if (media_info == null || media_info.isEmpty()) {
    throw new StdObject(-1, '미디어 정보가 존재하지 않습니다.');
  }

  return { media_info, doctor_model };
}

/**
 * @swagger
 * tags:
 *  name: Report
 *  description: 레포트 수술기록 조회, 저장
 *
 */

/**
 * @swagger
 * /report/{media_id}:
 *  get:
 *    summary: "레포트 수술기록 조회"
 *    tags: [Report]
 *    security:
 *    - access_token: []
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "media_id"
 *      in: "path"
 *      description: "동영상 고유번호"
 *      type: "integer"
 *      require: true
 *    responses:
 *      200:
 *        description: "레포트 수술 기록"
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
 *              description: "비디오 정보"
 *              properties:
 *                sheet_list:
 *                  type: "array"
 *                  description: "레포트 수술 기록"
 *                  items:
 *                    $ref: "#definitions/ReportEntryInfo"
 *
 */
routes.get('/:media_id(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const media_id = req.params.media_id;

  const {media_info} = await getMediaInfo(media_id, token_info);
  const sheet_list = await new ReportModel({ database }).getReportInfo(media_info);

  const output = new StdObject();
  output.add("sheet_list", sheet_list);

  res.json(output);
}));

/**
 * @swagger
 * /report/{media_id}:
 *  put:
 *    summary: "레포트 수술기록 저장"
 *    tags: [Report]
 *    security:
 *    - access_token: []
 *    consume:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "body"
 *      in: "body"
 *      require: true
 *      schema:
 *         $ref: "#/definitions/ReportInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *
 */
routes.put('/:media_id(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  if (!req.body || !req.body.sheet_list) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }

  const token_info = req.token_info;
  const media_id = req.params.media_id;

  const {media_info, doctor_model} = await getMediaInfo(media_id, token_info);
  const operation_info = await doctor_model.getOperationInfo(media_id);
  const report_count = await new ReportModel({ database }).saveReportInfo(media_info, operation_info, req.body);
  await doctor_model.updateReportCount(media_id, report_count);

  const output = new StdObject();
  res.json(output);
}));

export default routes;
