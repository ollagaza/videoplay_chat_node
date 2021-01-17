import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/baseutil'
import ServiceConfig from '../service-config'
import DBMySQL from "../../database/knex-mysql";
import GroupBoardDataModel from '../../database/mysql/board/GroupBoardDataModel'
import GroupBoardCommentModel from '../../database/mysql/board/GroupBoardCommentModel'
import baseutil from "../../utils/baseutil";
import logger from "../../libs/logger";

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
    paging.list_count = request_paging.list_count ? request_paging.list_count : 10
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = 'N'

    const model = this.getGroupBoardDataModel(database)
    if (paging.cur_page === 1) {
      const board_list = await model.getBoardDataPagingList(group_seq, board_seq, paging, request_order)
      for (let cnt = 0; cnt < board_list.length; cnt++) {
        board_list[cnt].member_profile_image = ServiceConfig.get('static_storage_prefix') + board_list[cnt].member_profile_image
      }
      return board_list
    } else {
      const notice_count = await model.getBoardNoticeCount(group_seq, board_seq)
      paging.start_count = (paging.list_count - notice_count) + 1;
      const board_list = await model.getBoardDataPagingList(group_seq, board_seq, paging, request_order)
      for (let cnt = 0; cnt < board_list.length; cnt++) {
        board_list[cnt].member_profile_image = ServiceConfig.get('static_storage_prefix') + board_list[cnt].member_profile_image
      }
      return board_list
    }
  }

  getBoardDataDetail = async (database, board_data_seq) => {
    const model = this.getGroupBoardDataModel(database)
    const board_data = await model.getBoardDataDetail(board_data_seq)

    if (board_data.member_profile_image) {
      board_data.member_profile_image = ServiceConfig.get('static_storage_prefix') + board_data.member_profile_image
    }

    return board_data
  }

  getBoardCommentList = async (database, board_data_seq, member_seq) => {
    const model = this.getGroupBoardCommentModel(database)
    const comment_list = await model.getBoardCommentList(board_data_seq, member_seq)

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

  getTemporarilyList = async (database, group_seq, member_seq) => {
    const model = this.getGroupBoardDataModel(database)
    const cnt = await model.getTemporarilyCnt(group_seq, member_seq)
    const list = await model.getTemporarilyList(group_seq, member_seq)
    return {
      temporarily_cnt: cnt,
      temporarily_list: list
    }
  }

  CreateUpdateBoardComment = async (database, comment_data) => {
    const model = this.getGroupBoardCommentModel(database)
    const result = await model.CreateUpdateBoardComment(comment_data)
    if (result.affectedRows === 1) {
      const board_model = this.getGroupBoardDataModel(database)
      await board_model.updateBoardCommentCnt(comment_data.board_data_seq, '+');
      if (!comment_data.origin_seq) {
        await model.updateBoardCommentOriginSeq(result.insertId)
      }
    }
    return result;
  }

  CreateUpdateBoardData = async (database, board_data) => {
    const model = this.getGroupBoardDataModel(database)
    board_data.content_id = baseutil.getContentId();

    const board_data_num = await model.getLastBoardDataNum(board_data)
    if (board_data_num) {
      board_data.board_data_num = board_data_num.board_data_num + 1
    }

    const result = await model.CreateUpdateBoardData(board_data)

    if (!board_data.origin_seq && result.affectedRows === 1) {
      await model.updateBoardOriginSeq(result.insertId)
    }
    return result.insertId
  }

  updateBoardViewCnt = async (database, board_data_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.updateBoardViewCnt(board_data_seq);
  }

  updateBoardReCommendCnt = async (database, board_data_seq, type = null) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.updateBoardRecommendCnt(board_data_seq, type);
  }

  updateBoardCommentReCommendCnt = async (database, comment_seq, type = null) => {
    const model = this.getGroupBoardCommentModel(database)
    return await model.updateBoardCommentRecommendCnt(comment_seq, type);
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
    await model.DeleteBoardData(board_seq)
    await model.updateParentDataSubject(board_seq)
    return await model.updateParentDataSubject(board_seq)
  }

  ChangeBoardToNotice = async (database, board_data_seq, notice_num) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.ChangeBoardToNotice(board_data_seq, notice_num)
  }

  MoveBoardData = async (database, board_data_seq, board_seq, board_header_text) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.MoveBoardData(board_data_seq, board_seq, board_header_text)
  }

  getGroupBoardOpenTopList = async (database, group_seq) => {
    const model = this.getGroupBoardDataModel(database);
    return await model.getGroupBoardOpenTopList(group_seq);
  }

  uploadFile = async (group_seq, board_seq, request, response) => {
    logger.debug(this.log_prefix, `{ UPLOAD_ROOT: ${this.UPLOAD_ROOT}, FILE_URL_PREFIX: ${ServiceConfig.get('static_storage_prefix')} }`)
    const board_info = await this.getBoardDataDetail(DBMySQL, board_seq)
    const upload_path = `/group_board/${board_info.content_id}/`
    const upload_directory = `${ServiceConfig.get('media_root')}/${upload_path}`
    logger.debug(this.log_prefix, '[uploadFile]', `{ board_seq: ${board_seq} }`, upload_directory)
    if (!(await Util.fileExists(upload_directory))) {
      await Util.createDirectory(upload_directory)
    }

    const file_field_name = 'board_data_file'
    await Util.uploadByRequest(request, response, file_field_name, upload_directory)
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
    }
    const email_file_list = {
      file_path: `${upload_path}`,
      file_original_name: upload_file_info.originalname,
      file_name: request.new_file_name,
      file_size: upload_file_info.size,
      file_type: await Util.getFileType(upload_file_info.path, this.file_name),
      file_url: `${ServiceConfig.get('static_storage_prefix')}${upload_path}/${request.new_file_name}`
    }
    logger.debug(this.log_prefix, '[uploadFile]', `{ board_seq: ${board_seq} }`, 'email_file_list', email_file_list)

    let board_file_lists = JSON.parse(board_info.attach_file)

    if (!board_file_lists) {
      board_file_lists = []
      board_file_lists.push(email_file_list);
    } else {
      board_file_lists.push(email_file_list);
    }

    const param = {
      attach_file: JSON.stringify(board_file_lists),
    }

    const result = await this.fileUpdateBoardData(DBMySQL, board_seq, param)

    return email_file_list
  }

  fileUpdateBoardData = async (database, board_data_seq, param) => {
    const model = this.getGroupBoardDataModel(database)
    return model.fileUpdateBoardData(board_data_seq, param)
  }
}

const GroupBoardDataService = new GroupBoardDataServiceClass()

export default GroupBoardDataService
