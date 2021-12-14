import MySQLModel from '../../mysql-model'

export default class CurriculumEducationModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_education'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumEducationModel]'
  }

  getCurriculumEducation = async (education_seq) => {
    return await this.findOne({ seq: education_seq })
  }

  setCurriculumEducation = async (education_seq, education_data) => {
    education_data.modify_date = this.database.raw('NOW()');
    return await this.update({ seq: education_seq }, education_data);
  }

  getCurriculumEducationList = async (curriculum_seq, is_comment_count = false) => {
    let select_query = 'curriculum_education.*';
    if (is_comment_count) {
      select_query += ', curriculum_education_comment.comment_count';
    }
    const query = this.database.select([ this.database.raw(select_query) ])
    query.from(this.table_name)
    if (is_comment_count) {
      query.joinRaw('LEFT JOIN (SELECT curriculum_education_seq, COUNT(*) AS comment_count FROM curriculum_education_comment GROUP BY curriculum_education_seq) AS curriculum_education_comment ON (curriculum_education_comment.curriculum_education_seq = curriculum_education.seq)')
    }
    query.where('curriculum_education.curriculum_seq', curriculum_seq)
    query.orderBy(`${this.table_name}.sort`, 'asc');
    return query;
    // return await this.find({ curriculum_seq: curriculum_seq }, null, { name: 'sort', direction: 'asc' })
  }

  getCurriculumEducationListCount = async (curriculum_seq) => {
    const query = this.database.select([ this.database.raw('COUNT(*) AS total_count') ])
    query.from(this.table_name)
    query.where('curriculum_seq', curriculum_seq)
    query.first()
    const result = await query
    return result && result.total_count > 0 ? result.total_count : 0;
  }

  getCurriculumEducationLastSort = async (curriculum_seq) => {
    return await this.findOne({ curriculum_seq: curriculum_seq }, ['sort'], { name: 'sort', direction: 'DESC' });
  }

  addCurriculumEducation = async (question_data) => {
    return await this.create(question_data, 'sort')
  }

  deleteCurriculumEducation = async (education_seq) => {
    return await this.delete({ seq: education_seq });
  }

  updateCurriculumSort = async (education_seq, sort) => {
    return await this.update({ seq: education_seq }, { sort });
  }
}
