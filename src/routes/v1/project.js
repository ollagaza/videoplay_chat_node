import { Router } from 'express';
import querystring from 'querystring';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import Util from '@/utils/baseutil';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import ServiceErrorModel from '@/models/ServiceErrorModel';
import SendMail from '@/classes/SendMail';
import log from "@/classes/Logger";
import roles from "@/config/roles";
import VideoProjectModel from '@/models/VideoProjectModel';

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

  res.json({});
});

const on_error = Wrap(async(req, res) => {
  const query_str = querystring.stringify(req.query);

  res.json(new StdObject());
});

routes.get('/video/complete', Auth.isAuthenticated(), on_complete);
routes.post('/video/complete', Auth.isAuthenticated(), on_complete);
routes.get('/video/error', Auth.isAuthenticated(), on_error);
routes.post('/video/error', Auth.isAuthenticated(), on_error);

routes.get('/video', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const video_project_list = await new VideoProjectModel({ database }).getVideoProjectList(member_seq);

  const output = new StdObject();
  output.add('video_project_list', video_project_list);
  res.json(output);
}));

routes.get('/video/:project_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  // const token_info = req.token_info;
  const project_seq = req.params.project_seq;
  const video_project = await new VideoProjectModel({ database }).getVideoProjectInfo(project_seq);

  const output = new StdObject();
  output.add('video_project', video_project);
  res.json(output);
}));

routes.post('/video', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const result = await new VideoProjectModel({ database }).createVideoProjectInfo(req.body, member_seq);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.put('/video/:project_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const project_seq = req.params.project_seq;
  const result = await new VideoProjectModel({ database }).updateVideoProject(req.body, project_seq);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/video/:project_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const project_seq = req.params.project_seq;
  const result = await new VideoProjectModel({ database }).deleteVideoProjectProgress(project_seq);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

export default routes;
