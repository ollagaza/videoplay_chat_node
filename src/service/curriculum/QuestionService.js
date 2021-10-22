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

  createQuestion = async (database, group_auth, request_body) => {
    const question_model = this.getQuestionBankModel(database)
    const question_data = request_body.body.param;
    return await question_model.createQuestion(question_data)
  }

  updateQuestion = async (database, group_auth, request_body) => {
    const question_seq = request_body.params.api_key
    const question_model = this.getQuestionBankModel(database)
    const question_data = request_body.body.param;
    return await question_model.updateQuestion(question_seq, question_data)
  }

  getQuestion = async (database, request_body) => {
    const question_seq = request_body.params.api_key
    const question_model = this.getQuestionBankModel(database)
    return await question_model.getQuestion(question_seq)
  }
}

const question_service_class = new QuestionServiceClass()

export default question_service_class
