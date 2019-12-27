import {Router} from 'express';
import Wrap from '@/utils/express-async';
import log from "@/classes/Logger";
import io from '@/middlewares/socket_io';

const routes = Router();

routes.get('/reloadService', Wrap(async(req, res) => {
  const socket = io.getSocket();
  socket.emit('reloadService');
  log.debug('node api reloadService call');
  res.json('success');
}));

export default routes;