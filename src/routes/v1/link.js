import { Router } from 'express';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import OperationShareModel from '@/models/OperationShareModel';

const routes = Router();

routes.get('/verify/:link_key', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const link_key = req.params.link_key;

  if (Util.isEmpty(link_key)) {
    throw new StdObject(-1, '잘못된 접근입니다.', 400);
  }
  let link_key_info = Util.decrypt(link_key);
  if (Util.isEmpty(link_key_info)) {
    throw new StdObject(-2, '잘못된 접근입니다.', 400);
  }

  link_key_info = JSON.parse(link_key_info);
  const link_type = link_key_info.t;
  console.log(link_key_info);

  const output = new StdObject();

  if (link_type === 'operation') {
    const share_info = await new OperationShareModel({ database }).getShareInfoByDecryptedInfo(link_key_info);
    if (!share_info || share_info.isEmpty()) {
      throw new StdObject(-4, '잘못된 접근입니다.', 400);
    }

    output.add('login_require', true);
  }
  else {
    throw new StdObject(-3, '잘못된 접근입니다.', 400);
  }

  output.add('action', link_type);
  output.add('key', link_key);

  res.json(output);
}));

export default routes;
