import { Router } from 'express';
import querystring from 'querystring';
import service_config from '@/config/service.config';
import roles from "@/config/roles";
import Auth from '@/middlewares/auth.middleware';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import ServiceErrorModel from '@/models/ServiceErrorModel';
import SendMail from '@/classes/SendMail';
import log from "@/classes/Logger";
import MemberModel from '@/models/MemberModel';
import VideoProjectModel from '@/db/mongodb/model/VideoProject';
import ContentIdManager from '@/classes/ContentIdManager';

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

const getMemberInfo = async (database, member_seq) => {
  const member_info = await new MemberModel({ database: database }).getMemberInfo(member_seq);
  if (!member_info || member_info.isEmpty()) {
    throw new StdObject(-1, '회원정보가 없습니다.', 401)
  }
  return member_info;
};

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
  const video_project_list = await VideoProjectModel.findByMemberSeq(member_seq);

  const output = new StdObject();
  output.add('video_project_list', video_project_list);
  res.json(output);
}));

routes.get('/video/:project_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  // const token_info = req.token_info;
  const project_seq = req.params.project_seq;
  const video_project = await VideoProjectModel.findOneById(project_seq);

  const output = new StdObject();
  output.add('video_project', video_project);
  res.json(output);
}));

routes.post('/video', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');

  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const body = req.body;

  const member_info = await getMemberInfo(database, member_seq);
  const service_info = service_config.getServiceInfo();
  const content_id = await ContentIdManager.getContentId();
  const media_root = service_info.media_root;
  const user_media_path = member_info.user_media_path;
  const project_path = user_media_path + "VideoProject\\" + content_id + "\\";

  await Util.createDirectory(media_root + project_path);

  const result = await VideoProjectModel.createVideoProject(member_seq, body.operation_seq_list, content_id, body.project_name, project_path, body.total_time, body.sequence_list);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.put('/video/:project_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const body = req.body;

  const project_seq = req.params.project_seq;
  const result = await VideoProjectModel.updateByEditor(project_seq, body.operation_seq_list, body.project_name, body.total_time, body.sequence_list);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/video/:project_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const project_seq = req.params.project_seq;
  const result = await new VideoProjectModel.deleteById(project_seq);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

export default routes;
