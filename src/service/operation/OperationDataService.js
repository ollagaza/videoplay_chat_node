import _ from "lodash"
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import log from "../../libs/logger"
import OperationDataModel from '../../database/mysql/operation/OperationDataModel'
import OperationDataInfo from '../../wrapper/operation/OperationDataInfo'
import DBMySQL from '../../database/knex-mysql'
import OperationService from './OperationService'

const OperationDataServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationDataService]'
  }

  getOperationDataModel = (database = null) => {
    if (database) {
      return new OperationDataModel(database)
    }
    return new OperationDataModel(DBMySQL)
  }

  createOperationDataByRequest = async (member_info, group_member_info, operation_seq, request_body) => {
    const { operation_info } = await OperationService.getOperationInfoNoAuth(DBMySQL, operation_seq)
    const operation_data_info = new OperationDataInfo(request_body).toJSON()
    operation_data_info.group_seq = group_member_info.group_seq
    operation_data_info.group_name = group_member_info.group_name
    operation_data_info.hospital = member_info.hospname
    operation_data_info.title = operation_info.operation_name
    
  }

}

const operation_data_service = new OperationDataServiceClass()
export default operation_data_service
