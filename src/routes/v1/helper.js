import { Router } from 'express';
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import helper_service from "../../service/helper/HelperService";

const routes = Router();

routes.post('/gethelperinfo', Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const code = req.body.code;
  const scriptFilter = {
    is_new: true,
    query: [
      { code: ['in', 'css', 'script'] },
    ],
  };
  output.add('script', await helper_service.getHelperInfo2(DBMySQL, scriptFilter));
  output.add('helperinfo', await helper_service.getHelperInfo(DBMySQL, code));
  res.json(output);
}));

export default routes;
