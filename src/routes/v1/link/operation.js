import { Router } from 'express';
import Wrap from '../../../utils/express-async';
import Auth from '../../../middlewares/auth.middleware';
import Role from "../../../constants/roles";
import DBMySQL from '../../../database/knex-mysql';
import StdObject from '../../../wrapper/std-object';
import OperationLinkService from "../../../service/operation/OperationLinkService";
import OperationService from "../../../service/operation/OperationService";
import OperationClipService from '../../../service/operation/OperationClipService'
import GroupService from '../../../service/member/GroupService'
import Util from '../../../utils/baseutil'
import { OperationMetadataModel } from '../../../database/mongodb/OperationMetadata'
import OperationStorageModel from '../../../database/mysql/operation/OperationStorageModel'
import OperationFileService from '../../../service/operation/OperationFileService'

const routes = Router();

const getOperationInfoByCode = async (request, import_media_info = false, only_writer = false) => {
  const link_code = request.params.link_code
  if (Util.isEmpty(link_code)) {
    throw new StdObject(-1, '잘못된 접근입니다.', 400)
  }
  const link_info = await OperationLinkService.getOperationLinkByCode(DBMySQL, link_code)
  if (only_writer) {
    if (link_info.auth !== OperationLinkService.AUTH_WRITE) {
      throw new StdObject(-2, '권한이 없습니다.', 403)
    }
  }
  const operation_seq = link_info.operation_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, import_media_info)

  const clip_id = request.params.clip_id
  const phase_id = request.params.phase_id

  return {
    link_code,
    operation_seq,
    link_info,
    operation_info,
    clip_id,
    phase_id
  }
}

routes.get('/check/:link_code', Wrap(async (req, res) => {
  const link_code = req.params.link_code
  const link_info = await OperationLinkService.checkOperationLinkByCode(DBMySQL, link_code)

  const output = new StdObject()
  output.add('link_info', link_info)
  res.json(output);
}));

routes.post('/check/password/:link_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const link_seq = req.params.link_seq
  const password = req.body.password

  const is_verified = await OperationLinkService.checkLinkPassword(DBMySQL, link_seq, password)

  const output = new StdObject()
  output.add('is_verified', is_verified)
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/email', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq;
  const link_info_list = await OperationLinkService.getOperationLinkList(DBMySQL, operation_seq, OperationLinkService.TYPE_EMAIL)

  const output = new StdObject()
  output.add('link_info_list', link_info_list)
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/static', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq;
  const link_info_list = await OperationLinkService.getOperationLinkList(DBMySQL, operation_seq, OperationLinkService.TYPE_STATIC)

  const output = new StdObject()
  output.add('link_info_list', link_info_list)
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)/has_link', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq;
  const has_link = await OperationLinkService.hasLink(DBMySQL, operation_seq)

  const output = new StdObject()
  output.add('has_link', has_link)
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/email', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { member_info, token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq;
  const link_info_list = await OperationLinkService.createOperationLinkByEmailList(operation_seq, member_info, req.body, token_info.getServiceDomain())

  const output = new StdObject()
  output.add('send_count', link_info_list.length)
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/static', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq;
  const link_info = await OperationLinkService.createOperationLinkOne(operation_seq, req.body)

  const output = new StdObject()
  output.add('link_info', link_info)
  res.json(output);
}));

routes.put('/:link_seq(\\d+)/options', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  req.accepts('application/json');
  const link_seq = req.params.link_seq;
  const result = await OperationLinkService.setLinkOptionBySeq(link_seq, req.body)

  const output = new StdObject()
  output.add('result', result)
  res.json(output);
}));

routes.delete('/:link_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  req.accepts('application/json');
  const link_seq = req.params.link_seq;
  const result = await OperationLinkService.deleteOperationLinkBySeq(link_seq)

  const output = new StdObject()
  output.add('result', result)
  res.json(output);
}));

routes.get('/view/:link_code', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { link_info, operation_info } = await getOperationInfoByCode(req, true)

  const output = new StdObject()
  output.add('link_info', link_info)
  output.add('operation_info', operation_info)
  res.json(output);
}));

routes.put('/edit/:link_code', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { operation_info, member_seq } = await getOperationInfoByCode(req, true)
  const update_result = await OperationService.updateOperation(DBMySQL, member_seq, operation_info, req.body)
  res.json(update_result);
}));

routes.get('/view/:link_code/metadata', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { operation_seq } = await getOperationInfoByCode(req, false)
  const operation_metadata = await OperationMetadataModel.findByOperationSeq(operation_seq);

  const output = new StdObject();
  output.add('operation_metadata', operation_metadata);

  res.json(output);
}));

routes.get('/view/:link_code/files', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { operation_info } = await getOperationInfoByCode(req, false)
  const { refer_file_list } = await OperationFileService.getFileList(DBMySQL, operation_info)
  const output = new StdObject();
  output.add('refer_files', refer_file_list);
  res.json(output);
}));

routes.post('/edit/:link_code/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { operation_info } = await getOperationInfoByCode(req, false)
  const file_type = req.params.file_type;
  const upload_seq = await OperationService.uploadOperationFile(DBMySQL, req, res, operation_info, file_type)

  const output = new StdObject();
  output.add('upload_seq', upload_seq);
  res.json(output);
}));

routes.delete('/edit/:link_code/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const output = new StdObject();
  const file_type = req.params.file_type;
  if (file_type !== OperationFileService.TYPE_REFER) {
    res.json(output);
  }

  const file_seq_list = req.body.file_seq_list;
  if (!file_seq_list || file_seq_list.length <= 0) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400);
  }

  const { operation_info } = await getOperationInfoByCode(req, false)

  await DBMySQL.transaction(async(transaction) => {
    const storage_seq = operation_info.storage_seq;
    await OperationFileService.deleteReferFileList(transaction, operation_info, file_seq_list);
    await new OperationStorageModel(transaction).updateUploadFileSize(storage_seq, file_type);
  });

  res.json(output);
}));

routes.get('/view/:link_code/video/url', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { operation_info } = await getOperationInfoByCode(req, true)
  const download_url = OperationService.getVideoDownloadURL(operation_info)
  const output = new StdObject();
  output.add('download_url', download_url);
  res.json(output);
}));

export default routes;
