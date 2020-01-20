import { Router } from 'express';
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';

import MedicalSubject from '../../data/MedicalSubject';

const routes = Router();

/**
 * @swagger
 * tags:
 *  name: Data
 *  description: 권한이 필요하지 않은 각종 자료 조회 (병원, 부서, 배너 등등)
 *
 */

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
 *
 */
routes.get('/timestamp', Wrap(async(req, res) => {
  const now = Date.now();
  const output = new StdObject();
  output.add('timestamp', Math.floor(now / 1000));
  output.add('timestamp_mil', now);
  res.json(output);
}));


routes.get('/medical_subject', Wrap(async(req, res) => {
  const output = new StdObject();
  output.add('medical_subject', MedicalSubject.getJson());
  res.json(output);
}));

export default routes;
