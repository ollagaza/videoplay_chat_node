import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import {DynamicModel} from '../../database/mongodb/dynamic'
import {DynamicResultModel} from "../../database/mongodb/dynamic_result";


const DynamicServiceClass = class {
  constructor() {
    this.log_prefix = '[DynamicServiceClass]'
  }

  getDynamicTemplateList = async (template_type) => {
    const dynamic_list = await DynamicModel.getDynamicTemplateTypeList(template_type)
    return dynamic_list
  }

  getDynamicResult = async (result_id) => {
    return DynamicResultModel.findByResultId(result_id)
  }

  getDynamicResultList = async (result_seq) => {
    return DynamicResultModel.getDynamicResultList(result_seq)
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
