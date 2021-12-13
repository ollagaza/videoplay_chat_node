import { Router } from 'express'
import Auth from '../../../../middlewares/auth.middleware'
import Role from '../../../../constants/roles'
import Wrap from '../../../../utils/express-async'
import StdObject from '../../../../wrapper/std-object'
import log from '../../../../libs/logger';
import Util from "../../../../utils/Util";
import DBMySQL from "../../../../database/knex-mysql";
import GroupService from "../../../../service/group/GroupService";
import QuestionService from "../../../../service/curriculum/QuestionService";
import CurriculumEducationServiceClass from "../../../../service/curriculum/CurriculumEducationService";
import CurriculumEducationCommentService from "../../../../service/curriculum/CurriculumEducationCommentService";
import MemberService from "../../../../service/member/MemberService";
import CurriculumService from "../../../../service/curriculum/CurriculumService";
import OperationService from "../../../../service/operation/OperationService";
import OperationClipService from "../../../../service/operation/OperationClipService";
import CurriculumLogService from "../../../../service/curriculum/CurriculumLogService";
const routes = Router()


routes.post('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const result = await CurriculumEducationServiceClass.addCurriculumEducation(DBMySQL, req.body);

  output.add('result', result)
  res.json(output)
}))

routes.put('/:education_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const education_seq = req.params.education_seq;
  const result = await CurriculumEducationServiceClass.setCurriculumEducation(DBMySQL, education_seq, req.body);

  output.add('result', result)
  res.json(output)
}))

routes.delete('/:comment_seq(\\d+)/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const comment_seq = req.params.comment_seq;
  const result = await CurriculumEducationCommentService.deleteCurriculumEducationComment(DBMySQL, comment_seq, req.body);

  output.add('result', result)
  res.json(output)
}))

routes.delete('/:curriculum_seq(\\d+)/:education_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const curriculum_seq = req.params.curriculum_seq
  const education_seq = req.params.education_seq

  const result = await CurriculumEducationServiceClass.deleteCurriculumEducation(DBMySQL, curriculum_seq, education_seq);
  output.add('result', result);
  res.json(output)
}))

routes.get('/:education_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const education_seq = req.params.education_seq;
  const education_info = await CurriculumEducationServiceClass.getCurriculumEducation(DBMySQL, education_seq);
  const operation_info = await OperationService.getOperationInfo(DBMySQL, education_info.operation_seq, null, false, true)
  const clip_list = await OperationClipService.findByOperationSeq(education_info.operation_seq)

  output.add('education_info', education_info);
  output.add('operation_info', operation_info);
  output.add('clip_list', clip_list)
  res.json(output);
}))

routes.get('/:curriculum_seq(\\d+)/list', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const curriculum_seq = req.params.curriculum_seq;
  const result = await CurriculumEducationServiceClass.getCurriculumEducationList(DBMySQL, curriculum_seq);

  output.add('list', result);
  res.json(output);
}))

routes.get('/media/:curriculum_seq(\\d+)/:education_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const curriculum_seq = req.params.curriculum_seq;
  const education_seq = req.params.education_seq;

  output.add('curriculum', await CurriculumService.getCurriculum(DBMySQL, curriculum_seq))
  output.add('data', await CurriculumEducationServiceClass.getCurriculumEducationDetail(DBMySQL, curriculum_seq, education_seq));
  output.add('recommend', await CurriculumService.getRecommendCurriculumList(DBMySQL, curriculum_seq));
  res.json(output);
}))

routes.put('/:curriculum_seq(\\d+)/:current_seq(\\d+)/:target_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const curriculum_seq = req.params.curriculum_seq;
  const current_seq = req.params.current_seq;
  const target_seq = req.params.target_seq;
  const result = await CurriculumEducationServiceClass.swapCurriculumEducationSort(DBMySQL, curriculum_seq, current_seq, target_seq);

  output.add('result', result);
  res.json(output);
}))


routes.post('/:education_seq(\\d+)/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const { member_seq } = await GroupService.getBaseInfo(req, true, false, true);
  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)

  const education_seq = req.params.education_seq;
  const result = await CurriculumEducationCommentService.createCurriculumEducationComment(DBMySQL, education_seq, member_info, req.body);

  output.add('result', result)
  res.json(output)
}))

routes.get('/:education_seq(\\d+)/comment/list', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const education_seq = req.params.education_seq;

  const result = await CurriculumEducationCommentService.getCurriculumEducationCommentList(DBMySQL, education_seq, req.query);
  const total_count = await CurriculumEducationCommentService.getCurriculumEducationCommentTotalCount(DBMySQL, education_seq);

  output.add('list', result);
  output.add('total', total_count);
  res.json(output);
}))

routes.put('/:comment_seq(\\d+)/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const comment_seq = req.params.comment_seq;
  const result = await CurriculumEducationCommentService.updateCurriculumEducationComment(DBMySQL, comment_seq, req.body);

  output.add('result', result)
  res.json(output)
}))

routes.get('/:education_seq(\\d+)/:comment_seq(\\d+)/comment/list', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const comment_seq = req.params.comment_seq;
  const education_seq = req.params.education_seq;
  const result = await CurriculumEducationCommentService.getCurriculumEducationCommentList(DBMySQL, education_seq, req.query, comment_seq);
  const total_count = await CurriculumEducationCommentService.getCurriculumEducationCommentTotalCount(DBMySQL, education_seq, comment_seq);

  output.add('list', result);
  output.add('total', total_count);
  res.json(output);
}))

routes.get('/:education_seq(\\d+)/:comment_seq(\\d+)/comment/one', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const comment_seq = req.params.comment_seq;
  const education_seq = req.params.education_seq;
  const result = await CurriculumEducationCommentService.getCurriculumEducationComment(DBMySQL, comment_seq);
  if (result.parent_seq) {
    const total_count = await CurriculumEducationCommentService.getCurriculumEducationCommentTotalCount(DBMySQL, education_seq, result.parent_seq);
    output.add('total', total_count);
  }
  output.add('comment_info', result);
  res.json(output);
}))

routes.get('/:education_seq(\\d+)/:comment_seq(\\d+)/comment/reply/count', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const comment_seq = req.params.comment_seq;
  const education_seq = req.params.education_seq;

  const total_count = await CurriculumEducationCommentService.getCurriculumEducationCommentTotalCount(DBMySQL, education_seq, comment_seq);
  output.add('total', total_count);

  res.json(output);
}))

routes.post('/:curriculum_seq(\\d+)/:member_seq(\\d+)/save/log', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const curriculum_seq = req.params.curriculum_seq;
  const member_seq = req.params.member_seq;

  const result = await CurriculumLogService.setCurriculumLog(DBMySQL, curriculum_seq, member_seq, 1, req.body);

  output.add('result', [curriculum_seq, member_seq, result])
  res.json(output)
}))

routes.get('/:curriculum_seq(\\d+)/:member_seq(\\d+)/load/log', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const curriculum_seq = req.params.curriculum_seq;
  const member_seq = req.params.member_seq;

  output.add('log', await CurriculumLogService.getCurriculumLog(DBMySQL, curriculum_seq, member_seq, 1));
  res.json(output)
}))

export default routes
