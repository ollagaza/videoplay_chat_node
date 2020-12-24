import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import baseutil from "../../../utils/baseutil";

export default class GroupBoardListModel extends MySQLModel {
  constructor (...args) {
    super(...args)

    this.table_name = 'group_board_list'
    this.log_prefix = '[GroupBoardListModel]'
    this.selectable_fields = ['*']
  }

  getGroupBoardList = async (group_seq) => {
    return this.find({ group_seq }, this.selectable_fields, { name: 'sort', direction: 'asc' })
  }

  delGroupBoardList = async (group_seq, menu_seq) => {
    return this.delete( { seq: menu_seq, group_seq })
  }
}
