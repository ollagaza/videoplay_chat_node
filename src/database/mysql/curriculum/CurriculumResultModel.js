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
}
