import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import {DynamicModel} from '../../database/mongodb/dynamic'
import {DynamicResultModel} from "../../database/mongodb/dynamic_result";
import Question_BasicData from "../../data/dynamic_template/question.json";

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

  updateTemplateResult = async (result_seq, data) => {
    const result = await DynamicResultModel.updateById(result_seq, data)
    return result
  }

  deleteTemplateResult = async (result_seq, data) => {
    const result = await DynamicResultModel.deleteById(result_seq, data)
    return result
  }

  setJsonTemplateData = async () => {
    const template = await DynamicModel.findByTemplate_id(Question_BasicData.template_id)
    log.debug(this.log_prefix, 'setJsonTemplateData', Question_BasicData, Question_BasicData.template_id, template._doc.version, Question_BasicData.version);
    if (template._doc && template._doc.version < Question_BasicData.version) {
      await DynamicModel.updateByTemplate_id(Question_BasicData)
    } else if (!template || !template._doc.version) {
      await DynamicModel.createDynamic(Question_BasicData)
    }
  }
}


const dynamic_service = new DynamicServiceClass()

export default dynamic_service
