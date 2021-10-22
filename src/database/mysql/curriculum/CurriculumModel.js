import MySQLModel from '../../mysql-model'

export default class CurriculumModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumModel]'
  }

  createCurriculum = async (question_data) => {
    return await this.create(question_data, 'seq')
  }

  updateCurriculumThumbnail = async (curriculum_seq, thumbnail_path) => {
    return await this.update({ seq: curriculum_seq }, { thumbnail: thumbnail_path })
  }

  getCurriculum = async (curriculum_seq) => {
    return await this.findOne({ seq: curriculum_seq })
  }

  getCurriculumList = async (filters, paging, order) => {
    return await this.findPaginated(filters, null, order, null, paging)
  }
}
