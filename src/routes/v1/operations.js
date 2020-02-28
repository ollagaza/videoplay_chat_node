import { Router } from 'express';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import GroupService from '../../service/member/GroupService';
import OperationService from '../../service/operation/OperationService';
import OperationClipService from '../../service/operation/OperationClipService';
import OperationMediaService from '../../service/operation/OperationMediaService';
import OperationModel from '../../database/mysql/operation/OperationModel';
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel';
import VideoFileModel from '../../database/mysql/file/VideoFileModel';
import ReferFileModel from '../../database/mysql/file/ReferFileModel';
import OperationInfo from "../../wrapper/operation/OperationInfo";
import { OperationMetadataModel } from '../../database/mongodb/OperationMetadata';
import { UserDataModel } from '../../database/mongodb/UserData';

const routes = Router();

routes.get('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_info_page = await OperationService.getOperationListByRequest(DBMySQL, token_info, req);

  const output = new StdObject();
  output.adds(operation_info_page);
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq;

  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info, true, true);
  const output = new StdObject();
  output.add('operation_info', operation_info);

  res.json(output);
}));

routes.post('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { member_seq, group_member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_data = req.body.operation_info
  const operation_metadata = req.body.meta_data
  const output = await OperationService.createOperation(DBMySQL, group_member_info, member_seq, operation_data, operation_metadata)
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { token_info, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq;

  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  const update_result = await OperationService.updateOperation(DBMySQL, member_seq, operation_info, req.body)
  res.json(update_result);
}));

routes.delete('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq;
  await OperationService.deleteOperation(DBMySQL, token_info, operation_seq)
  const output = new StdObject();
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/indexes', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq;
  const index_list = await OperationService.getVideoIndexList(operation_seq)

  const output = new StdObject();
  output.add("index_info_list", index_list);

  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/clip/list', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq;
  const clip_list = await OperationClipService.findByOperationSeq(operation_seq);

  const output = new StdObject();
  output.add("clip_list", clip_list);

  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const phase_id = req.params.phase_id;
  const result = await OperationClipService.setPhase(phase_id, req.body)

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));
routes.delete('/:operation_seq(\\d+)/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq;
  const phase_id = req.params.phase_id;

  const result = await OperationClipService.unsetPhaseOne(operation_seq, phase_id, req.body)

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/clip', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  const create_result = await OperationClipService.createClip(operation_info, req.body)
  await new OperationStorageModel(DBMySQL).updateClipCount(operation_info.storage_seq, req.body.clip_count);
  const output = new StdObject();
  output.add('result', create_result);
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }
  const clip_id = req.params.clip_id;

  const update_result = await OperationClipService.updateClip(clip_id, req.body);

  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const clip_id = req.params.clip_id;
  const operation_seq = req.params.operation_seq;
  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  const delete_result = await OperationClipService.deleteById(clip_id, operation_info, req.body)

  const output = new StdObject();
  output.add('result', delete_result);
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/phase', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, "잘못된 요청입니다.", 400);
  }

  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);

  const create_result = await OperationClipService.createPhase(operation_info, req.body);
  const output = new StdObject();
  output.add('phase', create_result.phase_info);
  output.add('phase_id', create_result.phase_id);
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  // const operation_seq = req.params.operation_seq;
  const phase_id = req.params.phase_id;
  const phase_desc = req.body.phase_desc;

  log.d(req, phase_id, phase_desc);
  const update_result = await OperationClipService.updatePhase(phase_id, phase_desc);

  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq;
  const phase_id = req.params.phase_id;
  const delete_result = await OperationClipService.deletePhase(operation_seq, phase_id)
  const output = new StdObject();
  output.add('result', delete_result);
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/request/analysis', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  await OperationService.requestAnalysis(DBMySQL, token_info, operation_seq)

  res.json(new StdObject());
}));

routes.put('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const seq_list = req.body.seq_list;

  const result = await new OperationModel(DBMySQL).updateStatusTrash(seq_list, member_seq, false);

  const output = new StdObject();
  output.add('result', result);
  output.add('status', 'T');
  res.json(output);
}));

routes.delete('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const seq_list = req.body.seq_list;
  log.d(req, seq_list);

  const result = await new OperationModel(DBMySQL).updateStatusTrash(seq_list, member_seq, true);

  const output = new StdObject();
  output.add('result', result);
  output.add('status', 'Y');
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/favorite', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const { operation_model } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const result = await operation_model.updateStatusFavorite(operation_seq, false);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/favorite', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const { operation_model } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const result = await operation_model.updateStatusFavorite(operation_seq, true);

  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.post('/verify/operation_code', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  req.accepts('application/json');
  const operation_code = req.body.operation_code;
  const is_duplicate = await OperationService.isDuplicateOperationCode(DBMySQL, token_info.getGroupSeq(), token_info.getId(), operation_code)

  const output = new StdObject();
  output.add('verify', !is_duplicate);

  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/video/url', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info, true, true);
  const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
  const output = new StdObject();
  output.add('download_url', directory_info.cdn_video + operation_info.media_info.video_file_name);
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/files', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const storage_seq = operation_info.storage_seq;

  const output = new StdObject();
  // output.add('video_files', await new VideoFileModel(DBMySQL).videoFileList(storage_seq));
  output.add('refer_files', await new ReferFileModel(DBMySQL).referFileList(storage_seq));

  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const file_type = req.params.file_type;
  const upload_seq = await OperationService.uploadOperationFile(DBMySQL, req, res, operation_info, file_type)

  const output = new StdObject();
  output.add('upload_seq', upload_seq);

  res.json(output);
}));

routes.delete('/:operation_seq(\\d+)/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const file_type = req.params.file_type;
  const file_seq_list = req.body.file_seq_list;

  if (!file_seq_list || file_seq_list.length <= 0) {
    throw new StdObject(-1, '대상파일 정보가 없습니다', 400);
  }

  const output = new StdObject();

  await DBMySQL.transaction(async(transaction) => {
    const { operation_info } = await OperationService.getOperationInfo(transaction, operation_seq, token_info);
    const storage_seq = operation_info.storage_seq;
    if (file_type !== 'refer') {
      await new VideoFileModel(transaction).deleteSelectedFiles(file_seq_list);
    } else {
      await new ReferFileModel(transaction).deleteSelectedFiles(file_seq_list);
    }

    await new OperationStorageModel(transaction).updateUploadFileSize(storage_seq, file_type);
  });

  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/media_info', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info);
  const operation_media_info = await OperationMediaService.getOperationMediaInfo(DBMySQL, operation_info);

  const output = new StdObject();
  output.add('operation_media_info', operation_media_info);

  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/metadata', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const operation_seq = req.params.operation_seq;
  const operation_metadata = await OperationMetadataModel.findByOperationSeq(operation_seq);

  const output = new StdObject();
  output.add('operation_metadata', operation_metadata);

  res.json(output);
}));

routes.get('/clips/:member_seq(\\d+)?', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info;
  let member_seq = req.params.member_seq;
  if (member_seq && member_seq !== token_info.getId()) {
    if (token_info.getRole() !== Role.ADMIN) {
      throw new StdObject(-99, '권한이 없습니다.', 403);
    }
  }

  const clip_list = await OperationClipService.findByGroupSeq(token_info.group_seq);

  const output = new StdObject();
  output.add('clip_list', clip_list);
  res.json(output);
}));



export default routes;
