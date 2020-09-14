import _ from 'lodash'
import service_config from '../service-config'
import Util from '../../utils/baseutil'
import OperationExpansionDataModel from '../../database/mysql/operation/OperationExpansionDataModel'
import CodeSceneService from '../code/CodeSceneService'
import OperationExpansionDataInfo from '../../wrapper/operation/OperationExpansionDataInfo'

const OperationExpansionDataClass = class {
  constructor () {
    this.log_prefix = 'OperationExpansionData'
  }

  summaryActionCodeFilter = (update_target, summary) => {
    if (!update_target || !summary) return
    Object.keys(summary).forEach((key) => {
      if (CodeSceneService.hasCode(key)) {
        update_target[key] = summary[key]
      }
    })
  }

  getModel = (database) => {
    return new OperationExpansionDataModel(database)
  }

  getIdFilter = (id) => {
    return { 'seq': id }
  }

  getOperationSeqFilter = (operation_seq) => {
    return { operation_seq }
  }

  wrapQueryResult = (query_result, private_keys = []) => {
    const result_list = []
    if (query_result && query_result.data_list) {
      _.each(query_result.data_list, (row) => {
        if (row.thumbnail) {
          row.thumbnail_url = Util.getUrlPrefix(service_config.get('static_storage_prefix'), row.thumbnail)
        }
        result_list.push(new OperationExpansionDataInfo(row, private_keys))
      })
    }
    query_result.data_list = result_list
    return query_result
  }

  getOperationExpansionDataListByCode = async (database, code, search = null, page_query = {}) => {
    if (code === 'all') {
      code = null
    } else if (!CodeSceneService.hasCode(code)) {
      return []
    }
    const model = this.getModel(database)
    return this.wrapQueryResult(await model.getOperationExpansionDataList(code, search, page_query))
  }

  getNewlyExpansionDataList = async (database, code = null, page_query = {}) => {
    const model = this.getModel(database)
    return this.wrapQueryResult(await model.getNewlyExpansionDataList(code, page_query))
  }

  getNoDocExpansionDataList = async (database, code = null, page_query = {}) => {
    const model = this.getModel(database)
    return this.wrapQueryResult(await model.getNoDocExpansionDataList(code, page_query))
  }

  createOperationExpansionData = async (database, operation_info, summary) => {
    const create_params = {
      operation_seq: operation_info.seq
    }
    this.summaryActionCodeFilter(create_params, summary.tag_count_map)
    const model = this.getModel(database)
    return await model.createOperationExpansionData(create_params)
  }

  updateOperationExpansionData = async (database, filters, update) => {
    const model = this.getModel(database)
    return await model.updateOperationExpansionData(filters, update)
  }

  getOperationExpansionDataInfo = async (database, filters, private_keys = []) => {
    const model = this.getModel(database)
    return new OperationExpansionDataInfo(await model.getOperationExpansionData(filters), private_keys)
  }

  getOperationExpansionDataById = async (database, id, private_keys = []) => {
    const filters = this.getIdFilter(id)
    return await this.getOperationExpansionDataInfo(database, filters, private_keys)
  }

  getOperationExpansionDataByOperationSeq = async (database, operation_seq, private_keys = []) => {
    const filters = this.getOperationSeqFilter(operation_seq)
    return await this.getOperationExpansionDataInfo(database, filters, private_keys)
  }

  updateOperationActionSummary = async (database, filters, summary) => {
    const update = {}
    this.summaryActionCodeFilter(update, summary)
    return await this.updateOperationExpansionData(database, filters, update)
  }

  updateOperationActionSummaryById = async (database, id, summary) => {
    const filters = this.getIdFilter(id)
    return await this.updateOperationActionSummary(database, filters, summary)
  }

  updateOperationActionSummaryByOperationSeq = async (database, operation_seq, summary) => {
    const filters = this.getOperationSeqFilter(operation_seq)
    return await this.updateOperationActionSummary(database, filters, summary)
  }

  updateOperationExpansionDocument = async (database, filters, document) => {
    const update = { doc: document }
    return await this.updateOperationExpansionData(database, filters, update)
  }

  updateOperationExpansionDocumentById = async (database, id, document) => {
    const filters = this.getIdFilter(id)
    return await this.updateOperationExpansionDocument(database, filters, document)
  }

  updateOperationExpansionDocumentByOperationSeq = async (database, operation_seq, document) => {
    const filters = this.getOperationSeqFilter(operation_seq)
    return await this.updateOperationExpansionDocument(database, filters, document)
  }

  updateOperationExpansionPermission = async (database, filters, view_permission, edit_permission) => {
    const update = {
      view_permission,
      edit_permission
    }
    return await this.updateOperationExpansionData(database, filters, update)
  }

  updateOperationExpansionPermissionById = async (database, id, view_permission, edit_permission) => {
    const filters = this.getIdFilter(id)
    return await this.updateOperationExpansionPermission(database, filters, view_permission, edit_permission)
  }

  updateOperationExpansionPermissionByOperationSeq = async (database, operation_seq, view_permission, edit_permission) => {
    const filters = this.getOperationSeqFilter(operation_seq)
    return await this.updateOperationExpansionPermission(database, filters, view_permission, edit_permission)
  }

  deleteOperationExpansionData = async (database, filters) => {
    const model = this.getModel(database)
    return await model.deleteOperationExpansionData(filters)
  }

  deleteOperationExpansionDataById = async (database, id) => {
    const filters = this.getIdFilter(id)
    return await this.deleteOperationExpansionData(database, filters)
  }

  deleteOperationExpansionDataByOperationSeq = async (database, operation_seq) => {
    const filters = this.getOperationSeqFilter(operation_seq)
    return await this.deleteOperationExpansionData(database, filters)
  }
}

const operation_expansion_data_service = new OperationExpansionDataClass()

export default operation_expansion_data_service
