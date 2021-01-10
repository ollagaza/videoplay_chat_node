import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import logger from "../../../libs/logger";

export default class GroupBoardCommentModel extends MySQLModel {
  constructor (...args) {
    super(...args)

    this.table_name = 'board_comment'
    this.log_prefix = '[GroupBoardCommentModel]'
    this.selectable_fields = ['*']
  }

  getBoardCommentList = async (board_data_seq) => {
    const oKnex = this.database.select(['root.*',  'mem.profile_image_path as member_profile_image'])
      .from(`${this.table_name} as root`)
      .leftOuterJoin(`${this.table_name} as parent`, {'parent.parent_seq': 'root.seq'})
      .innerJoin('member as mem', { 'mem.seq': 'root.member_seq' })
      .where((query) => {
        query.where('root.board_data_seq', board_data_seq)
        // query.andWhere('root.status', 'Y')
      })
      .distinct()
      .orderBy([{ column: 'root.parent_seq', order: 'asc' }, { column: 'root.seq', order: 'desc' }])

    return oKnex
  }

  CreateUpdateBoardComment = async (comment_data) => {
    const exclusions = Object.keys(comment_data)
      .filter(item => item !== 'seq')
      .map(item => this.database.raw('?? = ?', [item, comment_data[item]]).toString())
      .join(',\n')
    const insertString = this.database(this.table_name).insert(comment_data).toString()
    const conflictString = this.database.raw(` ON DUPLICATE KEY UPDATE ${exclusions}, \`modify_date\` = current_timestamp()`).toString()
    const query = (insertString + conflictString)
    const result = await this.database
      .raw(query)
      .on('query', data => log.debug(this.log_prefix, 'CreateUpdateBoardData', data.sql))

    return result.shift()
  }

  DeleteComment = async (comment_seq) => {
    return this.update({ seq: comment_seq }, { status: 'D' })
  }
}
