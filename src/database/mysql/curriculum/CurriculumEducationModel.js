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

  getCurriculumEducationList = async (curriculum_seq) => {
    return await this.find({ curriculum_seq: curriculum_seq }, null, { name: 'sort', direction: 'asc' })
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
