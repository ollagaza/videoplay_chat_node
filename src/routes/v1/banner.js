import { Router } from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';

const routes = Router();

/**
 * @swagger
 * tags:
 *  name: Banner
 *  description: 배너에 필요한 정보들을 조회
 *
 */

/**
 * @swagger
 * /banner/new_join_users:
 *  get:
 *    summary: "신규 가입자 목록"
 *    tags: [Banner]
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
routes.get('/new_join_users', wrap(async(req, res) => {
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
