import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import QuestionModel from "../../database/mysql/curriculum/QuestionModel";
import DBMySQL from "../../database/knex-mysql";

const QuestionServiceClass = class {
  constructor() {
    this.log_prefix = '[QuestionServiceClass]'
  }

  getQuestionModel(database) {
    if (database) {
      return new QuestionModel(database);
    }
    return new QuestionModel(DBMySQL);
  }

  createQuestion = async (database, group_auth, request_body) => {
    const question_model = this.getQuestionModel(database)
    const question_data = request_body.body.param;
    return await question_model.createQuestion(question_data)
  }

  updateQuestion = async (database, group_auth, request_body) => {
    const question_seq = request_body.params.api_key
    const question_model = this.getQuestionModel(database)
    const question_data = request_body.body.param;
    return await question_model.updateQuestion(question_seq, question_data)
  }

  getQuestion = async (database, request_body) => {
    const question_seq = request_body.params.api_key
    const question_model = this.getQuestionModel(database)
    return await question_model.getQuestion(question_seq)
  }
}

const question_service_class = new QuestionServiceClass()

export default question_service_class
