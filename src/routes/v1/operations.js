import { Router } from 'express';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import OperationInfo from "@/classes/surgbook/OperationInfo";
import OperationModel from '@/models/OperationModel';
import IndexModel from '@/models/xmlmodel/IndexModel';
import ClipModel from '@/models/xmlmodel/ClipModel';
import VideoFileModel from '@/models/VideoFileModel';
import ReferFileModel from '@/models/ReferFileModel';
import service_config from '@/service.config';
import path from 'path';
import util from 'util';
import multer from 'sb-multer';

const routes = Router();

const env = process.env.NODE_ENV;
const service_info = service_config[env];
const media_root = service_info.media_root;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(req.media_directory))
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  },
});

const upload = util.promisify(multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 * 1024, ///< 20GB 제한
  }
}).single('target'));

routes.delete('/:operation_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_model} = await getOperationInfo(operation_seq, token_info);
  const result = await operation_model.updateStatusDelete(operation_seq);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/trash', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_model} = await getOperationInfo(operation_seq, token_info);
  const result = await operation_model.updateStatusTrash(operation_seq, false);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/trash', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_model} = await getOperationInfo(operation_seq, token_info);
  const result = await operation_model.updateStatusTrash(operation_seq, true);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/favorite', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_model} = await getOperationInfo(operation_seq, token_info);
  const result = await operation_model.updateStatusFavorite(operation_seq, false);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/favorite', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_model} = await getOperationInfo(operation_seq, token_info);
  const result = await operation_model.updateStatusFavorite(operation_seq, true);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/files/:file_type', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const operation_seq = req.params.operation_seq;
  const file_type = req.params.file_type;

  const {operation_info} = await getOperationInfo(operation_seq, token_info);
  let media_directory = media_root + operation_info.media_path;
  if (file_type !== 'refer') {
    media_directory += '\\SEQ';
  } else {
    media_directory += '\\REF';
  }

  if (!Util.fileExists(media_directory)) {
    Util.createDirectory(media_directory);
  }
  req.media_directory = media_directory;

  await upload(req, res);
  const upload_file_info = req.file;
  if (Util.isEmpty(upload_file_info)) {
    throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
  }

  let upload_seq = null;
  if (file_type !== 'refer') {
    upload_seq = await new VideoFileModel({ database }).createVideoFile(upload_file_info, operation_seq, member_seq);
  } else {
    upload_seq = await new ReferFileModel({ database }).createReferFile(upload_file_info, operation_seq, member_seq);
  }

  if (!upload_seq) {
    throw new StdObject(-1, '파일 정보를 저장하지 못했습니다.', 500);
  }

  const output = new StdObject();
  output.add('upload_seq', upload_seq);

  res.json(output);
}));

const getOperationInfo = async (operation_seq, token_info) => {
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
 *  name: Operations
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
 * /operations:
 *  get:
 *    summary: "회원이 등록한 동영상의 목록. 관리자는 전체 목록"
 *    tags: [Operations]
 *    security:
 *    - access_token: []
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
 *                  description: "수술 정보 목록"
 *                  items:
 *                    $ref: "#definitions/OperationInfo"
 *                page_navigation:
 *                  $ref: "#definitions/PageNavigation"
 *                summary_info:
 *                  $ref: "#definitions/VideoSummaryInfo"
 *
 */
routes.get('/', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;

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

  const operation_model = new OperationModel({ database });
  const operation_info_page = await operation_model.getOperationInfoListPage(page_query, token_info);

  output.adds(operation_info_page);

  if (Util.equals(req.query.summary, 'y')) {
    const summary_info = await operation_model.getStorageSummary(token_info);
    if (summary_info !== null) {
      output.add('summary_info', summary_info);
    }
  }

  res.json(output);
}));

routes.post('/', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  let member_seq;
  if (token_info.getRole() <= roles.MEMBER) {
    member_seq = token_info.getId();
  }
  else {
    member_seq = req.body.member_seq;
  }

  const operation_model = new OperationModel({ database });
  const operation_seq = await operation_model.createOperation(req.body, member_seq);

  if (!operation_seq) {
    throw new StdObject(-1, '수술정보 입력에 실패하였습니다.', 500)
  }

  const output = new StdObject();
  output.add('operation_seq', operation_seq);
  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}:
 *  get:
 *    summary: "수술의 상세 정보"
 *    tags: [Operations]
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
 *        description: "수술 상세 정보"
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
 *                operation_info:
 *                  $ref: "#definitions/OperationInfo"
 *
 */
