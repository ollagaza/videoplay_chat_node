import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import Util from "../../../utils/Util";
import DBMySQL from '../../../database/knex-mysql'
import GroupService from "../../../service/group/GroupService";
import QuestionService from "../../../service/curriculum/QuestionService";
import CurriculumService from "../../../service/curriculum/CurriculumService";

const routes = Router()

routes.post('/:api_mode/:api_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const api_mode = req.params.api_mode;

  if (api_mode === 'intro') {
    output.add('result', await CurriculumService.createCurriculumIntro(DBMySQL, group_auth, req))
  } else if (api_mode === 'video') {
    output.add('result', await QuestionService.updateQuestion(DBMySQL, group_auth, req))
  } else if (api_mode === 'last') {
    output.add('result', await QuestionService.updateQuestion(DBMySQL, group_auth, req))
  }
  res.json(output)
}))

routes.put('/thumbnail/:api_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const api_key = req.params.api_key;

  if (api_key) {
    output.add('thumbnail_url', await CurriculumService.uploadThumbnail(api_key, group_auth, req, res))
    res.json(output)
  } else {
    res.json(new StdObject(-1, '잘못된 접근입니다.', 300))
  }
}))

routes.get('/:group_seq', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_seq = req.params.group_seq
  output.adds(await CurriculumService.getCurriculumList(DBMySQL, group_seq, req))
  res.json(output)
}))

routes.get('/:api_type/:api_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const api_type = req.params.api_type
  const api_key = req.params.api_key
  output.add('curriculum', await CurriculumService.getCurriculum(DBMySQL, api_type, api_key))
  output.add('curriculum_education', await CurriculumService.getCurriculumEducation(DBMySQL, api_type, api_key))
  output.add('curriculum_survey', await CurriculumService.getCurriculumSurvey(DBMySQL, api_type, api_key))
  res.json(output)
}))

export default routes
