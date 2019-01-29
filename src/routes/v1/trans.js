import { Router } from 'express';
import querystring from 'querystring';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import Util from '@/utils/baseutil';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import OperationModel from '@/models/OperationModel';
import OperationMediaModel from '@/models/OperationMediaModel';
import SendMail from '@/classes/SendMail';
import log from "@/classes/Logger";
import {sync_one} from '@/routes/v1/sync';

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
const on_complate = Wrap(async(req, res) => {
  const token_info = req.token_info;
  const query_str = querystring.stringify(req.query);
  log.d(req, 'api 호출', query_str);

  const content_id = req.query.content_id;
  const trans_info = {
    video_file_name: req.query.video_file_name,
    smil_file_name: req.query.smil_file_name,
    error: req.query.error,
  };

  let is_complete = false;
  let message = '';
  let result = null;
  try {
    if (Util.isEmpty(content_id) || Util.isEmpty(trans_info.video_file_name) || Util.isEmpty(trans_info.smil_file_name)) {
      throw new StdObject(1, '잘못된 파라미터', 400);
    }

    const operation_info = await new OperationModel({ database }).getOperationInfoByContentId(content_id);
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2, '등록된 컨텐츠가 없습니다.', 400);
    }
    await new OperationMediaModel({ database }).updateTransComplete(operation_info, trans_info);

    await sync_one(token_info, operation_info.seq, content_id);
    is_complete = true;
    result = new StdObject();
    log.d(req, '완료', result);
  } catch (error) {
    if(error instanceof StdObject) {
      result = error;
      message = error.message;
    } else {
      result = new StdObject(3, error.message, 500);
      message = error.message;
    }
    log.e(req, error);
  }

  if (req.query.success != null) {
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

routes.get('/complete', Auth.isAuthenticated(), on_complate);
routes.post('/complete', Auth.isAuthenticated(), on_complate);

export default routes;