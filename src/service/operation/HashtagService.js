import _ from "lodash"
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import log from "../../libs/logger"
import OperationDataModel from '../../database/mysql/operation/OperationDataModel'
import OperationDataInfo from '../../wrapper/operation/OperationDataInfo'
import GroupService from '../member/GroupService'
import DBMySQL from '../../database/knex-mysql'
import OperationService from './OperationService'
import striptags from 'striptags'
import OperationFileService from './OperationFileService'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import ServiceConfig from '../service-config'

const HashtagServiceClass = class {
  constructor () {
    this.log_prefix = '[HashtagService]'
  }

  getOperationDataModel = (database = null) => {
    if (database) {
      return new OperationDataModel(database)
    }
    return new OperationDataModel(DBMySQL)
  }
}

const hashtag_service = new HashtagServiceClass()
export default hashtag_service
