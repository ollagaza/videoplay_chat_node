import { Router } from 'express'
import _ from "lodash";
import Auth from '../../../middlewares/auth.middleware'
import Util from '../../../utils/baseutil'
import log from '../../../libs/logger'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DBMySQL from '../../../database/knex-mysql'
import GroupBoardDataService from '../../../service/board/GroupBoardDataService'
import GroupReCommendService from "../../../service/board/GroupReCommendService"
import GroupService from "../../../service/member/GroupService";

const routes = Router()

routes.get('/getboarddatadetail/:board_data_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  const { member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const board_data_seq = req.params.board_data_seq
  output.add('board_detail', await GroupBoardDataService.getBoardDataDetail(DBMySQL, board_data_seq))
  output.add('board_comment_list', await GroupBoardDataService.getBoardCommentList(DBMySQL, board_data_seq, member_seq))
  output.add('board_recommend', await GroupReCommendService.getBoardRecommend(DBMySQL, board_data_seq, member_seq))
  res.json(output);
}))

routes.get('/getboarddatalist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  const result = await GroupBoardDataService.getBoardDataPagingList(DBMySQL, req)
  output.adds(result)
  res.json(output);
}))

routes.get('/gettemporarilylist/:group_seq(\\d+)/:member_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  const group_seq = req.params.group_seq
  const member_seq = req.params.member_seq

  const result = await GroupBoardDataService.getTemporarilyList(DBMySQL, group_seq, member_seq)
  output.adds(result)
  res.json(output);
}))

routes.post('/save_board_comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const comment_data = req.body.comment_data

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.CreateUpdateBoardComment(transaction, comment_data)
    output.add('result', result)
  })
  res.json(output);
}))

routes.post('/save_board_data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const board_data = req.body.board_data

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.CreateUpdateBoardData(transaction, board_data)
    output.add('result', result)
  })
  res.json(output);
}))

routes.put('/updateviewcnt/:board_data_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const board_data_seq = req.params.board_data_seq

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.updateBoardViewCnt(transaction, board_data_seq)
    output.add('result', result)
  })
  res.json(output);
}))

routes.put('/move_boarddata/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const move_data = req.body

  for (let cnt = 0; cnt < move_data.board_data_seqs.length; cnt++) {
    await GroupBoardDataService.MoveBoardData(DBMySQL, move_data.board_data_seqs[cnt], move_data.board_seq, move_data.board_header_text)
  }
  res.json(output);
}))

routes.put('/changeNotice/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const board_data_seq = req.body.board_data_seq
  const notice_num = req.body.notice_num

  for (let cnt = 0; cnt < board_data_seq.length; cnt++) {
    await GroupBoardDataService.ChangeBoardToNotice(DBMySQL, board_data_seq[cnt], notice_num)
  }
  res.json(output);
}))

routes.delete('/delete_comment/:board_data_seq(\\d+)/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const comment_seq = req.params.comment_seq
  const board_data_seq = req.params.board_data_seq

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.DeleteComment(transaction, board_data_seq, comment_seq)
    output.add('result', result)
  })
  res.json(output);
}))

routes.delete('/delete_board_data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const board_data_seq = req.body

  for (let cnt = 0; cnt < board_data_seq.length; cnt++) {
    await DBMySQL.transaction(async (transaction) => {
      await GroupBoardDataService.DeleteBoardData(transaction, board_data_seq[cnt])
    })
  }
  res.json(output);
}))

routes.put('/update_recommend/:board_data_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const board_data_seq = req.params.board_data_seq
  const board_data = await GroupBoardDataService.getBoardDataDetail(DBMySQL, board_data_seq)

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupReCommendService.getBoardRecommend(transaction, board_data_seq, member_seq)
    if (result) {
      await GroupReCommendService.deleteBoardRecommend(transaction, result.seq)
      await GroupBoardDataService.updateBoardReCommendCnt(transaction, board_data_seq)
      output.add('result', { message: '추천 해제 되었습니다.', result: false })
    } else {
      const recommend_data = {
        group_seq: group_seq,
        member_seq: member_seq,
        board_seq: board_data.board_seq,
        board_data_seq: board_data_seq,
        recommend: 'T',
      }
      await GroupReCommendService.createBoardRecommend(transaction, recommend_data)
      await GroupBoardDataService.updateBoardReCommendCnt(transaction, board_data_seq, '+')
      output.add('result', { message: '추천 되었습니다.', result: true })
    }
  })
  res.json(output);
}))

routes.put('/update_comment_recommend/:board_data_seq(\\d+)/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const board_data_seq = req.params.board_data_seq
  const comment_seq = req.params.comment_seq
  const board_data = await GroupBoardDataService.getBoardDataDetail(DBMySQL, board_data_seq)

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupReCommendService.getBoardCommentRecommendOne(transaction, comment_seq, board_data_seq, member_seq)
    if (result) {
      await GroupReCommendService.deleteBoardCommentRecommend(transaction, result.seq)
      await GroupBoardDataService.updateBoardCommentReCommendCnt(transaction, comment_seq)
      output.add('result', { message: '추천 해제 되었습니다.', result: false })
    } else {
      const recommend_data = {
        group_seq: group_seq,
        member_seq: member_seq,
        board_seq: board_data.board_seq,
        board_data_seq: board_data_seq,
        board_comment_seq: comment_seq,
        recommend: 'T',
      }
      await GroupReCommendService.createBoardCommentReCommend(transaction, recommend_data)
      await GroupBoardDataService.updateBoardCommentReCommendCnt(transaction, comment_seq, '+')
      output.add('result', { message: '추천 되었습니다.', result: true })
    }
  })
  res.json(output);
}))

export default routes
