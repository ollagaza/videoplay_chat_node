import MySQLModel from '../../mysql-model'

export default class OperationFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationFileModel]'
  }

  createOperationFile = async (operation_file_info) => {
    return this.create(operation_file_info, 'seq')
  }

  getOperationFileList = async (operation_seq, last_seq = null, limit = 0) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.database.raw('operation_file use index (`INDEX_of_operation_seq`)'))
      .where('operation_seq', operation_seq)
    if (last_seq) {
      query.andWhere('seq', '>', last_seq)
    }
    if (limit > 0) {
      query.limit(limit)
    }
    return query
  }

  deleteFile = async (operation_seq, file_seq) => {
    return this.delete({ seq: file_seq, operation_seq})
  }

  deleteFolder = async (operation_seq, directory) => {
    return this.database
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .where((builder) => {
        builder.where('directory', directory)
        builder.orWhere('directory', 'LIKE', `${directory}/%`)
      })
      .del()
  }

  changeFileName = async (operation_seq, file_seq, new_file_name) => {
    const update_params = {
      file_name: new_file_name
    }
    return this.update({ seq: file_seq, operation_seq }, update_params )
  }
  changeFolderName = async (operation_seq, directory, new_directory) => {
    const update_params = {
      directory: this.database.raw('REPLACE(directory, ?, ?)', directory, new_directory)
    }
    return this.database
      .update(update_params)
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .where((builder) => {
        builder.where('directory', directory)
        builder.orWhere('directory', 'LIKE', `${directory}/%`)
      })
  }

  operationFileSummary = async (operation_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size']
    return await this.findOne({ operation_seq }, select)
  }

  deleteSelectedFiles = async (operation_seq, file_seq_list) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .whereIn('seq', file_seq_list)
    const result_list = await query
    if (!result_list || result_list.length <= 0) {
      return []
    }

    await this.database
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .whereIn('seq', file_seq_list)
      .del()

    return result_list
  }
}
