import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import DBMySQL from '../../../database/knex-mysql'
import StdObject from '../../../wrapper/std-object'
import GroupService from '../../../service/group/GroupService'
import GroupAlarmService from '../../../service/group/GroupAlarmService'

const routes = Router()

routes.get('/new/count', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const alarm_count = await GroupAlarmService.getNewGroupAlarmCount(group_auth.group_seq, group_auth.member_seq, group_auth.group_grade_number, req.query)
  const output = new StdObject()
  output.add('alarm_count', alarm_count)
  res.json(output)
}))

routes.get('/new', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const alarm_list = await GroupAlarmService.getNewGroupAlarmList(group_auth.group_seq, group_auth.member_seq, group_auth.group_grade_number, req.query)
  const output = new StdObject()
  output.add('alarm_list', alarm_list)
  res.json(output)
}))

routes.get('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const alarm_list = await GroupAlarmService.getGroupAlarmList(group_auth.group_seq, group_auth.member_seq, group_auth.group_grade_number, req.query)
  const output = new StdObject()
  output.adds(alarm_list)
  res.json(output)
}))

routes.put('/read', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  await GroupAlarmService.onReadAlarm(group_auth.group_seq, group_auth.member_seq, group_auth.group_grade_number, req.body)
  res.json(new StdObject())
}))

routes.delete('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  GroupAlarmService.onDeleteAlarm(group_auth.group_seq, group_auth.member_seq, group_auth.group_grade_number, req.body)
  res.json(new StdObject())
}))

export default routes
