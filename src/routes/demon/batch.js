import {Router} from 'express';
import roles from "@/config/roles";
import Auth from '@/middlewares/auth.middleware';
import Wrap from '@/utils/express-async';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import BatchOperationQueueModel from '@/models/batch/BatchOperationQueueModel';
import OperationScheduler from '@/scheduler/OperationScheduler';
import log from "@/classes/Logger";

const routes = Router();

routes.post('/operation', Auth.isAuthenticated(roles.API), Wrap(async(req, res) => {
  req.accepts('application/json');

  const token_info = req.token_info;
  const member_seq = token_info.getId();

  const output = new StdObject();
  let success = false;
  let message = '';
  await database.transaction(async(trx) => {
    const sync_model = new BatchOperationQueueModel( { database: trx } );
    if (await sync_model.verifyKey(member_seq, req.body.key)) {
      await sync_model.push(member_seq, req.body.key, req.body.data);
      success = true;
    } else {
      output.setError(-1);
      message = `${req.body.key} is already use`;
    }
  });

  output.add('success', success);
  output.add('message', message);
  res.json(output);

  if (success) {
    try {
      OperationScheduler.onNewJob();
    } catch (e) {
      log.e(req, e);
    }
  }
}));

export default routes;
