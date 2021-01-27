import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import logger from "../../../libs/logger";
import baseutil from "../../../utils/baseutil";
import board_data from "../../../routes/v1/boards/board_data";

export default class GroupBoardDataModel extends MySQLModel {
  constructor (...args) {
    super(...args)

    this.table_name = 'board_data'
    this.log_prefix = '[GroupBoardDataModel]'
    this.selectable_fields = ['*']
  }

  getGroupBoardDataCount = async (group_seq, menu_seq) => {
    return this.getTotalCount({ group_seq, seq: menu_seq })
  }

  getTemporarilyCnt = async (group_seq, member_seq) => {
    return this.getTotalCount({ group_seq, member_seq, status: 'T' })
  }

  getTemporarilyList = async (group_seq, member_seq) => {
    return this.find({ group_seq, member_seq, status: 'T' })
  }

  getLastBoardDataNum = async (board_seq) => {
    return this.findOne({ board_seq }, ['board_data_num'], { name: 'board_data_num', direction: 'desc' })
  }

  getLastBoardSortNum = async (origin_seq) => {
    return this.findOne({ origin_seq }, ['sort_num'], { name: 'sort_num', direction: 'desc' })
  }

  getBoardNoticeCount = async (group_seq, board_seq) => {
    const oKnex = this.database.select('*')
      .from(this.table_name)
      .where('group_seq', group_seq)
      .andWhere('is_notice', '1')
      .andWhere('status', 'Y')
      .unionAll([
        this.database.select('*')
          .from(this.table_name)
          .where('group_seq', group_seq)
          .andWhere('is_notice', '2')
          .andWhere('board_seq', board_seq)
          .andWhere('status', 'Y')
      ])

    const list = await oKnex;
    return list.length
  }

  getBoardDataPagingList = async (group_seq, board_seq, paging, order) => {
    let oKnex = null;
    if (baseutil.parseInt(paging.cur_page) === 1) {
      oKnex = this.database.select('*')
        .from(this.table_name)
        .where('group_seq', group_seq)
        .andWhere('is_notice', '1')
        .andWhere('status', 'Y')
        .unionAll([
          this.database.select('*')
            .from(this.table_name)
            .where('group_seq', group_seq)
            .andWhere('is_notice', '2')
            .andWhere('board_seq', board_seq)
            .andWhere('status', 'Y')
          ,
          this.database.select('*')
            .from(this.table_name)
            .where('group_seq', group_seq)
            .andWhere('is_notice', '3')
            .andWhere('board_seq', board_seq)
            .andWhere('status', 'Y')
        ])
    } else {
      oKnex = this.database.select('*')
        .from(this.table_name)
        .where('group_seq', group_seq)
        .andWhere('is_notice', '3')
        .andWhere('board_seq', board_seq)
        .andWhere('status', 'Y')
    }
    oKnex.orderBy([{column: 'is_notice', order: 'asc'}, {column: 'origin_seq', order: 'desc'}, { column: 'sort_num', order: 'asc' }, {column: 'parent_seq', order: 'asc'}, {column: 'depth', order: 'asc'}])
    return await this.queryPaginated(oKnex, paging.list_count, paging.cur_page, paging.page_count, 'n', paging.start_count)
  }

  getBoardDataDetail = async (board_data_seq) => {
    const oKnex = this.database.select(['board.*', 'mem.profile_image_path as member_profile_image'])
      .from(`${this.table_name} as board`)
      .innerJoin('member as mem', { 'mem.seq': 'board.member_seq' })
      .where('board.seq', board_data_seq)
      .first()
    return oKnex
  }

  CreateBoardData = async (board_data) => {
    return this.create(board_data, 'seq')
  }

  UpdateBoardData = async (seq, board_data) => {
    return this.update({ seq }, board_data)
  }

  updateParentDataSubject = async (board_seq) => {
    return this.update({ parent_seq: board_seq }, { subject: this.database.raw('concat(\'<span style="color: #ff0000;">[본글이 삭제된 답글]</span> \', subject)') })
  }

  updateBoardOriginSeq = async (board_seq) => {
    return this.update({ seq: board_seq }, { origin_seq: board_seq })
  }

  incrementBoardReCommendCnt = async (board_seq) => {
    return this.increment({ seq: board_seq }, { recommend_cnt: 1 })
  }
  decrementBoardReCommendCnt = async (board_seq) => {
    return this.decrement({ seq: board_seq }, { recommend_cnt: 1 })
  }

  updateBoardViewCnt = async (board_seq) => {
    return this.update({ seq: board_seq }, { view_cnt: this.database.raw('view_cnt + 1') })
  }

  incrementBoardCommentCnt = async (board_seq) => {
    return this.increment({ seq: board_seq }, { comment_cnt: 1 })
  }
  decrementBoardCommentCnt = async (board_seq, type) => {
    return this.decrement({ seq: board_seq }, { comment_cnt: 1 })
  }

  DeleteBoardData = async (board_seq) => {
    return this.update({ seq: board_seq }, { status: 'D' })
  }

  ChangeBoardToNotice = async (board_data_seq, notice_num) => {
    return this.update({ seq: board_data_seq }, { is_notice: notice_num })
  }

  MoveBoardData = async (board_data_seq, board_seq, board_header_text) => {
    await this.update({ origin_seq: board_data_seq }, { board_seq, header_text: board_header_text })
    return this.update({ seq: board_data_seq }, { board_seq, header_text: board_header_text })
  }

  getGroupBoardOpenTopList = async (group_seq) => {
    const oKnex = this.database.select(`${this.table_name}.*`, 'group_board_list.board_open')
    // const oKnex = this.database.select(`${this.table_name}.*`)
      .from(this.table_name)
      .leftJoin('group_board_list', 'group_board_list.seq', `${this.table_name}.board_seq`)
      .where(`${this.table_name}.group_seq`, group_seq)
      .andWhere('group_board_list.board_open', '1')
      .andWhere('status', 'Y')
      .andWhere(`${this.table_name}.is_open`, '1')
      .orderBy([{ column: `${this.table_name}.seq`, order: 'desc' }])
      .limit(5);
    return oKnex;
  }

  fileUpdateBoardData = async (board_data_seq, param) => {
    param.attach_file_cnt = this.database.raw('attach_file_cnt + 1')
    return this.update({ seq: board_data_seq }, param)
  }
  fileDeleteBoardData = async (board_data_seq, param) => {
    param.attach_file_cnt = this.database.raw('attach_file_cnt - 1')
    return this.update({ seq: board_data_seq }, param)
  }
}
