import { Router } from 'express';
import Wrap from '../../../utils/express-async';
import Auth from '../../../middlewares/auth.middleware';
import Role from "../../../constants/roles";
import DBMySQL from '../../../database/knex-mysql';
import StdObject from '../../../wrapper/std-object';
import OperationLinkService from "../../../service/operation/OperationLinkService";
import OperationService from "../../../service/operation/OperationService";
import OperationClipService from '../../../service/operation/OperationClipService'
import log from '../../../libs/logger'
import Util from '../../../utils/baseutil'

const routes = Router();

const getOperationInfoByCode = async (request, import_media_info = false, only_writer = false) => {
  const link_code = request.params.link_code
  if (Util.isEmpty(link_code)) {
    throw new StdObject(-1, '잘못된 접근입니다.', 400)
  }
  const link_info = await OperationLinkService.getOperationLinkByCode(DBMySQL, link_code)
  if (only_writer) {
    if (link_info.link_type !== 'W') {
      throw new StdObject(-2, '권한이 없습니다.', 403)
    }
  }
  const operation_seq = link_info.operation_seq
  const { operation_info } = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, import_media_info)

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

routes.get('/check/:link_code', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res, next) => {
  const link_code = req.params.link_code
  const check_result = await OperationLinkService.checkOperationLinkByCode(DBMySQL, link_code)
  res.json(check_result);
}));

routes.post('/check/password/:link_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res, next) => {
  req.accepts('application/json');
  const link_seq = req.params.link_seq
  const password = req.body.password

  const is_verified = await OperationLinkService.checkLinkPassword(DBMySQL, link_seq, password)

  const output = new StdObject()
  output.add('is_verified', is_verified)
  res.json(output);
}));

routes.get('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res, next) => {
  const operation_seq = req.params.operation_seq;
  const link_info = await OperationLinkService.getOperationLink(DBMySQL, operation_seq)
  const link_info_json = link_info.toJSON()
  link_info_json.use_password = link_info.password

  const output = new StdObject()
  output.add('link_info', link_info_json)
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res, next) => {
  const operation_seq = req.params.operation_seq;
  const link_info = await OperationLinkService.createOperationLink(operation_seq)

  const link_info_json = link_info.toJSON()
  link_info_json.use_password = link_info.password

  const output = new StdObject()
  output.add('link_info', link_info_json)
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/options', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res, next) => {
  req.accepts('application/json');
  const operation_seq = req.params.operation_seq;
  const result = await OperationLinkService.setLinkOptionByOperation(operation_seq, req.body)

  const output = new StdObject()
  output.add('result', result)
  res.json(output);
}));

routes.get('/view/:link_code', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res, next) => {
  const { link_info, operation_info } = await getOperationInfoByCode(req, true)

  const output = new StdObject()
  output.add('link_info', link_info)
  output.add('operation_info', operation_info)
  res.json(output);
}));

routes.get('/view/:link_code/indexes', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { operation_seq } = await getOperationInfoByCode(req, false)
  const index_list = await OperationService.getVideoIndexList(operation_seq)

  const output = new StdObject();
  output.add("index_info_list", index_list);

  res.json(output);
}));

routes.get('/view/:link_code/clip/list', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { operation_seq } = await getOperationInfoByCode(req, false)

  const clip_list = await OperationClipService.findByOperationSeq(operation_seq);
  const output = new StdObject();
  output.add("clip_list", clip_list);

  res.json(output);
}));

routes.post('/view/:link_code/clip', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { operation_info } = await getOperationInfoByCode(req, false, true)

  const create_result = await OperationClipService.createClip(operation_info, req.body);
  const output = new StdObject();
  output.add('result', create_result);
  res.json(output);
}));

routes.put('/view/:link_code/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { clip_id } = await getOperationInfoByCode(req, false, true)

  const update_result = await OperationClipService.updateClip(clip_id, req.body);
  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

routes.put('/view/:link_code/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { phase_id } = await getOperationInfoByCode(req, false, true)

  const result = await OperationClipService.setPhase(phase_id, req.body)
  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/view/:link_code/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { operation_seq, phase_id } = await getOperationInfoByCode(req, false, true)

  const result = await OperationClipService.unsetPhaseOne(operation_seq, phase_id, req.body)
  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/view/:link_code/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { clip_id, operation_info } = await getOperationInfoByCode(req, false, true)

  const delete_result = await OperationClipService.deleteById(clip_id, operation_info, req.body);
  const output = new StdObject();
  output.add('result', delete_result);
  res.json(output);
}));

routes.post('/view/:link_code/phase', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { operation_info } = await getOperationInfoByCode(req, false, true)

  const create_result = await OperationClipService.createPhase(operation_info, req.body);
  const output = new StdObject();
  output.add('phase', create_result.phase_info);
  output.add('phase_id', create_result.phase_id);
  res.json(output);
}));

routes.put('/view/:link_code/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { phase_id } = await getOperationInfoByCode(req, false, true)

  const phase_desc = req.body.phase_desc;
  const update_result = await OperationClipService.updatePhase(phase_id, phase_desc);
  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

routes.delete('/view/:link_code/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { phase_id, operation_seq } = await getOperationInfoByCode(req, false, true)

  const delete_result = await OperationClipService.deletePhase(operation_seq, phase_id)
  const output = new StdObject();
  output.add('result', delete_result);
  res.json(output);
}));

export default routes;
