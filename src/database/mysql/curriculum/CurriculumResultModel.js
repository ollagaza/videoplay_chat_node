import MySQLModel from '../../mysql-model'

export default class CurriculumResultModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'curriculum_result'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumResultModel]'
  }

  getCurriculumResultCount = async (curriculum_seq) => {
    return await this.getTotalCount({curriculum_seq})
  }

  getCurriculumResultList = async (question_seq) => {
    return await this.find({question_seq})
  }

  getCurriculumResultListWithCurriculum = async (api_mode, group_seq, member_seq, search_keyword, request_paging, request_order) => {
    const select_fileld = [
      'curriculum.seq as curriculum_seq', 'curriculum.title', 'curriculum.group_seq',
      'curriculum_result.seq as result_seq', 'curriculum_result.user_name', 'curriculum_result.user_nickname',
      'curriculum_result.questions', 'curriculum_result.result', 'curriculum_result.appraisal', 'curriculum_result.score', 'curriculum_result.status',
      'curriculum_result.reg_date', 'curriculum_result.modify_date'
    ]
    const oKnex = this.database.select(select_fileld)
      .from('curriculum')
      .innerJoin(this.table_name, (builder) => {
        builder.andOn('curriculum_result.curriculum_seq', 'curriculum.seq')
        if (api_mode === 'private') {
          builder.andOn('curriculum_result.member_seq', member_seq)
          builder.andOnVal('curriculum_result.status', 2)
        }
      })
      .where('curriculum.group_seq', group_seq)
    if (api_mode === 'private') {
      select_fileld.push('group_info.group_name');
      oKnex.innerJoin('group_info', (builder) => {
        builder.andOn('group_info.seq', 'curriculum.group_seq')
      })
    }
    if (search_keyword) {
      oKnex.andWhere((query) => {
        query.orWhere('curriculum.title', 'like', `%${search_keyword}%`)
        query.orWhere(this.database.raw(`JSON_EXTRACT(curriculum_result.questions, '$.title') like '%${search_keyword}%'`))
      })
    }
    oKnex.orderBy('curriculum_result.reg_date', 'desc')
    return await this.queryPaginated(oKnex, request_paging.list_count, request_paging.cur_page)
  }

  getResultOne = async (curriculum_seq, result_seq) => {
    return await this.findOne({seq: result_seq, curriculum_seq})
  }

  getResultWithCurriculumAndMember = async (curriculum_seq, member_seq) => {
    return await this.find({curriculum_seq, member_seq})
  }

  createQuestionResult = async (result_data) => {
    return await this.create(result_data, 'seq')
  }
  updateQuestionResult = async (question_result_seq, result_data) => {
    result_data.modify_date = this.database.raw('current_timestamp()')
    return await this.update({seq: question_result_seq}, result_data)
  }
  deleteQuestionResult = async (question_result_seq) => {
    return await this.delete({seq: question_result_seq})
  }
}
