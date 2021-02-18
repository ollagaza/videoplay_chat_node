import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/Util'
import ServiceConfig from '../service-config'
import DBMySQL from "../../database/knex-mysql";
import GroupBoardDataModel from '../../database/mysql/board/GroupBoardDataModel'
import GroupBoardCommentModel from '../../database/mysql/board/GroupBoardCommentModel'
import logger from "../../libs/logger";
import GroupMemberModel from "../../database/mysql/group/GroupMemberModel";

const GroupBoardDataServiceClass = class {
  constructor() {
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
    if (paging.cur_page !== 1) {
      const notice_count = await model.getBoardNoticeCount(group_seq, board_seq)
      if (notice_count > 0) {
        paging.start_count = (paging.list_count - notice_count) + 1;
      }
    }
    const board_list = await model.getBoardDataPagingList(group_seq, board_seq, paging, request_order)
    for (let cnt = 0; cnt < board_list.length; cnt++) {
      board_list[cnt].member_profile_image = ServiceConfig.get('static_storage_prefix') + board_list[cnt].member_profile_image
    }
    return board_list
  }

  getBoardDataDetail = async (database, board_data_seq) => {
    const model = this.getGroupBoardDataModel(database)
    const board_data = await model.getBoardDataDetail(board_data_seq)

    if (board_data.member_profile_image) {
      board_data.member_profile_url = ServiceConfig.get('static_storage_prefix') + board_data.member_profile_image
    }

    return board_data
  }

  getOpenBoardDataDetail = async (database, link_code) => {
    const model = this.getGroupBoardDataModel(database)
    const board_data = await model.getOpenBoardDataDetail(link_code)

    if (board_data.member_profile_image) {
      board_data.member_profile_url = ServiceConfig.get('static_storage_prefix') + board_data.member_profile_image
    }

    return board_data
  }

  getBoardCommentList = async (database, board_data_seq, member_seq) => {
    const model = this.getGroupBoardCommentModel(database)
    const comment_list = await model.getBoardCommentList(board_data_seq, member_seq)

    for (let cnt = 0; cnt < comment_list.length; cnt++) {
      if (comment_list[cnt].member_profile_image) {
        comment_list[cnt].member_profile_url = ServiceConfig.get('static_storage_prefix') + comment_list[cnt].member_profile_image
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
    let result = null

    if (comment_data.seq) {
      const seq = comment_data.seq;
      result = await model.UpdateBoardComment(seq, comment_data)
    } else {
      result = await model.CreateBoardComment(comment_data)
      const board_model = this.getGroupBoardDataModel(database)
      await board_model.incrementBoardCommentCnt(comment_data.board_data_seq)
      if (!comment_data.origin_seq) {
        await model.updateBoardCommentOriginSeq(result)
      }
      const group_member_model = new GroupMemberModel(database);
      await group_member_model.setUpdateGroupMemberCountsWithGroupSeqMemberSeq(comment_data.group_seq, comment_data.member_seq, 'board_comment', 'up')
    }
    return result;
  }

  CreateUpdateBoardData = async (database, board_data) => {
    const model = this.getGroupBoardDataModel(database)
    const group_member_model = new GroupMemberModel(database)
    let result = null

    if (board_data.seq) {
      const seq = board_data.seq
      await model.UpdateBoardData(seq, board_data)
      result = seq
    } else {
      const board_data_num = await model.getLastBoardDataNum(board_data.board_seq)
      if (board_data_num) {
        board_data.board_data_num = board_data_num.board_data_num + 1
      } else {
        board_data.board_data_num = 1
      }

      if (board_data.origin_seq && board_data.depth >= 1) {
        const baord_data_sort_num = await model.getLastBoardSortNum(board_data.origin_seq)
        board_data.sort_num = baord_data_sort_num.sort_num + 1
      } else {
        board_data.sort_num = 0
      }
      board_data.content_id = Util.getContentId()
      let check_bool = true;
      while (check_bool) {
        board_data.link_code = Util.getRandomString(10)
        const check_link_code = await model.getLinkCodeCheck(board_data.link_code)
        if (!check_link_code) {
          check_bool = false;
        }
      }

      result = await model.CreateBoardData(board_data)
      if (!board_data.origin_seq) {
        await model.updateBoardOriginSeq(result)
      }
    }

    if (board_data.status !== 'T') {
      await group_member_model.setUpdateGroupMemberCountsWithGroupSeqMemberSeq(board_data.group_seq, board_data.member_seq, 'board_cnt', 'up')
    }
    return result
  }

  updateBoardViewCnt = async (database, board_data_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.updateBoardViewCnt(board_data_seq);
  }

  incrementBoardReCommendCnt = async (database, board_data_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.incrementBoardReCommendCnt(board_data_seq);
  }
  decrementBoardReCommendCnt = async (database, board_data_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.decrementBoardReCommendCnt(board_data_seq);
  }

  incrementBoardCommentReCommendCnt = async (database, comment_seq) => {
    const model = this.getGroupBoardCommentModel(database)
    return await model.incrementBoardCommentReCommendCnt(comment_seq);
  }
  decrementBoardCommentReCommendCnt = async (database, comment_seq) => {
    const model = this.getGroupBoardCommentModel(database)
    return await model.decrementBoardCommentReCommendCnt(comment_seq);
  }

  DeleteComment = async (database, is_admin, board_data_seq, comment_seq) => {
    let delete_status = 'D'
    const model = this.getGroupBoardCommentModel(database)
    const comment_info = await model.getCommentInfo(comment_seq)

    if (is_admin) {
      delete_status = 'A'
    }

    const result = await model.DeleteComment(delete_status, comment_seq)

    const group_member_model = new GroupMemberModel(database);
    await group_member_model.setUpdateGroupMemberCountsWithGroupSeqMemberSeq(comment_info.group_seq, comment_info.member_seq, 'board_comment', 'down', 1)

    const board_model = this.getGroupBoardDataModel(database)
    await board_model.decrementBoardCommentCnt(board_data_seq, 1)
    return result;
  }

  DeleteBoardData = async (database, board_seq) => {
    const model = this.getGroupBoardDataModel(database)
    const board_comment_model = this.getGroupBoardCommentModel(database)
    const target_info = await model.getBoardDataDetail(board_seq)

    if (target_info.status === 'Y') {
      const group_member_model = new GroupMemberModel(database)
      await group_member_model.setUpdateGroupMemberCountsWithGroupSeqMemberSeq(target_info.group_seq, target_info.member_seq, 'board_cnt', 'down')
      const comment_count_list = await board_comment_model.getBoardCommentCountList(board_seq)
      this.decreaseCommentCount(comment_count_list, target_info.group_seq)
      await model.DeleteBoardData(board_seq)
      await model.updateParentDataSubject(board_seq)
    } else {
      await model.DeleteTempBoardData(board_seq)
    }
    return true
  }

  decreaseCommentCount = (comment_count_list, group_seq) => {
    (
      async (comment_count_list, group_seq) => {
        const group_member_model = new GroupMemberModel(DBMySQL)
        for (let i = 0; i < comment_count_list.length; i++) {
          try {
            await group_member_model.setUpdateGroupMemberCountsWithGroupSeqMemberSeq(group_seq, comment_count_list[i].member_seq, 'board_comment', 'down', comment_count_list[i].cnt)
          } catch (e) {
            logger.error(this.log_prefix, 'decreaseCommentCount', comment_count_list, group_seq, e)
          }
        }
      }
    )(comment_count_list, group_seq)
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
    await Util.uploadByRequest(request, response, file_field_name, upload_directory, null, false, true)
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

  deleteFile = async (database, board_seq, file) => {
    const board_info = await this.getBoardDataDetail(database, board_seq)
    let board_file_lists = JSON.parse(board_info.attach_file)
    board_file_lists = _.reject(board_file_lists, file)
    const media_root = ServiceConfig.get('media_root')
    const file_full_path = `${media_root}${file.file_path}${file.file_name}`
    await Util.deleteFile(file_full_path)
    const param = {
      attach_file: JSON.stringify(board_file_lists),
    }
    await this.fileDeleteBoardData(DBMySQL, board_seq, param)
    return board_file_lists
  }

  fileUpdateBoardData = async (database, board_data_seq, param) => {
    const model = this.getGroupBoardDataModel(database)
    return model.fileUpdateBoardData(board_data_seq, param)
  }

  fileDeleteBoardData = async (database, board_data_seq, param) => {
    const model = this.getGroupBoardDataModel(database)
    return model.fileDeleteBoardData(board_data_seq, param)
  }

  allDeleteCommentByGrouypSeqMemberSeq = async (database, group_seq, member_seq) => {
    const board_model = this.getGroupBoardDataModel(database)
    const comment_model = this.getGroupBoardCommentModel(database);
    const comment_list = await comment_model.getBoardCommentListByGroupSeqMemberSeq(group_seq, member_seq);
    const res_data = {};
    for (let i = 0; i < comment_list.length; i++) {
      const comment_seq = comment_list[i].seq;
      const board_data_seq = comment_list[i].board_data_seq;
      let delete_status = 'N'
      const comment_info = await comment_model.getCommentInfo(comment_seq)

      if (comment_info.total_count > 1) {
        delete_status = 'D'
      }
      const result = await comment_model.DeleteComment(delete_status, comment_seq);

      if (result) {
        res_data[comment_seq]++;
      }
      await board_model.decrementBoardCommentCnt(board_data_seq);
    }
    return res_data;
  }

  getBoardDataPagingListWithMemberAllList = async (database, req) => {
    const request_body = req.query ? req.query : {}
    const group_seq = request_body.group_seq
    const member_seq = request_body.member_seq
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}
    const request_order = request_body.order ? JSON.parse(request_body.order) : null

    const paging = {}
    paging.list_count = request_paging.list_count ? request_paging.list_count : 10
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = 'N'

    const model = this.getGroupBoardDataModel(database)
    const board_list = await model.getBoardDataPagingListByGroupAndSeqMemberSeq(group_seq, member_seq, paging, request_order)
    for (let cnt = 0; cnt < board_list.length; cnt++) {
      board_list[cnt].member_profile_image = ServiceConfig.get('static_storage_prefix') + board_list[cnt].member_profile_image
    }
    return board_list
  }


}

const GroupBoardDataService = new GroupBoardDataServiceClass()

export default GroupBoardDataService
