import { Router } from 'express'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import MessageService from '../../service/mypage/MessageService'
import InstantMessageService from "../../service/mypage/InstantMessageService";
import GroupService from "../../service/group/GroupService";

const routes = Router()

routes.post('/getreceivelist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
    const searchParam = req.body.searchObj
    const searchOrder = req.body.searchOrder
    const page_navigation = req.body.page_navigation

    const output = await MessageService.getReceiveLists(DBMySQL, member_seq, searchParam, page_navigation)
    output.add('receiveCount', await MessageService.getReceiveCount(DBMySQL, member_seq))
    output.add('searchObj', searchParam)

    res.json(output)
  } catch (e) {
    throw e
  }
}))

routes.post('/getsendlist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
    const searchParam = req.body.searchObj
    const searchOrder = req.body.searchOrder
    const page_navigation = req.body.page_navigation

    const output = await MessageService.getSendLists(DBMySQL, member_seq, searchParam, page_navigation)
    output.add('receiveCount', await MessageService.getReceiveCount(DBMySQL, member_seq))
    output.add('searchObj', searchParam)

    res.json(output)
  } catch (e) {
    throw e
  }
}))

routes.post('/setview', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const token_info = req.token_info
    const member_seq = token_info.getId()
    const output = new StdObject()
    const seq = req.body.seq
    const group_message_seq = req.body.group_message_seq

    await DBMySQL.transaction(async (transaction) => {
      const result = await MessageService.setViewMessage(transaction, seq)
      if (group_message_seq) {
        await MessageService.updateGroupViewCount(transaction, group_message_seq, member_seq);
      }
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

    for (let cnt = 0; cnt < message_info.receive_seq.length; cnt++) {
      const param = {
        send_seq: message_info.send_seq,
        receive_seq: message_info.receive_seq[cnt],
        desc: message_info.desc,
      }
      await DBMySQL.transaction(async (transaction) => {
        const result = await MessageService.sendMessage(transaction, group_seq, param)
        output.add('result', result)
      })
    }

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.delete('/delMessage', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
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

    output.adds(await MessageService.getGroupMessageList(DBMySQL, group_seq, req))

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
    const { member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, false, false)
    const output = new StdObject()
    const message_info = req.body.message_info

    await DBMySQL.transaction(async (transaction) => {
      const result = await MessageService.sendGroupMessage(transaction, member_seq, message_info)
      output.add('result', result)
    })

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.delete('/delgroupmessage', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const message_seq = req.body
    const output = new StdObject()

    for (let cnt = 0; cnt < Object.keys(message_seq).length; cnt++) {
      const result = await MessageService.deleteGroupMessage(DBMySQL, message_seq[cnt])
      output.add('result', result)
    }

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/instant/:member_seq(\\d+)/:group_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const member_seq = req.params.member_seq
    const group_seq = req.params.group_seq
    const output = new StdObject()

    output.add('list', await InstantMessageService.getInstantMessageList(DBMySQL, member_seq, group_seq))

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.delete('/instant', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const message_list = req.body
    const output = new StdObject()

    output.add('res', await InstantMessageService.deleteInstantMessageList(DBMySQL, message_list));

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

export default routes