routes.get('/:operation_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info} = await getOperationInfo(operation_seq, token_info);
  const output = new StdObject();
  output.add('operation_info', operation_info);

  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}/indexes/{index_type}:
 *  get:
 *    summary: "동영상의 인덱스 목록"
 *    tags: [Operations]
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
 *    - name: "index_type"
 *      in: "path"
 *      description: "인덱스 종류 (1 or 2)"
 *      type: "integer"
 *      require: true
 *    responses:
 *      200:
 *        description: "인덱스 목록 정보"
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
 *              properties:
 *                index_info_list:
 *                  type: "array"
 *                  description: "인덱스 목록"
 *                  items:
 *                    $ref: "#definitions/IndexInfo"
 *
 */
routes.get('/:operation_seq(\\d+)/indexes/:index_type(\\d+)', Auth.isAuthenticated(roles.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const index_type = req.params.index_type;

  const {operation_info} = await getOperationInfo(operation_seq, token_info);

  const index_info_list = await new IndexModel({ database }).getIndexlist(operation_info, index_type);

  const output = new StdObject();
  output.add("index_info_list", index_info_list);

  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}/indexes/{second}:
 *  post:
 *    summary: "동영상에서 지정 시간의 썸네일을 추출하고 인덱스2에 추가"
 *    tags: [Operations]
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
 *    - name: "second"
 *      in: "path"
 *      description: "인덱스를 추출할 대상 시간 (sec) "
 *      type: "number"
 *      require: true
 *    responses:
 *      200:
 *        description: "추가된 인덱스의 정보"
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
 *              properties:
 *                add_index_info:
 *                  $ref: "#definitions/IndexInfo"
 *
 */
routes.post('/:operation_seq(\\d+)/indexes/:second([\\d.]+)', Auth.isAuthenticated(roles.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const second = req.params.second;

  const {operation_info, operation_model} = await getOperationInfo(operation_seq, token_info);
  const {add_index_info, total_index_count} = await new IndexModel({ database }).addIndex(operation_info, second);
  await operation_model.updateIndexCount(operation_seq, 2, total_index_count);

  const output = new StdObject();
  output.add("add_index_info", add_index_info);

  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}/clips:
 *  get:
 *    summary: "수술의 클립 목록"
 *    tags: [Operations]
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
 *        description: "수술의 클립 정보"
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
 *              $ref: "#definitions/Clip"
 *
 */
routes.get('/:operation_seq(\\d+)/clips', Auth.isAuthenticated(roles.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info} = await getOperationInfo(operation_seq, token_info);
  const clip_info = await new ClipModel({ database }).getClipInfo(operation_info);

  const output = new StdObject();
  output.add("clip_list", clip_info.clip_list);
  output.add("clip_seq_list", clip_info.clip_seq_list);

  res.json(output);
}));


/**
 * @swagger
 * /operations/{operation_seq}/clips:
 *  put:
 *    summary: "수정한 클립 정보 저장"
 *    tags: [Operations]
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
 *      description: "수정된 클립 정보"
 *      require: true
 *      type: "object"
 *      schema:
 *        $ref: "#definitions/Clip"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *
 */
routes.put('/:operation_seq(\\d+)/clips', Auth.isAuthenticated(roles.DEFAULT), Wrap(async (req, res) => {
  if (!req.body || !req.body.clip_list || !req.body.clip_seq_list) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }

  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info, doctor_model} = await getOperationInfo(operation_seq, token_info);
  const clip_count = await new ClipModel({ database }).saveClipInfo(operation_info, req.body);
  await doctor_model.updateClipCount(operation_seq, clip_count);

  const output = new StdObject();
  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}/operation:
 *  put:
 *    summary: "동영상의 수술정보 수정"
 *    tags: [Operations]
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
 *      description: "수술정보"
 *      required: true
 *      schema:
 *        $ref: "#/definitions/OperationInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 */
routes.put('/:operation_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');

  const operation_seq = req.params.operation_seq;
  const operation_info = new OperationInfo(req.body);
  if (operation_info.isEmpty()) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400);
  }

  const result = await new OperationModel({ database }).updateOperationInfo(operation_seq, operation_info);

  const output = new StdObject();
  output.add('result', result);

  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}/request/service:
 *  post:
 *    summary: "요약비디오 제작 요청"
 *    tags: [Operations]
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
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 */
routes.post('/:operation_seq(\\d+)/request/service', Auth.isAuthenticated(roles.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info, doctor_model} = await getOperationInfo(operation_seq, token_info);

  const send_mail = new SendMail();

  const mail_to = ["hwj@mteg.co.kr", "ytcho@mteg.co.kr"];
  const subject = operation_info.doctor_name + " 선생님으로부터 서비스 요청이 있습니다.";
  const attachments = [send_mail.getAttachObject(operation_info.media_directory + "Clip.xml", "Clip.xml")];
  const send_mail_result = await send_mail.sendMailText(mail_to, subject, "첨부한 Clip.xml 파일을 확인하세요.", attachments);

  if (send_mail_result.isSuccess()) {
    await doctor_model.updateRequestStatus(operation_seq, 'R');
    res.json(new StdObject());
  } else {
    throw send_mail_result;
  }
}));

export default routes;
