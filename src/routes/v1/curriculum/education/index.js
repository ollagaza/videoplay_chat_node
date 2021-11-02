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
  log.debug(req.body);

  output.add('result', result);
  res.json(output);
}))

export default routes
