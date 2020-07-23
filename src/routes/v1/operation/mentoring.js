import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import GroupService from '../../../service/member/GroupService'
import DBMySQL from '../../../database/knex-mysql'
import OperationDataService from '../../../service/operation/OperationDataService'
import StdObject from '../../../wrapper/std-object'
import OperationService from '../../../service/operation/OperationService'
import MentoringCommentService from '../../../service/mentoring/MentoringCommentService'
import OperationClipService from '../../../service/operation/OperationClipService'
import log from '../../../libs/logger'

const routes = Router();

const getOperationDataInfo = async (request, check_auth = false, check_writer = false, import_operation_info = false) => {
  const operation_data_seq = request.params.operation_data_seq
  const operation_data_info = await OperationDataService.getOperationData(DBMySQL, operation_data_seq)
  if (!operation_data_info || operation_data_info.isEmpty()) {
    throw new StdObject(100, '등록된 정보가 없습니다.', 400)
  }
  const { group_seq, group_member_info, member_info, member_seq } = await GroupService.checkGroupAuth(DBMySQL, request, true, true, true)
  const is_writer = operation_data_info.group_seq === group_seq
  if (check_writer && !is_writer) {
    throw new StdObject(101, '수정 권한이 없습니다.', 403)
  }
  const comment_seq = request.params.comment_seq
  const clip_id = request.params.clip_id
  const phase_id = request.params.phase_id
  const result = {
    member_seq,
    group_seq,
    group_member_info,
    member_info,
    operation_data_info,
    operation_data_seq,
    is_writer,
    comment_seq,
    clip_id,
    phase_id,
    operation_seq: operation_data_info.operation_seq
  }
  if (check_auth) {
    if (operation_data_info.mento_group_seq !== group_seq && operation_data_info.group_seq !== group_seq) {
      throw new StdObject(102, '접근 권한이 없습니다.', 403)
    }
  }
  if (import_operation_info) {
    const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_data_info.operation_seq, null, false, true)
    result.operation_info = operation_info
  }
  return result
}

routes.get('/:operation_data_seq(\\d+)/view', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { operation_data_info, group_seq } = await getOperationDataInfo(req, true)
  const output = await OperationService.getOperationDataView(operation_data_info.operation_seq, group_seq)
  res.json(output);
}));

routes.post('/:operation_data_seq(\\d+)/info', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { operation_data_info, group_seq } = await getOperationDataInfo(req, true)
  const output = await OperationService.getOperationDataInfo(operation_data_info.operation_seq, group_seq, req.body)
  res.json(output);
}));

routes.put('/:operation_data_seq(\\d+)/doc', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { operation_data_seq } = await getOperationDataInfo(req, true, true)
  const result = await OperationDataService.changeDocument(operation_data_seq, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output);
}));

routes.get('/:operation_data_seq(\\d+)/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { operation_data_seq } = await getOperationDataInfo(req, false)
  const comment_list = await MentoringCommentService.getCommentList(DBMySQL, operation_data_seq, req.query)

  const output = new StdObject();
  output.add('comment_list', comment_list)

  if (req.query && req.query.with_count === 'y') {
    const comment_count = await MentoringCommentService.getCommentCount(DBMySQL, operation_data_seq)
    output.add('comment_count', comment_count)
  }

  res.json(output);
}));

routes.post('/:operation_data_seq(\\d+)/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { group_seq, operation_data_seq } = await getOperationDataInfo(req, true)
  const comment_seq = await MentoringCommentService.createComment(DBMySQL, operation_data_seq, group_seq, req.body)

  const output = new StdObject();
  output.add('comment_seq', comment_seq)
  res.json(output);
}));

routes.get('/:operation_data_seq(\\d+)/comment/count', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { operation_data_seq } = await getOperationDataInfo(req, false)
  const comment_count = await MentoringCommentService.getCommentCount(DBMySQL, operation_data_seq)

  const output = new StdObject();
  output.add('comment_count', comment_count)
  res.json(output);
}));

routes.get('/:operation_data_seq(\\d+)/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const { operation_data_seq, comment_seq } = await getOperationDataInfo(req, false)
  const comment_info = await MentoringCommentService.getComment(DBMySQL, operation_data_seq, comment_seq)

  const output = new StdObject();
  output.add('comment_info', comment_info)

  if (req.query && req.query.with_count === 'y') {
    const comment_count = await MentoringCommentService.getCommentCount(DBMySQL, operation_data_seq)
    output.add('comment_count', comment_count)
  }

  res.json(output);
}));

routes.put('/:operation_data_seq(\\d+)/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { operation_data_seq, comment_seq } = await getOperationDataInfo(req, true)
  const comment_info = await MentoringCommentService.changeComment(DBMySQL, operation_data_seq, comment_seq, req.body)

  const output = new StdObject();
  output.add('comment_info', comment_info)
  res.json(output);
}));

routes.delete('/:operation_data_seq(\\d+)/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { operation_data_seq, comment_seq } = await getOperationDataInfo(req, true)
  const result = await MentoringCommentService.deleteComment(DBMySQL, operation_data_seq, comment_seq, req.body)

  const output = new StdObject();
  output.add('result', result)

  res.json(output);
}));

routes.post('/:operation_data_seq(\\d+)/clip', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const { operation_info } = await getOperationDataInfo(req, true, true, true)

  const create_result = await OperationClipService.createClip(operation_info, req.body);
  const output = new StdObject();
  output.add('result', create_result);
  res.json(output);
}));

routes.put('/:operation_data_seq(\\d+)/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const { clip_id } = await getOperationDataInfo(req, true, true)

  const update_result = await OperationClipService.updateClip(clip_id, req.body);
  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

routes.delete('/:operation_data_seq(\\d+)/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const { clip_id, operation_info } = await getOperationDataInfo(req, true, true, true)

  const delete_result = await OperationClipService.deleteById(clip_id, operation_info, req.body);
  const output = new StdObject();
  output.add('result', delete_result);
  res.json(output);
}));

routes.delete('/:operation_data_seq(\\d+)/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const { phase_id, operation_seq } = await getOperationDataInfo(req, true, true)
  const result = await OperationClipService.unsetPhaseOne(operation_seq, phase_id, req.body)
  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.post('/:operation_data_seq(\\d+)/phase', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const { operation_info } = await getOperationDataInfo(req, true, true, true)

  const create_result = await OperationClipService.createPhase(operation_info, req.body);
  const output = new StdObject();
  output.add('phase', create_result.phase_info);
  output.add('phase_id', create_result.phase_id);
  res.json(output);
}));

routes.put('/:operation_data_seq(\\d+)/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const { phase_id } = await getOperationDataInfo(req, true, true)

  const phase_desc = req.body.phase_desc;
  const update_result = await OperationClipService.updatePhase(phase_id, phase_desc);
  const output = new StdObject();
  output.add('result', update_result);
  res.json(output);
}));

routes.put('/:operation_data_seq(\\d+)/phase/:phase_id/clips', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const { phase_id } = await getOperationDataInfo(req, true, true)

  const result = await OperationClipService.setPhase(phase_id, req.body)
  const output = new StdObject();
  output.add('result', result);
  res.json(output);
}));

routes.delete('/:operation_data_seq(\\d+)/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json');
  const { phase_id, operation_seq } = await getOperationDataInfo(req, true, true)

  const delete_result = await OperationClipService.deletePhase(operation_seq, phase_id)
  const output = new StdObject();
  output.add('result', delete_result);
  res.json(output);
}));

export default routes;
