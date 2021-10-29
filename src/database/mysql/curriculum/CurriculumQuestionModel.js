import MySQLModel from '../../mysql-model'

export default class CurriculumQuestionModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_question'
    this.selectable_fields = ['*']
    this.log_prefix = '[QuestionModel]'
  }

  getQuestion = async (curriculum_seq) => {
    return await this.find({ curriculum_seq }, null, { name: 'sort', direction: 'asc' })
  }
}
