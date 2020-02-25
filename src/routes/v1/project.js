import { Router } from 'express';
import querystring from 'querystring';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import GroupService from '../../service/member/GroupService'
import MemberModel from '../../database/mysql/member/MemberModel';
import {VideoProjectField, VideoProjectModel} from '../../database/mongodb/VideoProject';
import SequenceModel from '../../models/sequence/SequenceModel';

const routes = Router();

const getMemberInfo = async (database, member_seq) => {
  const member_info = await new MemberModel(database).getMemberInfo(member_seq);
  if (!member_info || member_info.isEmpty()) {
    throw new StdObject(-1, '회원정보가 없습니다.', 401);
  }
  return member_info;
};

routes.get('/video', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const video_project_list = await VideoProjectModel.findByGroupSeq(token_info.getGroupSeq(), '-sequence_list');

  const output = new StdObject();
  output.add('video_project_list', video_project_list);
  res.json(output);
}));

routes.get('/video/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const project_seq = req.params.project_seq;
  const video_project = await VideoProjectModel.findOneById(project_seq);

  const output = new StdObject();
  output.add('video_project', video_project);
  res.json(output);
}));

routes.post('/video', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_member_info, token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const data = req.body;

  const service_info = ServiceConfig.getServiceInfo();
  const content_id = Util.getContentId();
  const media_root = service_info.media_root;
  const project_path = `${group_member_info.media_path}/studio/${content_id}/`;

  await Util.createDirectory(media_root + project_path);
  data.group_seq = token_info.getGroupSeq();
  data.member_seq = member_seq;
  data.content_id = content_id;
  data.project_path = project_path;
  data.parent_directory = data.parent_directory || '';

  const fields = VideoProjectField();
  fields.group_seq.require = true;
  fields.member_seq.require = true;
  fields.content_id.require = true;
  fields.project_name.require = true;
  fields.project_path.require = true;
  fields.total_time.require = true;
  fields.sequence_list.require = true;

  const payload = Util.getPayload(data, fields);

  const result = await VideoProjectModel.createVideoProject(payload);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.put('/video/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const data = req.body;
  data.sequence_count = data.sequence_list ? data.sequence_list.length : 0;

  const project_seq = req.params.project_seq;

  const fields = VideoProjectField();
  fields.project_name.require = true;
  fields.sequence_list.require = true;
  fields.operation_seq_list.require = true;
  fields.sequence_list.require = true;

  const payload = Util.getPayload(data, fields);

  const result = await VideoProjectModel.updateFromEditor(project_seq, payload);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.put('/video/favorite/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const project_seq = req.params.project_seq;
  const result = await VideoProjectModel.updateFavorite(project_seq, true);

  const output = new StdObject();
  output.add('result', result);
  output.add('status', true);
  res.json(output);
}));

routes.delete('/video/favorite/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const project_seq = req.params.project_seq;
  const result = await VideoProjectModel.updateFavorite(project_seq, false);

  const output = new StdObject();
  output.add('result', result);
  output.add('status', false);
  res.json(output);
}));

routes.put('/video/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const id_list = req.body.id_list;
  const result = await VideoProjectModel.updateStatus(member_seq, id_list, 'T');

  const output = new StdObject();
  output.add('result', result);
  output.add('status', 'T');
  res.json(output);
}));

routes.delete('/video/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const group_seq = token_info.getGroupSeq();
  const id_list = req.body.id_list;
  const result = await VideoProjectModel.updateStatus(group_seq, id_list, 'Y');

  const output = new StdObject();
  output.add('result', result);
  output.add('status', 'Y');
  res.json(output);
}));

routes.delete('/video/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const group_seq = token_info.getGroupSeq();
  const project_seq = req.params.project_seq;
  const result = await VideoProjectModel.deleteById(group_seq, project_seq);
  const output = new StdObject();
  output.add('result', result);
  res.json(output);
  if (result && result.project_path) {
    (async () => {
      const service_info = ServiceConfig.getServiceInfo();
      const media_root = service_info.media_root;
      await Util.deleteDirectory(media_root + result.project_path);
    })();
  }
}));

