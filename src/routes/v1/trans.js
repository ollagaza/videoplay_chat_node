import { Router } from 'express';
import querystring from 'querystring';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import SendMail from '../../libs/send-mail';
import OperationModel from '../../database/mysql/operation/OperationModel';
import OperationMediaModel from '../../database/mysql/operation/OperationMediaModel';
import ServiceErrorModel from '../../database/mysql/service-error-model';
import { syncOne } from './sync';

const routes = Router();

/**
 * @swagger
 * tags:
 *  name: Trans
 *  description: 트랜스코더 연동
 *
 */

/**
 * @swagger
 * /trans/complete:
 *  get:
 *    summary: "트랜스코더의 진행 상태를 업데이트 한다."
 *    tags: [Trans]
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "content_id"
 *      in: "query"
 *      description: "콘텐츠ID"
 *      required: true
 *      type: "string"
 *    - name: success
 *      in: "query"
 *      type: "string"
 *      description: "처리 결과. 성공: true or 1. 그 외 실패"
 *      required: true
 *    - name: video_file_name
 *      in: "query"
 *      type: "string"
 *      description: "병합이 완료된 고화질 동영상 파일 이름"
 *    - name: smil_file_name
 *      in: "query"
 *      type: "string"
 *      description: "smil 파일 이름"
 *    - name: error
 *      in: "query"
 *      type: "string"
 *      description: "에러 정보"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *
 */
const on_complete = Wrap(async(req, res) => {
  const token_info = req.token_info;
  const query_str = querystring.stringify(req.query);
  log.d(req, 'api 호출', query_str);
  const service_info = ServiceConfig.getServiceInfo();

  const content_id = req.query.content_id;
  const trans_info = {
    video_file_name: req.query.video_file_name,
    smil_file_name: req.query.smil_file_name,
    error: req.query.error,
  };

  let is_complete = false;
  let message = '';
  let result = null;
  let operation_seq = null;
  try {
    if (Util.isEmpty(content_id) || Util.isEmpty(trans_info.video_file_name) || Util.isEmpty(trans_info.smil_file_name)) {
      throw new StdObject(1, '잘못된 파라미터', 400);
    }

    const operation_info = await new OperationModel(DBMySQL).getOperationInfoByContentId(content_id);
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2, '등록된 컨텐츠가 없습니다.', 400);
    }
    await new OperationMediaModel(DBMySQL).updateTransComplete(operation_info, trans_info);
    operation_seq = operation_info.seq;

    await syncOne(req, token_info, operation_seq);

    is_complete = true;
    result = new StdObject();
    log.d(req, '완료', result);
  } catch (error) {
    if(error instanceof StdObject) {
      result = error;
      message = error.message;
    } else {
      result = new StdObject(3, error.message, 500);
      result.stack = error.stack;
      message = error.message;
    }
    log.e(req, error);
    await new ServiceErrorModel(DBMySQL).createServiceError('hawkeye', operation_seq, content_id, JSON.stringify(result));
  }

  if (service_info.send_process_mail === 'Y' && is_complete) {
    const send_mail = new SendMail();
    const mail_to = ["hwj@mteg.co.kr"];
    const subject = "트랜스코딩 완료 요청";
    let context = "";
    context += `요청 일자: ${Util.currentFormattedDate()}<br/>\n`;
    context += `content_id: ${content_id}<br/>\n`;
    context += `요청 Params: ${query_str}<br/>\n`;
    context += `결과: ${is_complete}<br/>\n`;
    context += `에러: ${Util.nlToBr(message)}<br/>\n`;
    await send_mail.sendMailHtml(mail_to, subject, context);
  }

  res.json(result);
});

const on_error = Wrap(async(req, res) => {
  const query_str = querystring.stringify(req.query);
  log.d(req, '트랜스코딩 에러', query_str);

  const content_id = req.query.content_id;
  const message = req.query.message;

  if (Util.isEmpty(content_id)) {
    throw new StdObject(1, '잘못된 파라미터', 400);
  }

  const operation_model = new OperationModel(DBMySQL);
  const service_error_model = new ServiceErrorModel(DBMySQL);
  const operation_info = await operation_model.getOperationInfoByContentId(content_id);
  if (operation_info.isEmpty()) {
    await service_error_model.createServiceError('trans', null, content_id, message);
  } else {
    await operation_model.updateAnalysisStatus(operation_info.seq, 'E');
    await service_error_model.createServiceError('trans', operation_info.seq, content_id, message);
  }

  res.json(new StdObject());
});

routes.get('/complete', Auth.isAuthenticated(), on_complete);
routes.post('/complete', Auth.isAuthenticated(), on_complete);
routes.get('/error', Auth.isAuthenticated(), on_error);
routes.post('/error', Auth.isAuthenticated(), on_error);

export default routes;
