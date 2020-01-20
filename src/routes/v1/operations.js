import { Router } from 'express';
import querystring from 'querystring';
import semver from 'semver';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import SendMail from '../../libs/send-mail';
import OperationService from '../../service/operation/OperationService';
import MemberModel from '../../database/mysql/member/MemberModel';
import OperationModel from '../../database/mysql/operation/OperationModel';
import OperationMediaModel from '../../database/mysql/operation/OperationMediaModel';
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel';
import OperationShareModel from '../../database/mysql/operation/OperationShareModel';
import OperationShareUserModel from '../../database/mysql/operation/OperationShareUserModel';
import IndexModel from '../../models/xml/IndexModel';
import ClipModel from '../../models/xml/ClipModel';
import VideoFileModel from '../../database/mysql/file/VideoFileModel';
import ReferFileModel from '../../database/mysql/file/ReferFileModel';
import OperationInfo from "../../wrapper/operation/OperationInfo";
import ShareTemplate from '../../template/mail/share.template';
import { VideoIndexInfoModel, AddVideoIndex } from '../../database/mongodb/VideoIndex';
import { OperationMetadataModel } from '../../database/mongodb/OperationMetadata';
import { OperationClipModel } from '../../database/mongodb/OperationClip';
import { UserDataModel } from '../../database/mongodb/UserData';

const routes = Router();

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
 *    - name: "no_paging"
 *      in: "query"
 *      description: "페이징 사용 안함"
 *      type: "string"
 *      default: "n"
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
routes.get('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const page_query = {};
  page_query.page = req.query.page;
  page_query.list_count = req.query.list_count;
  page_query.page_count = req.query.page_count;
  page_query.no_paging = req.query.no_paging;

  const output = new StdObject();

  const operation_model = new OperationModel({ DBMySQL });
  const operation_info_page = await operation_model.getOperationInfoListPage(page_query, token_info, req.query);

  output.adds(operation_info_page);

  if (Util.equals(req.query.summary, 'y')) {
    const summary_info = await new OperationStorageModel({ DBMySQL }).getStorageSummary(token_info);
    if (summary_info !== null) {
      output.add('summary_info', summary_info);
    }
  }

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
 *                  $ref: "#definitions/OperationEditInfo"
 *
 */
routes.get('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const output = new StdObject();
  output.add('operation_info', operation_info);

  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}:
 *  post:
 *    summary: "수술정보 생성"
 *    tags: [Operations]
 *    security:
 *    - access_token: []
 *    consume:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "body"
 *      in: "body"
 *      description: "수술정보"
 *      required: true
 *      schema:
 *        $ref: "#/definitions/OperationEditInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 */
routes.post('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  let member_seq;
  if (token_info.getRole() <= Role.MEMBER) {
    member_seq = token_info.getId();
  }
  else {
    member_seq = req.body.member_seq;
  }

  const output = new StdObject();
  let operation_info = null;
  let is_success = false;

  await DBMySQL.transaction(async(transaction) => {
    const operation_model = new OperationModel(transaction);
    const use_new_clip_api = semver.gt(req.headers.version, '1.0.0');
    operation_info = await operation_model.createOperation(req.body.operation_info, member_seq, true, null, use_new_clip_api);
    if (!operation_info || !operation_info.seq) {
      throw new StdObject(-1, '수술정보 입력에 실패하였습니다.', 500)
    }
    const operation_seq = operation_info.seq;

    await new OperationMediaModel(transaction).createOperationMediaInfo(operation_info);
    await new OperationStorageModel(transaction).createOperationStorageInfo(operation_info);

    output.add('operation_seq', operation_seq);

    is_success = true;
  });

  if (is_success) {
    await OperationService.createOperationDirectory(operation_info);

    try {
      await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info);
      await OperationMetadataModel.createOperationMetadata(operation_info, req.body.meta_data);
      await UserDataModel.updateByMemberSeq(member_seq, { operation_type: operation_info.operation_type });
    } catch (error) {
      log.e(req, 'create metadata error', error);
    }
  }

  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}:
 *  put:
 *    summary: "수술정보 수정"
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
 *        $ref: "#/definitions/OperationEditInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 */
