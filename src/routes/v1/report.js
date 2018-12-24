import { Router } from 'express';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import OperationModel from '@/models/OperationModel';
import ReportModel from "@/models/xmlmodel/ReportModel";

const routes = Router();

const checkRole = async (token_info) => {
  const member_seq = token_info.getId();
  if (token_info.getRole() == roles.MEMBER) {
    const member_info = await new MemberModel({ database }).findOne({seq: member_seq});
    if (member_info === null) {
      throw new StdObject(-99, '회원 가입 후 사용 가능합니다.');
    }
  }
}

const getOperationInfo = async (operation_seq, token_info) => {
  await checkRole(token_info);

  const operation_model = new OperationModel({ database });
  const operation_info = await operation_model.getOperationInfo(operation_seq, token_info);

  if (operation_info == null || operation_info.isEmpty()) {
    throw new StdObject(-1, '수술 정보가 존재하지 않습니다.');
  }

  return { operation_info, operation_model };
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
 * /report/{operation_seq}:
 *  get:
 *    summary: "수술 레포트 조회"
 *    tags: [Report]
 *    security:
 *    - access_token: []
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "operation_seq"
 *      in: "path"
 *      description: "수술정보 고유번호"
 *      type: "integer"
 *      require: true
 *    responses:
 *      200:
 *        description: "수술 레포트 기록"
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
 *              description: "수술 레포트 정보"
 *              properties:
 *                sheet_list:
 *                  type: "array"
 *                  description: "수술 레포트 목록"
 *                  items:
 *                    $ref: "#definitions/ReportEntryInfo"
 *
 */
routes.get('/:operation_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info} = await getOperationInfo(operation_seq, token_info);
  const sheet_list = await new ReportModel({ database }).getReportInfo(operation_info);

  const output = new StdObject();
  output.add("sheet_list", sheet_list);

  res.json(output);
}));

/**
 * @swagger
 * /report/{operation_seq}:
 *  put:
 *    summary: "수술 레포트 저장"
 *    tags: [Report]
 *    security:
 *    - access_token: []
 *    consume:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "operation_seq"
 *      in: "path"
 *      description: "수술정보 고유번호"
 *      type: "integer"
 *      require: true
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
routes.put('/:operation_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  if (!req.body || !req.body.sheet_list) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }

  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info, operation_model} = await getOperationInfo(operation_seq, token_info);
  const report_count = await new ReportModel({ database }).saveReportInfo(operation_info, req.body);
  await operation_model.updateReportCount(operation_seq, report_count);

  const output = new StdObject();
  res.json(output);
}));

export default routes;
