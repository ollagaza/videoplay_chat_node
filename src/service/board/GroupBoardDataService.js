import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/baseutil'
import ServiceConfig from '../service-config'
import DBMySQL from "../../database/knex-mysql";
import GroupBoardDataModel from '../../database/mysql/board/GroupBoardDataModel'
import baseutil from "../../utils/baseutil";

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

  getBoardData = async (database, req) => {
    const request_body = req.query ? req.query : {}
  }

  getBoardDataCount = async (database, group_seq, menu_seq) => {
    const model = this.getGroupBoardDataModel(database)
    return await model.getGroupBoardDataCount(group_seq, menu_seq)
  }

  CreateUpdateBoardData = async (database, board_data) => {
    const model = this.getGroupBoardDataModel(database)
    board_data.content_id = baseutil.getContentId();
    return await model.CreateUpdateBoardData(board_data)
  }
}

const GroupBoardDataService = new GroupBoardDataServiceClass()

export default GroupBoardDataService
