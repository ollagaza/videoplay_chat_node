import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import baseutil from "../../../utils/baseutil";

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
}
