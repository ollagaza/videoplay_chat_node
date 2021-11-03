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
const routes = Router()


routes.post('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const result = await CurriculumEducationServiceClass.addCurriculumEducation(DBMySQL, req.body);

  output.add('result', result);
  res.json(output);
}))

routes.delete('/:curriculum_seq/:education_seq', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const curriculum_seq = req.params.curriculum_seq;
  const education_seq = req.params.education_seq;

  const result = await CurriculumEducationServiceClass.deleteCurriculumEducation(DBMySQL, curriculum_seq, education_seq);
  output.add('result', result);
  res.json(output);
}))

routes.get('/:curriculum_seq', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const curriculum_seq = req.params.curriculum_seq;
  const result = await CurriculumEducationServiceClass.getCurriculumEducation(DBMySQL, curriculum_seq);

  output.add('list', result);
  res.json(output);
}))


export default routes
