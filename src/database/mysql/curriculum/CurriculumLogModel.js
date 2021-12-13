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

  getCurriculumLog = async (member_seq, curriculum_seq, log_type = 1) => {
    return await this.findOne({ member_seq, curriculum_seq, log_type });
  }

  createCurriculumLog = async (in_data) => {
    return await this.create(in_data, 'seq');
  }

  updateCurriculumLog = async (curriculum_seq, member_seq, all_total_time = 0, in_data) => {
    const update_params = {
      total_play_time: all_total_time,
      log_info: this.database.raw('JSON_MERGE_PATCH(log_info, ?)', JSON.stringify(in_data)),
      reg_date: this.database.raw('NOW()')
    }

    const query = this.database
      .update(update_params)
      .from(this.table_name)
      .where('curriculum_seq', curriculum_seq)
      .where('member_seq', member_seq)

    return query;
  }
}
