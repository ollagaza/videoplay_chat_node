import { Router } from 'express';
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import Auth from "../../middlewares/auth.middleware";
import Role from "../../constants/roles";
import MentoringService from "../../service/mentoring/MentoringService";

const routes = Router();

routes.post('/getmentolist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const category_code = req.body.category_code;
  const scriptFilter = {
    is_new: true,
    query: [
      { category_code },
    ],
  };
  output.add('mentolist', await helper_service.getHelperInfo2(DBMySQL, scriptFilter));
  res.json(output);
}));

export default routes;
