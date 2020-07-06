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
  const token_info = req.token_info;
  const group_seq = token_info.getGroupSeq()
  const output = new StdObject();
  const category_code = req.body.category_code;
  const sSearch = req.body.sSearch;

  try {
    if (sSearch === null) {
      const bestMentoResult = await MentoringService.getBestMentoringLists(DBMySQL, category_code, group_seq)
      _.forEach(bestMentoResult, (value) => {
        if (value.profile_image_path !== null) {
          value.profile_image_path = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), value.profile_image_path)
        }
      })
      output.add('bestmentolist', bestMentoResult);

      const recommendMentoResult = await MentoringService.getRecommendMentoringLists(DBMySQL, category_code)
      _.forEach(recommendMentoResult, (value) => {
        if (value.profile_image_path !== null) {
          value.profile_image_path = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), value.profile_image_path)
        }
      })
      output.add('recommendmento', recommendMentoResult);
    } else {
      const searchMentoResult = await MentoringService.getSearchMentoringLists(DBMySQL, sSearch)
      _.forEach(searchMentoResult, (value) => {
        if (value.profile_image_path !== null) {
          value.profile_image_path = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), value.profile_image_path)
        }
      })
      output.add('searchmento', searchMentoResult);
    }
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

export default routes;
