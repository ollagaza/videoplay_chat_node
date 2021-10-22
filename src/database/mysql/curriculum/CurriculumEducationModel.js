import MySQLModel from '../../mysql-model'

export default class CurriculumEducationModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_education'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumEducationModel]'
  }

  getCurriculumEducation = async (curriculum_seq) => {
    return await this.find({ seq: curriculum_seq }, null, { name: 'sort', direction: 'asc' })
  }
}
