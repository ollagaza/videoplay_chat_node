import { Router } from 'express';
import _ from 'lodash';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import DoctorModel from '@/models/DoctorModel';
import database from '@/config/database';
import roles from "@/config/roles";
import MemberModel from '@/models/MemberModel';
import auth from '@/middlewares/auth.middleware';
import OperationInfo from "@/classes/surgbook/OperationInfo";
import Util from '@/utils/baseutil';

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

/**
 * @swagger
 * tags:
 *  name: Medias
 *  description: 동영상 정보 조회
 * definitions:
 *  VideoSummaryInfo:
 *    type: "object"
 *    properties:
 *      total_file_count:
 *        type: "integer"
 *        description: "전체 파일 개수"
 *      total_file_size:
 *        type: "integer"
 *        description: "전체 파일 용량"
 *      total_run_time:
 *        type: "integer"
 *        description: "현재 재생 시간"
 *
 */

/**
 * @swagger
 * /medias:
 *  get:
 *    summary: "회원이 등록한 동영상의 목록. 관리자는 전체 목록"
 *    tags: [Medias]
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "page"
 *      in: "query"
 *      description: "현재 페이지"
 *      type: "integer"
 *      default: 1
 *    - name: "list_count"
 *      in: "query"
 *      description: "페이지당 레코드 개수"
 *      type: "integer"
 *      default: 20
 *    - name: "page_count"
 *      in: "query"
 *      description: "화면 당 페이지 개수"
 *      type: "integer"
 *      default: 10
 *    - name: "summary"
 *      in: "query"
 *      description: "요약정보 추가 여부. (y: 결과에 요약정보 포함)"
 *      type: "string"
 *      default: "n"
 *    responses:
 *      200:
 *        description: "비디오 목록"
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
 *                total_count:
 *                  type: "integer"
 *                  description: "전체 레코드 개수"
 *                total_page:
 *                  type: "integer"
 *                  description: "전체 페이지 개수"
 *                data:
 *                  type: "array"
 *                  description: "동영상 정보 목록"
 *                  items:
 *                    $ref: "#definitions/MediaInfo"
 *                page_navigation:
 *                  $ref: "#definitions/PageNavigation"
 *                summary_info:
 *                  $ref: "#definitions/VideoSummaryInfo"
 *    security:
 *    - access_token: []
 */
routes.get('/', auth.isAuthenticated(roles.LOGIN_USER), wrap(async(req, res) => {
  const token_info = req.token_info;
  let member_query = {};
  if (token_info.getRole() == roles.MEMBER) {
    member_query = await getMemberQuery(token_info);
  }

  const page_query = {};
  if (req.query.page != null) {
    page_query.page = req.query.page;
  }
  if (req.query.list_count != null) {
    page_query.list_count = req.query.list_count;
  }
  if (req.query.page_count != null) {
    page_query.page_count = req.query.page_count;
  }

  const output = new StdObject();

  const doctor_model = new DoctorModel({ database });
  const media_info_page = await doctor_model.getMediaInfoListPage(_.merge(page_query, member_query));
  output.adds(media_info_page);

  if (Util.equals(req.query.summary, 'y')) {
    const columns = ["sum(FileNo) as total_file_count", "sum(FileSize) as total_file_size", "sum(RunTime) as total_run_time"];
    const summary_info = await doctor_model.findOne(member_query, columns);
    if (summary_info !== null) {
      output.add('summary_info', summary_info);
    }
  }

  res.json(output);
}));

/**
 * @swagger
 * /medias/{media_id}:
 *  get:
 *    summary: "동영상의 상세 정보"
 *    tags: [Medias]
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
 *        description: "비디오 정보"
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
 *                media_info:
 *                  $ref: "#definitions/MediaInfo"
 *                operation_info:
 *                  $ref: "#definitions/OperationInfo"
 *    security:
 *    - access_token: []
 */
routes.get('/:media_id', auth.isAuthenticated(roles.LOGIN_USER), wrap(async(req, res) => {
  const token_info = req.token_info;
  let member_query = {};
  if (token_info.getRole() == roles.MEMBER) {
    member_query = await getMemberQuery(token_info);
  }

  const doctor_model = new DoctorModel({ database });

  const media_id = req.params.media_id;
  const media_info = await doctor_model.getMediaInfo(media_id, member_query);

  if (media_info == null || media_info.isEmpty()) {
    throw new StdObject(-1, '미디어 정보가 존재하지 않습니다.');
  }

  const operation_info = await doctor_model.getOperationInfo(media_id);

  const output = new StdObject();
  output.add('media_info', media_info);
  output.add('operation_info', operation_info);

  res.json(output);
}));

/**
 * @swagger
 * /medias/operation/{media_id}:
 *  put:
 *    summary: "동영상의 상세 정보"
 *    tags: [Medias]
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "media_id"
 *      in: "path"
 *      description: "동영상 고유번호"
 *      type: "integer"
 *      require: true
 *    - name: "body"
 *      in: "body"
 *      description: "수술정보"
 *      required: true
 *      schema:
 *        $ref: "#/definitions/OperationInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *    security:
 *    - access_token: []
 */
routes.put('/operation/:media_id', auth.isAuthenticated(roles.LOGIN_USER), wrap(async(req, res) => {
  req.accepts('application/json');

  const media_id = req.params.media_id;
  const operation_info = new OperationInfo(req.body);
  if (operation_info.isEmpty()) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400);
  }

  const result = await new DoctorModel({ database }).updateOperationInfo(media_id, operation_info);

  const output = new StdObject();
  output.add('result', result);

  res.json(output);
}));

export default routes;
