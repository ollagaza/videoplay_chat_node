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

  CreateUpdateBoardData = async (board_data) => {
    Object.keys(board_data)
      .filter(item => typeof board_data[item] === 'object' ? board_data[item] = JSON.stringify(board_data[item]) : null)

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
}