routes.put('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const member_seq = token_info.getId();

  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  const update_operation_info = new OperationInfo().getByRequestBody(req.body.operation_info);
  if (operation_info.isEmpty()) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400);
  }

  const output = new StdObject();
  await DBMySQL.transaction(async(transaction) => {
    const result = await new OperationModel(transaction).updateOperationInfo(operation_seq, update_operation_info);
    const metadata_result = await OperationMetadataModel.updateByOperationSeq(operation_info, update_operation_info.operation_type, req.body.meta_data);
    log.d(req, 'metadata_result', metadata_result);
    if (!metadata_result || !metadata_result._id) {
      throw new StdObject(-1, '수술정보 변경에 실패하였습니다.', 400);
    }
    output.add('result', result);
  });
  try {
    const user_data_result = await UserDataModel.updateByMemberSeq(member_seq, { operation_type: update_operation_info.operation_type });
    log.d(req, 'user_data_result', user_data_result);
  } catch (error) {
    log.e(req, 'update user_data error', error);
  }

  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const output = new StdObject();

  const {operation_info, operation_model} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  await operation_model.deleteOperation(operation_info);
  OperationService.deleteOperationFiles(operation_info);

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
routes.get('/:operation_seq(\\d+)/indexes/:index_type(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  let index_list;
  const video_index_info = await VideoIndexInfoModel.findOneByOperation(operation_seq);
  if (!video_index_info) {
    index_list = await new IndexModel({ DBMySQL }).getIndexList(operation_info, 2);
    await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info, index_list);
  } else {
    index_list = video_index_info.index_list;
  }

  const output = new StdObject();
  output.add("index_info_list", index_list);

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
routes.post('/:operation_seq(\\d+)/indexes/:second([\\d.]+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const second = req.params.second;
  const output = new StdObject();

  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const {add_index_info, total_index_count} = await AddVideoIndex(operation_info, second);
  await new OperationStorageModel({ DBMySQL }).updateIndexCount(operation_info.storage_seq, 2, total_index_count);
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
routes.get('/:operation_seq(\\d+)/clips', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const clip_info = await new ClipModel({ DBMySQL }).getClipInfo(operation_info);

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
routes.put('/:operation_seq(\\d+)/clips', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body || !req.body.clip_list || !req.body.clip_seq_list) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }

  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  await DBMySQL.transaction(async(transaction) => {
    const {operation_info, operation_model} = await OperationService.getOperationInfo(transaction, operation_seq, token_info);
    const clip_count = await new ClipModel(transaction).saveClipInfo(operation_info, req.body);
    await new OperationStorageModel(transaction).updateClipCount(operation_info.storage_seq, clip_count);
    await operation_model.updateReviewStatus(operation_seq, clip_count > 0);
  });

  const output = new StdObject();
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/clip/list', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info, operation_model} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  if (operation_info.mig_clip !== true) {
    const clip_info = await new ClipModel({ DBMySQL }).getClipInfo(operation_info);
    if (clip_info) {
      const clip_seq_list = clip_info.clip_seq_list;
      if (clip_seq_list && clip_seq_list.length) {
        await OperationClipModel.createOperationClipByList(operation_info, clip_seq_list);
      }
      await operation_model.updateMigChipStatus(operation_seq, true);
    }
  }
  log.d(req, req.headers.version, semver.gt(req.headers.version, '1.0.0'));

  const clip_list = await OperationClipModel.findByOperationSeq(operation_seq, '-member_seq -content_id -operation_seq');

  const output = new StdObject();
  output.add("clip_list", clip_list);

  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const phase_id = req.params.phase_id;
  const result = await OperationClipModel.setPhase(phase_id, req.body.clip_id_list);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));
