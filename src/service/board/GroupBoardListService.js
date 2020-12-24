import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/baseutil'
import ServiceConfig from '../service-config'
import DBMySQL from "../../database/knex-mysql";
import GroupBoardListModel from "../../database/mysql/board/GroupBoardListModel";

const GroupBoardListServiceClass = class {
  constructor () {
    this.log_prefix = '[GroupBoardListService]'
  }

  getGroupBoardModel = (database) => {
    if (database) {
      return new GroupBoardListModel(database)
    }
    return new GroupBoardListModel(DBMySQL)
  }

  getGroupBoardList = async (database, group_seq) => {
    const model = this.getGroupBoardModel(database)
    return await model.getGroupBoardList(group_seq)
  }

  delGroupBoardList = async (database, group_seq, menu_seq) => {
    const model = this.getGroupBoardModel(database)
    return await model.delGroupBoardList(group_seq, menu_seq)
  }
}

const GroupBoardListService = new GroupBoardListServiceClass()

export default GroupBoardListService
