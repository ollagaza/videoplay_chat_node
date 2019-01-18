import { Router } from 'express';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import Util from '@/utils/baseutil';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import OperationModel from '@/models/OperationModel';
import OperationMediaModel from '@/models/OperationMediaModel';


const routes = Router();

/**
 * @swagger
 * tags:
 *  name: Trans
 *  description: 트랜스코더 연동
 * definitions:
 *  TransStatusInfo:
 *    type: "object"
 *    description: "트랜스코더 상태 정보"
 *    properties:
 *      success:
 *        type: "string"
 *        description: "처리 결과. 성공: true or 1. 그 외 실패"
 *      video_file_name:
 *        type: "string"
 *        description: "병합이 완료된 고화질 동영상 파일 이름"
 *      smil_file_name:
 *        type: "string"
 *        description: "smil 파일 이름"
 *    required:
 *      - success
 *
 */

/**
 * @swagger
 * /trans/complete/{content_id}:
 *  put:
 *    summary: "트랜스코더의 진행 상태를 업데이트 한다."
 *    tags: [Trans]
 *    consumes:
 *    - "application/json"
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "content_id"
 *      in: "path"
 *      description: "콘텐츠ID"
 *      required: true
 *      type: "string"
 *    - name: "body"
 *      in: "body"
 *      description: "트랜스코더 상태 정보"
 *      required: true
 *      schema:
 *        $ref: "#/definitions/TransStatusInfo"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *
 */
routes.put('/complete/:content_id', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const content_id = req.params.content_id;
  const trans_info = req.body;
  console.log(trans_info);
  const success = ("" + trans_info.success).toLowerCase();
  const is_success = !trans_info ? false : (success === 'true' || success === '1');
  if (is_success) {
    if (Util.isEmpty(trans_info) || Util.isEmpty(trans_info.video_file_name) || Util.isEmpty(trans_info.smil_file_name)) {
      throw new StdObject(1, '잘못된 파라미터', 400);
    }

    const operation_info = await new OperationModel({ database }).getOperationInfoByContentId(content_id);
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2, '등록된 컨텐츠가 없습니다.', 400);
    }
    await new OperationMediaModel({ database }).updateTransComplete(operation_info, trans_info);
  }

  res.json(new StdObject());
}));

export default routes;