routes.delete('/:operation_seq(\\d+)/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq;
  const phase_id = req.params.phase_id;

  const result = await OperationClipModel.unsetPhaseOne(req.body.clip_id, operation_seq, phase_id);
  if (req.body.remove_phase === true) {
    await OperationClipModel.deletePhase(operation_seq, phase_id);
  }

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/clip', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  const create_result = await OperationClipModel.createOperationClip(operation_info, req.body.clip_info);
  await new OperationStorageModel({ DBMySQL }).updateClipCount(operation_info.storage_seq, req.body.clip_count);
  const output = new StdObject();
  output.add('result', create_result);
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }
  const clip_id = req.params.clip_id;

  const update_result = await OperationClipModel.updateOperationClip(clip_id, req.body);

  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const clip_id = req.params.clip_id;
  const operation_seq = req.params.operation_seq;
  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  const delete_result = await OperationClipModel.deleteById(clip_id);
  await new OperationStorageModel({ DBMySQL }).updateClipCount(operation_info.storage_seq, req.body.clip_count);
  if (req.body.remove_phase === true) {
    await OperationClipModel.deletePhase(operation_seq, req.body.phase_id);
  }

  const output = new StdObject();
  output.add('result', delete_result);
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/phase', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }

  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  const create_result = await OperationClipModel.createPhase(operation_info, req.body.phase_desc);
  const phase_id = create_result._id;
  await OperationClipModel.setPhase(phase_id, req.body.clip_id_list);

  const output = new StdObject();
  output.add('phase', create_result);
  output.add('phase_id', phase_id);
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  // const operation_seq = req.params.operation_seq;
  const phase_id = req.params.phase_id;
  const phase_desc = req.body.phase_desc;

  log.d(req, phase_id, phase_desc);
  const update_result = await OperationClipModel.updatePhase(phase_id, phase_desc);

  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq;
  const phase_id = req.params.phase_id;
  const delete_result = await OperationClipModel.deletePhase(operation_seq, phase_id);
  const update_result = await OperationClipModel.unsetPhase(operation_seq, phase_id);

  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

