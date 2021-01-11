import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/baseutil'
import ServiceConfig from '../service-config'
import DBMySQL from "../../database/knex-mysql";
import GroupBoardDataModel from '../../database/mysql/board/GroupBoardDataModel'
import GroupBoardCommentModel from '../../database/mysql/board/GroupBoardCommentModel'
import baseutil from "../../utils/baseutil";

const GroupBoardDataServiceClass = class {
  constructor () {
    this.log_prefix = '[GroupBoardDataService]'
  }

  getGroupBoardDataModel = (database) => {
    if (database) {
      return new GroupBoardDataModel(database)
    }
    return new GroupBoardDataModel(DBMySQL)
  }

  getGroupBoardCommentModel = (database) => {
    if (database) {
      return new GroupBoardCommentModel(database)
    }
    return new GroupBoardCommentModel(DBMySQL)
  }

  getBoardDataPagingList = async (database, req) => {
    const request_body = req.query ? req.query : {}
    const group_seq = request_body.group_seq
    const board_seq = request_body.board_seq
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}
    const request_order = request_body.order ? JSON.parse(request_body.order) : null

    const paging = {}
    paging.list_count = request_paging.list_count ? request_paging.list_count : 20
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = 'N'

    const model = this.getGroupBoardDataModel(database)
    const board_list = await model.getBoardDataPagingList(group_seq, board_seq, paging, request_order)
    for(let cnt = 0; cnt < board_list.length; cnt++) {
      board_list[cnt].member_profile_image = ServiceConfig.get('static_storage_prefix') + board_list[cnt].member_profile_image
    }
    return board_list
  }

  getBoardDataDetail = async (database, board_data_seq) => {
    const model = this.getGroupBoardDataModel(database)
    const board_data = await model.getBoardDataDetail(board_data_seq)

    if (board_data.member_profile_image) {
      board_data.member_profile_image = ServiceConfig.get('static_storage_prefix') + board_data.member_profile_image
    }

    return board_data
  }

  getBoardCommentList = async (database, board_data_seq) => {
    const model = this.getGroupBoardCommentModel(database)
    const comment_list = await model.getBoardCommentList(board_data_seq)

    for(let cnt = 0; cnt < comment_list.length; cnt++) {
      if (comment_list[cnt].member_profile_image) {
        comment_list[cnt].member_profile_image = ServiceConfig.get('static_storage_prefix') + comment_list[cnt].member_profile_image
      }
    }
    return comment_list
  }

  getBoardDataCount = async (database, group_seq, menu_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.getGroupBoardDataCount(group_seq, menu_seq)
  }

  CreateUpdateBoardComment = async (database, comment_data) => {
    const model = this.getGroupBoardCommentModel(database)
    const result = await model.CreateUpdateBoardComment(comment_data)
    if (result.affectedRows === 1) {
      const model = this.getGroupBoardDataModel(database)
      await model.updateBoardCommentCnt(comment_data.board_data_seq, '+');
    }
    return result;
  }

  CreateUpdateBoardData = async (database, board_data) => {
    const model = this.getGroupBoardDataModel(database)
    board_data.content_id = baseutil.getContentId();
    return await model.CreateUpdateBoardData(board_data)
  }

  updateBoardViewCnt = async (database, board_data_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.updateBoardViewCnt(board_data_seq);
  }

  DeleteComment = async (database, board_data_seq, comment_seq) => {
    const model = this.getGroupBoardCommentModel(database)
    const result = await model.DeleteComment(comment_seq)

    const board_model = this.getGroupBoardDataModel(database)
    await board_model.updateBoardCommentCnt(board_data_seq);
    return result;
  }

  DeleteBoardData = async (database, board_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.DeleteBoardData(board_seq)
  }

  getGroupBoardOpenTopList = async (database, group_seq) => {
    const model = this.getGroupBoardDataModel(database);
    return await model.getGroupBoardOpenTopList(group_seq);
  }
}

const GroupBoardDataService = new GroupBoardDataServiceClass()

export default GroupBoardDataService
