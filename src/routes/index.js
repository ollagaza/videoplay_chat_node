import {Router} from 'express';
import Config from '../config/config';
import log from "../libs/logger";

require('babel-plugin-require-context-hook/register')();

const routes = Router();


/**
 * @swagger
 * securityDefinitions:
 *  access_token:
 *    type: "apiKey"
 *    name: "Authorization"
 *    in: "header"
 * definitions:
 *  DefaultResponse:
 *    type: "object"
 *    properties:
 *      error:
 *        type: "integer"
 *        description: "에러코드"
 *        default: 0
 *      message:
 *        type: "string"
 *        description: "에러 메시지"
 *        default: ""
 *      httpStatusCode:
 *        type: "integer"
 *        description: "HTTP Status Code"
 *        default: 200
 *      variables:
 *        type: "object"
 *        description: "기타 정보"
 *        default: {}
 *  DefaultError:
 *    type: "object"
 *    properties:
 *      error:
 *        type: "integer"
 *        description: "에러코드. 0이면 요청 성공"
 *      message:
 *        type: "string"
 *        description: "에러 메시지"
 *      httpStatusCode:
 *        type: "string"
 *        description: "HTTP Status Code"
 *      variables:
 *        type: "object"
 *        description: "기타 정보"
 *  PageNavigation:
 *    type: "object"
 *    properties:
 *      total_count:
 *        type: "integer"
 *        description: "전체 레코드 개수"
 *      total_page:
 *        type: "integer"
 *        description: "전체 페이지 개수"
 *      cur_page:
 *        type: "integer"
 *        description: "현재 페이지 번호"
 *      page_count:
 *        type: "integer"
 *        description: "현재 화면의 페이지 개수"
 *      point:
 *        type: "integer"
 *        description: "페이지 인덱스"
 *      first_page:
 *        type: "integer"
 *        description: "첫번째 페이지 번호"
 *      last_page:
 *        type: "integer"
 *        description: "마지막 페이지 번호"
 *
 */

const files = require.context('.', true, /\/[^.]+\.js$/);
const demon_regex = /.+\/demon\//i;

files.keys().forEach((key) => {
  if (key === './index.js') return;

  if (files(key).default) {
    if (demon_regex.test(key)) {
      if (!Config.isDemon()) {
        return;
      }
    }
    log.d(null, 'add api', key);
    routes.use(key.replace(/(\.)|(js)/g, ''), files(key).default);
  }
});

export default routes;