routes.post('/video/make/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const project_seq = req.params.project_seq;
  const video_project = await VideoProjectModel.findOneById(project_seq);
  if (!video_project || !video_project.sequence_list || video_project.sequence_list.length <= 0) {
    throw new StdObject(-1, '등록된 동영상 정보가 없습니다.', 400);
  }
  const result = await VideoProjectModel.updateRequestStatus(project_seq, 'R');

  const output = new StdObject();
  output.add('result', result._id && result._id > 0);
  output.add('status', 'R');
  res.json(output);
  (async() => {
    const service_info = ServiceConfig.getServiceInfo();
    const directory = service_info.media_root + result.project_path;
    let sep_pattern = "/";
    if (Constants.SEP === "\\") {
      sep_pattern = "\\\\";
    }
    const editor_server_directory = service_info.auto_editor_file_root + result.project_path.replace(new RegExp(sep_pattern, 'g'), service_info.auto_editor_sep);

    const scale = 1;
    const sequence_list = result.sequence_list;
    const sequence_model_list = [];
    for (let i = 0; i < sequence_list.length; i++) {
      const sequence_model = new SequenceModel().init(sequence_list[i]);
      if (sequence_model.type) {
        sequence_model_list.push(await sequence_model.getXmlJson(i, scale, directory, editor_server_directory));
      }
    }

    const video_xml_json = {
      "VideoInfo": {
        "MediaInfo": {
          "ContentId": result.content_id,
          "Width": 1920 * scale,
          "Height": 1080 * scale,
        },
        "SequenceList": {
          "Sequence": sequence_model_list
        }
      }
    };

    const file_name = 'video_project.xml';
    await Util.writeXmlFile(directory, file_name, video_xml_json);

    const query_data = {
      "DirPath": editor_server_directory,
      "ContentID": result.content_id,
      "XmlFilePath": editor_server_directory + file_name
    };
    const query_str = querystring.stringify(query_data);

    const request_options = {
      hostname: service_info.auto_editor_server_domain,
      port: service_info.auto_editor_server_port,
      path: service_info.auto_editor_merge_api + '?' + query_str,
      method: 'GET'
    };

    const api_url = 'http://' + service_info.auto_editor_server_domain + ':' + service_info.auto_editor_server_port + service_info.auto_editor_merge_api + '?' + query_str;
    log.d(req, 'request - start', api_url);

    let api_request_result = null;
    let is_execute_success = false;
    try {
      api_request_result = await Util.httpRequest(request_options, false);
      is_execute_success = api_request_result && api_request_result.toLowerCase() === 'done';
    } catch (e) {
      log.e(req, e);
      api_request_result = e.message;
    }
    log.d(req, 'request - result', is_execute_success, api_url, api_request_result);
  })();
}));


routes.put('/upload/image', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const member_model = new MemberModel(DBMySQL);
  const member_info = await member_model.getMemberInfo(member_seq);
  const media_root = ServiceConfig.get('media_root');
  const upload_path = member_info.user_media_path + "_upload_" + Constants.SEP + "project" + Constants.SEP + "image";
  const upload_full_path = media_root + upload_path;
  if (!(await Util.fileExists(upload_full_path))) {
    await Util.createDirectory(upload_full_path);
  }

  const new_file_name = Util.getRandomId();
  await Util.uploadByRequest(req, res, 'image', upload_full_path, new_file_name);
  const upload_file_info = req.file;
  if (Util.isEmpty(upload_file_info)) {
    throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
  }

  log.d(req, upload_file_info);
  const image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), upload_path + Constants.SEP + new_file_name);
  const output = new StdObject();
  output.add('image_url', image_url);
  res.json(output);
}));

routes.get('/video/make/process', Wrap(async(req, res) => {
  const content_id = req.query.ContentID;
  const process_info = {
    status: req.query.Status,
    video_file_name: req.query.VideoFileName,
    smil_file_name: req.query.SmilFileName,
  };
  if (Util.isEmpty(process_info.status)) {
    throw new StdObject(1, '잘못된 파라미터', 400);
  }
  let is_success = false;
  if (process_info.status === 'start') {
    const result = await VideoProjectModel.updateRequestStatusByContentId(content_id, 'S', 0);
    if (result && result.ok === 1) {
      is_success = true;
    } else {
      log.e(req, result);
    }
  } else if (process_info.status === 'complete') {
    if (Util.isEmpty(process_info.video_file_name) || Util.isEmpty(process_info.smil_file_name)) {
      throw new StdObject(2, '결과파일 이름 누락', 400);
    }

    const video_project = await VideoProjectModel.findOneByContentId(content_id);
    if (Util.isEmpty(video_project)) {
      throw new StdObject(4, '프로젝트 정보를 찾을 수 없습니다.', 400);
    }
    const path_url = Util.pathToUrl(video_project.project_path);
    const service_info = ServiceConfig.getServiceInfo();
    const video_directory = service_info.media_root + video_project.project_path;
    const video_file_path = video_directory + process_info.video_file_name;
    const total_size = await Util.getDirectoryFileSize(video_directory);
    const video_file_size = await Util.getFileSize(video_file_path);
    process_info.download_url = Util.pathToUrl(ServiceConfig.get('static_storage_prefix')) + path_url + process_info.video_file_name;
    process_info.stream_url = ServiceConfig.get('hls_streaming_url') + path_url + process_info.smil_file_name + '/playlist.m3u8';
    process_info.total_size = total_size;
    process_info.video_file_size = video_file_size;

    const result = await VideoProjectModel.updateRequestStatusByContentId(content_id, 'Y', 100, process_info);
    if (result && result.ok === 1) {
      is_success = true;
    } else {
      log.e(req, result);
    }
  } else {
    throw new StdObject(3, '잘못된 상태 값', 400);
  }
  res.send(is_success ? 'ok' : 'fail');
}));

routes.post('/video/operation', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const operation_seq_list = req.body.operation_seq_list;
  const token_info = req.token_info;
  const group_seq = token_info.getGroupSeq();
  const video_project_list = await VideoProjectModel.findByOperationSeq(group_seq, operation_seq_list, '-sequence_list');

  const output = new StdObject();
  output.add('video_project_list', video_project_list);
  res.json(output);
}));

export default routes;
