import { Router } from 'express';
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import Auth from "../../middlewares/auth.middleware";
import Role from "../../constants/roles";
import _ from 'lodash';
import MentoringService from "../../service/mentoring/MentoringService";
import Util from "../../utils/baseutil";
import ServiceConfig from "../../service/service-config";

const routes = Router();

routes.post('/getmentolist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const category_code = req.body.category_code;
  const result = await MentoringService.getMentoringLists(DBMySQL, category_code)
  _.forEach(result, (value) => {
    if (value.profile_image_path !== null) {
      value.profile_image_path = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), value.profile_image_path)
    }
  })
  output.add('mentolist', result);
  res.json(output);
}));

export default routes;
