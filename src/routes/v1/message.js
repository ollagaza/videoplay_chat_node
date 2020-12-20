import { Router } from 'express'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import MessageService from '../../service/mypage/MessageService'
import GroupService from "../../service/member/GroupService";

const routes = Router()

routes.post('/getreceivelist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const token_info = req.token_info
    const group_seq = token_info.getGroupSeq()
    const searchParam = req.body.searchObj
    const searchOrder = req.body.searchOrder
    const page_navigation = req.body.page_navigation

    const output = await MessageService.getReceiveLists(DBMySQL, group_seq, searchParam, page_navigation)
    output.add('receiveCount', await MessageService.getReceiveCount(DBMySQL, group_seq))
    output.add('searchObj', searchParam)

    res.json(output)
  } catch (e) {
    throw e
  }
}))

routes.post('/getsendlist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const token_info = req.token_info
    const group_seq = token_info.getGroupSeq()
    const searchParam = req.body.searchObj
    const searchOrder = req.body.searchOrder
    const page_navigation = req.body.page_navigation

    const output = await MessageService.getSendLists(DBMySQL, group_seq, searchParam, page_navigation)
    output.add('receiveCount', await MessageService.getReceiveCount(DBMySQL, group_seq))
    output.add('searchObj', searchParam)

    res.json(output)
  } catch (e) {
    throw e
  }
}))

routes.post('/setview', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const seq = req.body.seq

    await DBMySQL.transaction(async (transaction) => {
      const result = await MessageService.setViewMessage(transaction, seq)
      output.add('result', result)
    })

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/sendMessage', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
    const output = new StdObject()
    const message_info = req.body.message_info

    await DBMySQL.transaction(async (transaction) => {
      const result = await MessageService.sendMessage(transaction, group_seq, message_info)
      output.add('result', result)
    })

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/delMessage', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const seq = req.body.seq
    const flag = req.body.flag

    await DBMySQL.transaction(async (transaction) => {
      const result = await MessageService.deleteMessage(transaction, seq, flag)
      output.add('result', result)
    })

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/getgroupmessagelist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
    const output = new StdObject()

    output.add('result', await MessageService.getGroupMessageList(DBMySQL, group_seq, req))

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/getgroupmessage/:message_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
    const message_seq = req.params.message_seq
    const output = new StdObject()

    output.add('result', await MessageService.getGroupMessage(DBMySQL, group_seq, message_seq))

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/sendgroupmsg', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const message_info = req.body.message_info

    await DBMySQL.transaction(async (transaction) => {
      const result = await MessageService.sendGroupMessage(transaction, message_info)
      output.add('result', result)
    })

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.delete('/delgroupmessage/:message_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const seq = req.params.message_seq

    await DBMySQL.transaction(async (transaction) => {
      const result = await MessageService.deleteGroupMessage(transaction, seq)
      output.add('result', result)
    })

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

export default routes
