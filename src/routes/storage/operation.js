import { Router } from 'express';
import Wrap from '../../utils/express-async';
import SyncService from '../../service/sync/SyncService'

const routes = Router();

routes.post('/analysis/complete', Wrap(async(req, res) => {
  req.accepts('application/json');
  const response_data = req.body
  await SyncService.onOperationVideoFileCopyCompete()
}));

export default routes;