/**
 * @swagger
 * /operations/{operation_seq}/request/analysis:
 *  post:
 *    summary: "비디오 분석 요청"
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
routes.post('/:operation_seq(\\d+)/request/analysis', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  let file_summary = null;
  let member_info = null;
  let api_request_result = null;
  let media_directory = null;
  let api_url = null;
  let is_execute_success = false;
  const service_info = ServiceConfig.getServiceInfo();

  await DBMySQL.transaction(async(transaction) => {

    const {operation_info, operation_model} = await OperationService.getOperationInfo(transaction, operation_seq, token_info);
    file_summary = await new VideoFileModel(transaction).videoFileSummary(operation_info.storage_seq);
    member_info = await new MemberModel(transaction).getMemberInfo(operation_info.member_seq);

    media_directory = operation_info.media_directory + "SEQ";
    let sep_pattern = "/";
    if (Constants.SEP === "\\") {
      sep_pattern = "\\\\";
    }
    const trans_server_directory = service_info.trans_server_root + operation_info.media_path.replace(new RegExp(sep_pattern, 'g'), service_info.trans_server_sep);

    const operation_update_param = {};
    operation_update_param.analysis_status = 'R';

    let content_id = operation_info.content_id;
    if (Util.isEmpty(content_id)) {
      content_id = Util.getContentId();
      log.d(req, 'content_id', content_id);
      if (!content_id) {
        throw new StdObject(-1, '컨텐츠 아이디 생성 실패', 500);
      }
      operation_update_param.content_id = content_id;
    }

    const query_data = {
      "DirPath": trans_server_directory,
      "ContentID": content_id
    };
    const query_str = querystring.stringify(query_data);

    const request_options = {
      hostname: service_info.trans_server_domain,
      port: service_info.trans_server_port,
      path: service_info.trans_start_api + '?' + query_str,
      method: 'GET'
    };
    api_url = 'http://' + service_info.trans_server_domain + ':' + service_info.trans_server_port + service_info.trans_start_api + '?' + query_str;
    log.d(req, api_url);
    try {
      api_request_result = await Util.httpRequest(request_options, false);
      is_execute_success = api_request_result && api_request_result.toLowerCase() === 'done';
    } catch (e) {
      log.e(req, e);
      api_request_result = e.message;
    }

    if (is_execute_success) {
      await operation_model.updateOperationInfo(operation_seq, new OperationInfo(operation_update_param));
    } else {
      throw new StdObject(-1, '비디오 분석 요청 실패', 500);
    }
  });

  if (service_info.send_process_mail === 'Y' && is_execute_success) {
    try {
      const send_mail = new SendMail();
      // const mail_to = ["hwj@mteg.co.kr", "ytcho@mteg.co.kr"];
      const mail_to = ["hwj@mteg.co.kr"];
      const subject = member_info.user_name + " 선생님으로부터 비디오 분석 요청이 있습니다.";
      let context = "";
      context += `요청 일자: ${Util.currentFormattedDate()}<br/>\n`;
      context += `파일 경로: ${media_directory}<br/>\n`;
      if (file_summary) {
        context += `파일 개수: ${file_summary.total_count}<br/>\n`;
        context += `총 용량: ${file_summary.total_size}<br/><br/>\n`;
      }
      context += `Api URL: ${api_url}<br/>\n`;
      context += `실행결과: ${Util.nlToBr(api_request_result)}<br/>\n`;
      await send_mail.sendMailHtml(mail_to, subject, context);
    } catch (e) {
      log.e(req, e);
    }
  }

  res.json(new StdObject());
}));

/**
 * @swagger
 * /operations/{operation_seq}/share:
 *  post:
 *    summary: "수술영상 공유"
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
routes.post('/:operation_seq(\\d+)/share/email', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  if (!req.body.email_list || req.body.email_list.length <= 0) {
    throw new StdObject(-1, '공유 대상자가 업습니다.', 400);
  }

  const {operation_info, operation_model} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const share_model = new OperationShareModel({DBMySQL});
  const member_info = await new MemberModel({DBMySQL}).getMemberInfo(token_info.getId());
  const share_info = await share_model.getShareInfo(operation_info);
  const share_seq = share_info.seq;
  let send_user_count = 0;

  // 수술정보 존재여부 확인 및 권한 체크
  await DBMySQL.transaction(async(transaction) => {
    const share_user_result = await new OperationShareUserModel(transaction).createShareUser(share_seq, req.body.email_list, req.body.auth_type);
    send_user_count = share_user_result.length;

    if (req.body.is_send_mail) {
      const title = `${member_info.user_name}선생님이 수술영상을 공유하였습니다.`;
      const template_data = {
        "user_name": member_info.user_name,
        "share_key": share_info.share_key,
        "comment": Util.nlToBr(req.body.comment),
        "url_prefix": req.body.url_prefix,
        "request_domain": req.body.request_domain,
        "operation_name": operation_info.operation_name ? `"${operation_info.operation_name}"` : ''
      };
      log.d(req, template_data);
      await new SendMail().sendMailHtml(req.body.email_list, title, ShareTemplate.invite(template_data));
    }
  });

  try {
    // 결과 무시.
    await operation_model.updateSharingStatus(operation_seq, true);
    await share_model.increaseSendCount(share_seq, send_user_count);
  } catch (e) {
    log.e(req, e);
  }

  const output = new StdObject();
  output.add('share_key', share_info.share_key);
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/share/users', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const share_model = new OperationShareModel({DBMySQL});
  const share_info = await share_model.getShareInfo(operation_info);

  const output = new StdObject();
  if (share_info && !share_info.isEmpty()) {
    const share_user_model = new OperationShareUserModel({DBMySQL});
    const share_user_list = await share_user_model.getShareUserList(share_info.seq);
    output.add('share_user_list', share_user_list);
  }
  res.json(output);
}));

routes.put('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const seq_list = req.body.seq_list;

  const result = await new OperationModel({ DBMySQL }).updateStatusTrash(seq_list, member_seq, false);

  const output = new StdObject();
  output.add('result', result);
  output.add('status', 'T');
  res.json(output);
}));

routes.delete('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const seq_list = req.body.seq_list;
  log.d(req, seq_list);

  const result = await new OperationModel({ DBMySQL }).updateStatusTrash(seq_list, member_seq, true);

  const output = new StdObject();
  output.add('result', result);
  output.add('status', 'Y');
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/favorite', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_model} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const result = await operation_model.updateStatusFavorite(operation_seq, false);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/favorite', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_model} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const result = await operation_model.updateStatusFavorite(operation_seq, true);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.post('/verify/operation_code', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  req.accepts('application/json');
  const operation_code = req.body.operation_code;
  const is_duplicate = await new OperationModel({ DBMySQL }).isDuplicateOperationCode(token_info.getId(), operation_code);

  const output = new StdObject();
  output.add('verify', !is_duplicate);

  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/video/url', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const {operation_info} = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const output = new StdObject();
  output.add('download_url', operation_info.media_info.origin_video_url);
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/files', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const storage_seq = operation_info.storage_seq;

  const output = new StdObject();
  output.add('video_files', await new VideoFileModel({ DBMySQL }).videoFileList(storage_seq));
  output.add('refer_files', await new ReferFileModel({ DBMySQL }).referFileList(storage_seq));

  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const file_type = req.params.file_type;

  const output = new StdObject();

  await DBMySQL.transaction(async(transaction) => {
    const {operation_info} = await OperationService.getOperationInfo(transaction, operation_seq, token_info);
    const storage_seq = operation_info.storage_seq;
    let media_directory = operation_info.media_directory;
    if (file_type !== 'refer') {
      media_directory += 'SEQ';
    } else {
      media_directory += 'REF';
    }

    if ( !( await Util.fileExists(media_directory) ) ) {
      await Util.createDirectory(media_directory);
    }

    if (file_type === 'refer') {
      await Util.uploadByRequest(req, res, 'target', media_directory, Util.getRandomId());
    } else {
      await Util.uploadByRequest(req, res, 'target', media_directory);
    }
    const upload_file_info = req.file;
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
    }
    upload_file_info.new_file_name = req.new_file_name;

    let upload_seq = null;
    let file_model = null;
    if (file_type !== 'refer') {
      file_model = new VideoFileModel(transaction);
      upload_seq = await file_model.createVideoFile(upload_file_info, storage_seq, Util.removePathSEQ(operation_info.media_path) + 'SEQ');
    } else {
      file_model = new ReferFileModel(transaction);
      upload_seq = await file_model.createReferFile(upload_file_info, storage_seq, Util.removePathSEQ(operation_info.media_path) + 'REF');
    }

    if (!upload_seq) {
      throw new StdObject(-1, '파일 정보를 저장하지 못했습니다.', 500);
    }

    if (file_type !== 'refer') {
      const origin_video_path = upload_file_info.path;
      await file_model.createAndUpdateVideoThumbnail(origin_video_path, operation_info, upload_seq);
    }

    await new OperationStorageModel(transaction).updateUploadFileSize(storage_seq, file_type);
    output.add('upload_seq', upload_seq);
  });

  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const file_type = req.params.file_type;
  const file_seq_list = req.body.file_seq_list;

  if (!file_seq_list || file_seq_list.length <= 0) {
    throw new StdObject(-1, '대상파일 정보가 없습니다', 400);
  }

  const output = new StdObject();

  await DBMySQL.transaction(async(transaction) => {
    const {operation_info} = await OperationService.getOperationInfo(transaction, operation_seq, token_info);
    const storage_seq = operation_info.storage_seq;
    if (file_type !== 'refer') {
      await new VideoFileModel(transaction).deleteSelectedFiles(file_seq_list);
    } else {
      await new ReferFileModel(transaction).deleteSelectedFiles(file_seq_list);
    }

    await new OperationStorageModel(transaction).updateUploadFileSize(storage_seq, file_type);
  });

  res.json(output);
}));

routes.get('/storage/summary', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;

  const output = new StdObject();
  const summary_info = await new OperationStorageModel({ DBMySQL }).getStorageSummary(token_info);
  if (summary_info !== null) {
    output.add('summary_info', summary_info);
  }
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/media_info', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const operation_media_info = await new OperationMediaModel({ DBMySQL }).getOperationMediaInfo(operation_info);

  const output = new StdObject();
  output.add('operation_media_info', operation_media_info);

  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/metadata', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const operation_seq = req.params.operation_seq;
  const operation_metadata = await OperationMetadataModel.findByOperationSeq(operation_seq);

  const output = new StdObject();
  output.add('operation_metadata', operation_metadata);

  res.json(output);
}));

routes.get('/clips/:member_seq(\\d+)?', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  let member_seq = req.params.member_seq;
  if (token_info.getRole() === Role.MEMBER ) {
    member_seq = token_info.getId();
  } else if (member_seq !== token_info.getId()) {
    if (token_info.getRole() !== Role.ADMIN) {
      throw new StdObject(-99, '권한이 없습니다.', 403);
    }
  }

  const clip_list = await OperationClipModel.findByMemberSeq(member_seq);

  const output = new StdObject();
  output.add('clip_list', clip_list);
  res.json(output);
}));

export default routes;
