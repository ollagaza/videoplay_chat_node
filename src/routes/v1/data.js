import { Router } from 'express';
import Wrap from '@/utils/express-async';
import database from '@/config/database';
import StdObject from "@/classes/StdObject";
import HospitalModel from "@/models/HospitalModel";
import DepartModel from "@/models/DepartModel";
import MemberModel from '@/models/MemberModel';

/**
 * @swagger
 * tags:
 *  name: Data
 *  description: 권한이 필요하지 않은 각종 자료 조회 (병원, 부서, 배너 등등)
 *
 */

const routes = Router();
let hospital_list = null;
let depart_list = null;

/**
 * @swagger
 * /data/timestamp:
 *  get:
 *    summary: "서버시간 조회"
 *    tags: [Data]
 *    produces:
 *    - "application/json"
 *    responses:
 *      200:
 *        description: "서버시간"
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
 *                timestamp:
 *                  type: "integer"
 *                  description: "서버시간 timestamp"
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
 *
 */
routes.get('/timestamp', Wrap(async(req, res) => {
  const output = new StdObject();
  output.add('timestamp', Date.now());
  res.json(output);
}));

/**
 * @swagger
 * /data/hospitals:
 *  get:
 *    summary: "병원 코드, 이름 등 정보 조회"
 *    tags: [Data]
 *    produces:
 *    - "application/json"
 *    responses:
 *      200:
 *        description: "병원 정보"
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
 *              description: "병원 정보"
 *              properties:
 *                hospitals:
 *                  type: "array"
 *                  description: "병원 코드, 이름 목록"
 *                  items:
 *                    $ref: "#definitions/HospitalInfo"
 *
 */
routes.get('/hospitals', Wrap(async(req, res) => {
  if (!hospital_list) {
    hospital_list = await new HospitalModel({ database }).getHospitalList();
  }
  const output = new StdObject();
  output.add('hospital_list', hospital_list);
  res.json(output);
}));


/**
 * @swagger
 * /data/departs:
 *  get:
 *    summary: "진료과목 코드, 이름 등 정보 조회"
 *    tags: [Data]
 *    produces:
 *    - "application/json"
 *    responses:
 *      200:
 *        description: "진료과목 정보"
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
 *              description: "진료과목 정보"
 *              properties:
 *                hospitals:
 *                  type: "array"
 *                  description: "진료과목 정보 목록"
 *                  items:
 *                    $ref: "#definitions/DepartInfo"
 *
 */
routes.get('/departs', Wrap(async(req, res) => {
  if (!depart_list) {
    depart_list = await new DepartModel({ database }).getDepartList();
  }
  const output = new StdObject();
  output.add('depart_list', depart_list);
  res.json(output);
}));


/**
 * @swagger
 * /data/new_join_users:
 *  get:
 *    summary: "신규 가입자 목록"
 *    tags: [Data]
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "list_count"
 *      in: "query"
 *      description: "목록 최대 개수"
 *      required: false
 *      type: "integer"
 *      default: 10
 *    responses:
 *      200:
 *        description: "최근 가입자 목록"
 *        schema:
 *          type: "object"
 *          properties:
 *            new_user_list:
 *              type: "array"
 *              description: "가입자 정보"
 *              items:
 *                type: "string"
 *
 */
routes.get('/new_join_users', Wrap(async(req, res) => {
  let list_count = 10;
  if (req.query.list_count) {
    list_count = req.query.list_count;
  }

  const oMemberModel = new MemberModel({ database });
  const query_result = await oMemberModel.getBannerNewUserList(list_count);
  const output = new StdObject();

  if (query_result && query_result.length > 0){
    const output_list = new Array();
    for (let i = 0; i < query_result.length; i++) {
      const result = query_result[i];
      output_list.push(result.hostital_name + ' ' + result.user_name.substr(0, 1) + "OO 교수님이 가입하셨습니다.");
    }
    output.add('new_user_list', output_list);
  }

  res.json(output);
}));

export default routes;
