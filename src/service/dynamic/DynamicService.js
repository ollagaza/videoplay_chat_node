import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import {DynamicModel} from '../../database/mongodb/dynamic'
import {DynamicResultModel} from "../../database/mongodb/dynamic_result";


const DynamicServiceClass = class {
  constructor() {
    this.log_prefix = '[DynamicServiceClass]'
  }

  getDynamicTemplateList = async (page_navigation, field_order, search_keyword, search_option) => {
    const dynamic_count = await DynamicModel.getDynamicTotalCount(search_keyword, search_option)
    page_navigation.list_count = Util.parseInt(page_navigation.list_count)
    page_navigation.cur_page = Util.parseInt(page_navigation.cur_page)
    page_navigation.total_count = dynamic_count
    const sort = JSON.parse(`{ "${field_order.name}": ${field_order.direction === 'desc' ? -1 : 1} }`)
    const dynamic_list = await DynamicModel.getDynamicList(page_navigation, sort, search_keyword, search_option)

    return { dynamic_list, page_navigation }
  }

  getDynamicResult = async (result_seq) => {
    return DynamicResultModel.findByResultSeq(result_seq)
  }

  saveTemplateResult = async (data) => {
    const result = await DynamicResultModel.createDynamicResult(data)
    return result
  }

  updateDynamicTemplate = async (result_seq, data) => {
    const result = await DynamicResultModel.updateById(result_seq, data)
    return result
  }

  daleteDynamicTemplate = async (result_seq, data) => {
    const result = await DynamicResultModel.deleteById(result_seq, data)
    return result
  }
}


const dynamic_service = new DynamicServiceClass()

export default dynamic_service
