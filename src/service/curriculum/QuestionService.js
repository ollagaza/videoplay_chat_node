import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/mysql-model";
import CurriculumQuestionModel from "../../database/mysql/curriculum/CurriculumQuestionModel";
import CurriculumQuestionBankModel from "../../database/mysql/curriculum/CurriculumQuestionBankModel";

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
    return await question_model.updateQuestion(question_seq, question_data)
  }

  getQuestion = async (database, request) => {
    const question_seq = request.params.api_key
    const question_model = this.getQuestionModel(database)
    const question_info = await question_model.getQuestion(question_seq)
    if (question_info && question_info.question) {
      question_info.question = JSON.parse(question_info.question)

      if (question_info.question && question_info.question.length > 0) {
        const question_bank_seqs = _.map(question_info.question, 'seq')
        const question_bank_model = this.getQuestionBankModel(database)
        const filter = {
          is_new: true,
          query: [
            { seq: ['in'].concat(question_bank_seqs) },
          ],
        }
        question_info.question_list = await question_bank_model.getQuestions(filter)
      }
    }

    return question_info
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
}

const question_service_class = new QuestionServiceClass()

export default question_service_class
