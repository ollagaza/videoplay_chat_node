import MySQLModel from '../../mysql-model'

export default class SurgboxUpdateFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'surgbox_update_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[SurgboxUpdateFileModel]'
  }

  createUpdateFile = async (surgbox_update_file_info) => {
    return this.create(surgbox_update_file_info, 'seq')
  }

  getUpdateFile = async (update_seq, file_seq) => {
    return this.findOne({ seq: file_seq, surgbox_update_seq: update_seq })
  }

  deleteUpdateFile = async (update_seq, file_seq) => {
    return this.delete({ seq: file_seq, surgbox_update_seq: update_seq })
  }

  getFileSummary = async (update_seq) => {
    const summary = {
      total_file_count: 0,
      total_file_size: 0
    }
    const result = await this.findOne({ surgbox_update_seq: update_seq }, [this.database.raw('COUNT(*) AS total_count'), this.database.raw('SUM(file_size) AS total_size')])
    if (result && result.total_count) {
      summary.total_file_count = result.total_count
      summary.total_file_size = result.total_size
    }
    return summary
  }

  getFileList = async (update_seq) => {
    return this.find({ surgbox_update_seq: update_seq })
  }
}
