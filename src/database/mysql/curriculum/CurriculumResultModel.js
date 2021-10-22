import MySQLModel from '../../mysql-model'

export default class CurriculumResultModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_result'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumResultModel]'
  }

  createQuestion = async (question_data) => {
    return await this.create(question_data, 'seq')
  }

  getQuestion = async (question_seq) => {
    return await this.findOne({ seq: question_seq })
  }
}
