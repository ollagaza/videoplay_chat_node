import MySQLModel from '../../mysql-model'

export default class CurriculumResultModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_result'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumResultModel]'
  }

  getCurriculumResultCount = async (curriculum_seq) => {
    return await this.getTotalCount({ curriculum_seq })
  }

  getCurriculumResultList = async (question_seq) => {
    return await this.find({ question_seq })
  }

  getResultOne = async (curriculum_seq, result_seq) => {
    return await this.findOne({ seq: result_seq, curriculum_seq })
  }

  getResultWithCurriculumAndMember = async (curriculum_seq, question_seq, member_seq) => {
    return await this.findOne({ curriculum_seq, question_seq, member_seq })
  }

  createQuestionResult = async (result_data) => {
    return await this.create(result_data, 'seq')
  }
  updateQuestionResult = async (question_result_seq, result_data) => {
    return await this.update({ seq: question_result_seq }, result_data)
  }
  deleteQuestionResult = async (question_result_seq) => {
    return await this.delete({ seq: question_result_seq })
  }
}
