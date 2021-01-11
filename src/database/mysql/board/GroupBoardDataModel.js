import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import logger from "../../../libs/logger";

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

  getBoardDataPagingList = async (group_seq, board_seq, paging, order) => {
    const oKnex = this.database.select('*')
      .from(this.table_name)
      .where('group_seq', group_seq)
      .andWhere('is_notice', '1')
      .unionAll([
        this.database.select('*')
          .from(this.table_name)
          .where('group_seq', group_seq)
          .andWhere('is_notice', '2')
        ,
        this.database.select('root.*')
          .from(`${this.table_name} as root`)
          .leftOuterJoin(`${this.table_name} as parent`, {'parent.parent_seq': 'root.seq'})
          .where((query) => {
            query.where('root.group_seq', group_seq)
            query.andWhere('root.board_seq', board_seq)
            query.andWhere('root.is_notice', '3')
          })
          .distinct()
      ])
      .orderBy([{ column: 'is_notice', order: 'asc' }, { column: 'parent_seq', order: 'asc' }, { column: 'seq', order: 'desc' }])

    return await this.queryPaginated(oKnex, 10, paging.cur_page)
  }

  getBoardDataDetail = async (board_data_seq) => {
    const oKnex = this.database.select(['board.*', 'mem.profile_image_path as member_profile_image'])
      .from(`${this.table_name} as board`)
      .innerJoin('member as mem', { 'mem.seq': 'board.member_seq' })
      .where('board.seq', board_data_seq)
      .first()
    return oKnex
  }

  CreateUpdateBoardData = async (board_data) => {
    Object.keys(board_data)
      .filter(item => typeof board_data[item] === 'object' ? board_data[item] = JSON.stringify(board_data[item]) : null)
      .filter(item => board_data[item] === 'null' ? board_data[item] = null : board_data[item])

    const exclusions = Object.keys(board_data)
      .filter(item => item !== 'seq')
      .map(item => this.database.raw('?? = ?', [item, board_data[item]]).toString())
      .join(',\n')
    const insertString = this.database(this.table_name).insert(board_data).toString()
    const conflictString = this.database.raw(` ON DUPLICATE KEY UPDATE ${exclusions}, \`modify_date\` = current_timestamp()`).toString()
    const query = (insertString + conflictString)
    const result = await this.database
      .raw(query)
      .on('query', data => log.debug(this.log_prefix, 'CreateUpdateBoardData', data.sql))

    return result.shift().insertId
  }

  updateBoardViewCnt = async (board_seq) => {
    return this.update({ seq: board_seq }, { view_cnt: this.database.raw('view_cnt + 1') })
  }

  updateBoardCommentCnt = async (board_seq, type) => {
    return this.update({ seq: board_seq }, { comment_cnt: this.database.raw(`comment_cnt + ${type ? 1 : -1}`) })
  }

  DeleteBoardData = async (board_seq) => {
    return this.update({ seq: board_seq }, { status: 'D' })
  }

  getGroupBoardOpenTopList = async (group_seq) => {
    const oKnex = this.database.select(`${this.table_name}.*`, 'group_board_list.board_open')
    // const oKnex = this.database.select(`${this.table_name}.*`)
      .from(this.table_name)
      .leftJoin('group_board_list', 'group_board_list.seq', `${this.table_name}.board_seq`)
      .where(`${this.table_name}.group_seq`, group_seq)
      .andWhere('group_board_list.board_open', '1')
      .andWhere(`${this.table_name}.is_open`, '1')
      .orderBy([{ column: `${this.table_name}.seq`, order: 'desc' }])
      .limit(5);
    return oKnex;
  }
}
