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
import GroupService from "../../../service/group/GroupService";
import GroupBoardListService from "../../../service/board/GroupBoardListService";
import logger from "../../../libs/logger";

const routes = Router()

routes.get('/getboarddatadetail/:group_seq(\\d+)/:board_data_seq(\\d+)', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const output = new StdObject()
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const board_data_seq = req.params.board_data_seq
  const board_detail = await GroupBoardDataService.getBoardDataDetail(DBMySQL, board_data_seq)

  output.add('board_detail', board_detail)
  output.add('board_comment_list', await GroupBoardDataService.getBoardCommentList(DBMySQL, board_data_seq, member_seq))
  output.add('board_recommend', await GroupReCommendService.getBoardRecommend(DBMySQL, board_data_seq, member_seq))
  res.json(output);
}))

routes.get('/getopenboarddatadetail/:group_seq(\\d+)/:board_data_seq(\\d+)', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const output = new StdObject()
  const { member_seq, is_active_group_member } = await GroupService.checkGroupAuth(DBMySQL, req, false, true)
  const group_seq = req.params.group_seq
  const board_data_seq = req.params.board_data_seq
  const board_detail = await GroupBoardDataService.getBoardDataDetail(DBMySQL, board_data_seq)
  const group_info = await GroupService.getGroupInfo(DBMySQL, group_seq)

  output.add('is_active_group_member', is_active_group_member)
  output.add('group_info', group_info)
  output.add('board_detail', board_detail)
  output.add('board_info', await GroupBoardListService.getGroupBoardListOne(DBMySQL, group_seq, board_detail.board_seq))
  output.add('board_comment_list', await GroupBoardDataService.getBoardCommentList(DBMySQL, board_data_seq, member_seq))
  output.add('board_recommend', await GroupReCommendService.getBoardRecommend(DBMySQL, board_data_seq, member_seq))
  res.json(output);
}))

routes.get('/getopenboarddatadetail/:group_seq(\\d+)/:link_code', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const output = new StdObject()
  const { group_seq, member_seq, is_active_group_member } = await GroupService.checkGroupAuth(DBMySQL, req, false, true)
  const link_code = req.params.link_code
  const board_detail = await GroupBoardDataService.getOpenBoardDataDetail(DBMySQL, link_code)
  const group_info = await GroupService.getGroupInfo(DBMySQL, group_seq)

  output.add('is_active_group_member', is_active_group_member)
  output.add('group_info', group_info)
  output.add('board_detail', board_detail)
  output.add('board_info', await GroupBoardListService.getGroupBoardListOne(DBMySQL, group_seq, board_detail.board_seq))
  output.add('board_comment_list', await GroupBoardDataService.getBoardCommentList(DBMySQL, board_detail.seq, member_seq))
  output.add('board_recommend', await GroupReCommendService.getBoardRecommend(DBMySQL, board_detail.seq, member_seq))
  res.json(output);
}))

routes.get('/getpreviousnextview', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  const { is_group_admin, is_group_manager } = await GroupService.checkGroupAuth(DBMySQL, req, true, true)
  const result = await GroupBoardDataService.getBoardDataPagingList(DBMySQL, req)
  output.adds(result)
  let board_data = null;
  if (req.query.type === 'previous') {
    board_data = _.findLast(result.data);
  } else {
    board_data = result.data[0];
  }
  output.add('is_manage', is_group_admin || is_group_manager)
  output.add('board_detail', await GroupBoardDataService.getBoardDataDetail(DBMySQL, board_data.seq))
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
      await GroupBoardDataService.decrementBoardReCommendCnt(transaction, board_data_seq)
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
      await GroupBoardDataService.incrementBoardReCommendCnt(transaction, board_data_seq)
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
      await GroupBoardDataService.decrementBoardCommentReCommendCnt(transaction, comment_seq)
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
      await GroupBoardDataService.incrementBoardCommentReCommendCnt(transaction, comment_seq)
      output.add('result', { message: '추천 되었습니다.', result: true })
    }
  })
  res.json(output);
}))

routes.post('/:group_seq(\\d+)/:board_seq(\\d+)/file', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_seq = req.params.group_seq
  const board_seq = req.params.board_seq
  const board_file_list = await GroupBoardDataService.uploadFile(group_seq, board_seq, req, res)
  const output = new StdObject()
  output.add('board_file_list', board_file_list)
  res.json(output)
}))

routes.delete('/:board_seq(\\d+)/file', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const board_seq = req.params.board_seq
  const file = req.body.file
  const result = await GroupBoardDataService.deleteFile(DBMySQL, board_seq, file)
  const output = new StdObject()
  output.add('board_file_lists', result)
  res.json(output)
}))

routes.get('/getboarddatalistWithMember', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  const result = await GroupBoardDataService.getBoardDataPagingListWithMemberAllList(DBMySQL, req)
  output.adds(result)
  res.json(output);
}))

export default routes
