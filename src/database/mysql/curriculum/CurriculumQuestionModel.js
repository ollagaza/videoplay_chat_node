import MySQLModel from '../../mysql-model'

export default class CurriculumQuestionModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_question'
    this.selectable_fields = ['*']
    this.log_prefix = '[QuestionModel]'
  }

  createQuestion = async (params) => {
    return await this.create(params, 'seq')
  }

  updateQuestion = async (question_seq, params) => {
    return await this.update({ seq: question_seq }, params)
  }

  deleteQuestion = async (question_seq) => {
    return await this.delete({ seq: question_seq })
  }

  getQuestionList = async (curriculum_seq) => {
    return await this.find({ curriculum_seq }, null, { name: 'sort', direction: 'asc' })
  }

  getQuestionOne = async (curriculum_seq, question_seq) => {
    return await this.findOne({ seq: question_seq, curriculum_seq }, null, { name: 'sort', direction: 'asc' })
  }
}
