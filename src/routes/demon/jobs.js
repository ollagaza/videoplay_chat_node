import {Router} from 'express';
import service_config from '@/config/service.config';
import roles from "@/config/roles";
import Auth from '@/middlewares/auth.middleware';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import log from "@/classes/Logger";
import MemberModel from '@/models/MemberModel';
import SyncOperationQueueModel from '@/models/demon/SyncOperationQueueModel';
import Constants from '@/config/constants';
import OperationScheduler from '@/scheduler/OperationScheduler';

const routes = Router();

routes.post('/', Auth.isAuthenticated(roles.API), Wrap(async(req, res) => {
  req.accepts('application/json');

  const token_info = req.token_info;
  const member_seq = token_info.getId();

  const output = new StdObject();
  let success = false;
  let message = '';
  await database.transaction(async(trx) => {
    const sync_model = new SyncOperationQueueModel( { database: trx } );
    if (await sync_model.verifyKey(member_seq, req.body.key)) {
      await sync_model.push(member_seq, req.body.key, req.body.data);
      success = true;
    } else {
      message = `${req.body.key} is already use`;
    }
  });

  output.add('success', success);
  output.add('message', message);
  res.json(output);
}));

export default routes;
