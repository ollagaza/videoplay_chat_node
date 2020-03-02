import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import MemberLogModel from '../../database/mysql/member/MemberLogModel';
import SocketManager from '../../service/socket-manager'

const routes = Router();

routes.post('/notice', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_seq = req.body.seq;
  const output = new StdObject();

  await DBMySQL.transaction(async(transaction) => {
    const oMemberLogModel = new MemberLogModel(transaction);
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
  await SocketManager.sendToFrontOne('londhunter', { 'test': 'aaa' })

  const user_seq = req.body.seq;
  const output = new StdObject();

  res.json(output);
}));

routes.get('/test_glo_send', Wrap(async(req, res) => {
  req.accepts('application/json');
  const data = { 'type':'globalNotice', 'data':'test' };
  await SocketManager.sendToFrontAll(data)

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
