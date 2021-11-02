import MySQLModel from '../../mysql-model'

export default class CurriculumQuestionBankModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_question_bank'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumQuestionBankModel]'
  }

  createQuestion = async (question_data) => {
    return await this.create(question_data, 'seq')
  }

  updateQuestion = async (question_seq, question_data) => {
    return await this.update({ seq: question_seq }, question_data)
  }

  getQuestionBank = async (question_seq) => {
    return await this.findOne({ seq: question_seq })
  }

  getQuestionBankList = async (filters, paging, order) => {
    return await this.findPaginated(filters, null, order, null, paging)
  }

  getQuestions = async (question_seqs) => {
    return await this.find({ seq: question_seqs })
  }
}
