import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/baseutil'
import ServiceConfig from '../service-config'
import DBMySQL from "../../database/knex-mysql";
import GroupBoardDataModel from '../../database/mysql/board/GroupBoardDataModel'

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

  getBoardDataCount = async (database, group_seq, menu_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.getGroupBoardDataCount(group_seq, menu_seq)
  }
}

const GroupBoardDataService = new GroupBoardDataServiceClass()

export default GroupBoardDataService
