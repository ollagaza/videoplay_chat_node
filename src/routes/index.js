import { Router } from 'express';

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
 *      success:
 *        type: "boolean"
 *        description: "성공여부"
 *        default: true
 *  DefaultError:
 *    type: "object"
 *    properties:
 *      error:
 *        type: "integer"
 *        description: "에러코드"
 *      message:
 *        type: "string"
 *        description: "에러 메시지"
 *      httpStatusCode:
 *        type: "string"
 *        description: "HTTP Status Code"
 *      variables:
 *        type: "object"
 *        description: "기타 정보"
 *
 */

/**
 * in a one-shot manner. There should not be any reason to edit this file.
 */
const files = require.context('.', true, /\/[^.]+\.js$/);

files.keys().forEach((key) => {
  if (key === './index.js') return;

  routes.use(key.replace(/(\.)|(js)/g, ''), files(key).default);
});

export default routes;
