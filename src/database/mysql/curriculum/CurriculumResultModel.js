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

  getCurriculumResultListWithCurriculum = async (api_mode, curriculum_seq, member_seq) => {
    const oKnex = this.database.select('*')
      .from('curriculum')
      .innerJoin(this.table_name, (builder) => {
        builder.andOn('curriculum_result.curriculum_seq', 'curriculum.seq')
        if (api_mode === 'private') {
          oKnex.andWhere('curriculum_result.member_seq', member_seq)
        }
      })
      .where('curriculum.seq', curriculum_seq)
      .orderBy('reg_date', 'desc')
    return await this.find({ curriculum_seq })
  }

  getResultOne = async (curriculum_seq, result_seq) => {
    return await this.findOne({ seq: result_seq, curriculum_seq })
  }

  getResultWithCurriculumAndMember = async (curriculum_seq, member_seq) => {
    return await this.find({ curriculum_seq, member_seq })
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
