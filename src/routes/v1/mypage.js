import {Router} from 'express';
import Auth from '@/middlewares/auth.middleware';
import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import Util from '@/utils/baseutil';
import ServiceConfig from '@/config/service.config';
import Constants from '@/config/constants';
import log from "@/classes/Logger";
import MemberLogModel from "@/models/MemberLogModel";
import io from '@/middlewares/socket_io';

const routes = Router();

routes.post('/notice', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_seq = req.body.seq;
  const output = new StdObject();

  await database.transaction(async(trx) => {
    const oMemberLogModel = new MemberLogModel({database: trx});
    const lang = Auth.getLanguage(req);
    const result = await oMemberLogModel.getMemberLog(lang, user_seq);
    output.add("notices", result);
  });

  res.json(output);
}));

routes.post('/msg_list', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_seq = req.body.seq;
  const output = new StdObject();

  res.json(output);
}));

routes.get('/test_msg_send', Wrap(async(req, res) => {
  req.accepts('application/json');
  const socket = io.getSocket();
  socket.emit('sendFrontMsg', 'londhunter');

  const user_seq = req.body.seq;
  const output = new StdObject();

  res.json(output);
}));

routes.get('/test_glo_send', Wrap(async(req, res) => {
  req.accepts('application/json');
  const socket = io.getSocket();
  const data = { 'type':'globalNotice', 'data':'test' };
  socket.emit('sendFrontGloMsg', data);

  const user_seq = req.body.seq;
  const output = new StdObject();

  res.json(output);
}));

routes.post('/msg_send', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_seq = req.body.seq;
  const output = new StdObject();

  res.json(output);
}));

routes.post('/msg_receive', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_seq = req.body.seq;
  const output = new StdObject();

  res.json(output);
}));

export default routes;
