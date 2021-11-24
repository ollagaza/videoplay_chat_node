import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/mysql-model";
import CurriculumQuestionModel from "../../database/mysql/curriculum/CurriculumQuestionModel";
import CurriculumQuestionBankModel from "../../database/mysql/curriculum/CurriculumQuestionBankModel";
import CurriculumResultModel from "../../database/mysql/curriculum/CurriculumResultModel";
import CurriculumService from "./CurriculumService";
import group from "../../routes/admin/group";

const QuestionServiceClass = class {
  constructor() {
    this.log_prefix = '[QuestionServiceClass]'
  }

  getQuestionModel(database) {
    if (database) {
      return new CurriculumQuestionModel(database);
    }
    return new CurriculumQuestionModel(DBMySQL);
  }

  getQuestionBankModel(database) {
    if (database) {
      return new CurriculumQuestionBankModel(database);
    }
    return new CurriculumQuestionBankModel(DBMySQL);
  }

  getCurriculumResultModel(database) {
    if (database) {
      return new CurriculumResultModel(database);
    }
    return new CurriculumResultModel(DBMySQL);
  }

  createQuestion = async (database, group_auth, request_body) => {
    const question_model = this.getQuestionModel(database)
    const question_data = request_body.body.param;
    question_data.questions = JSON.stringify(question_data.questions)
    return await question_model.createQuestion(question_data)
  }

  updateQuestion = async (database, group_auth, request_body) => {
    const question_seq = request_body.params.api_key
    const question_model = this.getQuestionModel(database)
    const question_data = request_body.body.param;
    question_data.questions = JSON.stringify(question_data.questions)
    return await question_model.updateQuestion(question_seq, question_data)
  }

  deleteQuestion = async (database, group_auth, request_body) => {
    const curriculum_seq = request_body.params.api_key
    const question_seq = request_body.params.api_sub_key
    const question_model = this.getQuestionModel(database)
    const question_result_model = this.getCurriculumResultModel(database)
    const question_results = await question_result_model.getCurriculumResultCount(curriculum_seq)

    if (question_results === 0) {
      await question_model.deleteQuestion(question_seq)
      return await this.getQuestion(database, request_body)
    }
    return null;
  }

  createQuestionBank = async (database, group_auth, request_body) => {
    const question_model = this.getQuestionBankModel(database)
    const question_data = request_body.body.param;
    question_data.example = JSON.stringify(question_data.example)
    return await question_model.createQuestion(question_data)
  }

  updateQuestionBank = async (database, group_auth, request_body) => {
    const question_seq = request_body.params.api_key
    const question_model = this.getQuestionBankModel(database)
    const question_data = request_body.body.param;
    question_data.example = JSON.stringify(question_data.example)
    question_data.modify_date = database.raw('NOW()')
    return await question_model.updateQuestion(question_seq, question_data)
  }

  getQuestionList = async (database, curriculum_seq) => {
    const question_model = this.getQuestionModel(database)
    const question_info = await question_model.getQuestionList(curriculum_seq)
    if (question_info && question_info.question) {
      question_info.question = JSON.parse(question_info.question)
    }

    return question_info
  }

  getQuestion = async (database, group_auth, request) => {
    const curriculum_seq = request.params.api_key
    const question_seq = request.params.api_sub_key
    const question_model = this.getQuestionModel(database)
    const question_info = await question_model.getQuestionOne(curriculum_seq, question_seq)
    if (question_info && question_info.question) {
      question_info.question = JSON.parse(question_info.question)
    }

    return question_info
  }

  getResultWithCurriculumAndMember = async (database, group_auth, request) => {
    const curriculum_seq = request.params.curriculum_seq
    const question_result_model = this.getCurriculumResultModel(database)
    const question_result = await question_result_model.getResultWithCurriculumAndMember(curriculum_seq, group_auth.member_seq)
    let result_list = {}
    for (let cnt = 0; cnt < question_result.length; cnt++) {
      const survey_seq = `result_${question_result[cnt].question_seq}`
      result_list[survey_seq] = _.filter(question_result, item => item.question_seq === question_result[cnt].question_seq)
    }
    return result_list
  }

  getQuestionResult = async (database, group_auth, request) => {
    const curriculum_seq = request.params.api_key
    const result_seq = request.params.api_sub_key
    const curriculum_result_model = this.getCurriculumResultModel(database)
    const result_info = await curriculum_result_model.getResultOne(curriculum_seq, result_seq)

    return result_info
  }

  getQuestionResultList = async (database, group_auth, request) => {
    const api_mode = request.params.api_mode
    const curriculum_seq = request.params.api_key
    const curriculum_result_model = this.getCurriculumResultModel(database)
    let result_info = null
    result_info = await curriculum_result_model.getCurriculumResultListWithCurriculum(api_mode, curriculum_seq, group_auth.member_seq)

    return result_info
  }

  getQuestionBank = async (database, request_body) => {
    const question_seq = request_body.params.api_key
    const question_model = this.getQuestionBankModel(database)
    return await question_model.getQuestionBank(question_seq)
  }

  getQuestionBankList = async (database, group_auth, req) => {
    const request_body = req.query ? req.query : {}
    const page = request_body.page ? request_body.page : null
    const group_seq = request_body.group_seq ? request_body.group_seq : group_auth.group_seq
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}
    const request_order = request_body.order ? JSON.parse(request_body.order) : null
    const search_option = request_body.search_option ? request_body.search_option : null
    const search_keyword = request_body.search_keyword ? request_body.search_keyword : null

    const filters = {
      group_seq,
    }

    const question_model = this.getQuestionBankModel(database)
    return await question_model.getQuestionBankList(filters, request_paging, request_order)
  }

  createQuestionResult = async (database, group_auto, request) => {
    try {
      const question_result_model = this.getCurriculumResultModel(database)
      const result_data = request.body.params
      return await question_result_model.createQuestionResult(result_data)
    } catch (e) {
      throw e
    }
  }
  updateQuestionResult = async (database, group_auto, request) => {
    try {
      const question_result_model = this.getCurriculumResultModel(database)
      const result_data = request.body.params
      const question_result_seq = result_data.seq
      delete result_data.seq
      return await question_result_model.updateQuestionResult(question_result_seq, result_data)
    } catch (e) {
      throw e
    }
  }
  deleteQuestionResult = async (database, group_auto, request) => {
    try {
      const question_result_model = this.getCurriculumResultModel(database)
      const question_result_seq = request.params.api_key
      return await question_result_model.deleteQuestionResult(question_result_seq)
    } catch (e) {
      throw e
    }
  }
}

const question_service_class = new QuestionServiceClass()

export default question_service_class
