import MySQLModel from '../../mysql-model'

export default class CurriculumLogModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_log'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumLogModel]'
  }

  createQuestion = async (question_data) => {
    return await this.create(question_data, 'seq')
  }

  getQuestion = async (question_seq) => {
    return await this.findOne({ seq: question_seq })
  }
}
