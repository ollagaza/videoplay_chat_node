import MySQLModel from '../../mysql-model'
import OperationDataInfo from '../../../wrapper/operation/OperationDataInfo'

export default class OperationDataModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'operation_data'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationDataModel]'
  }

  createOperationData = async (operation_data) => {
    operation_data.reg_date = this.database.raw('NOW()')
    operation_data.modify_date = this.database.raw('NOW()')
    return await this.create(operation_data, 'seq')
  }

  getOperationData = async (operation_data_seq) => {
    const result = await this.findOne({ seq: operation_data_seq })
    return new OperationDataInfo(result)
  }

  getOperationDataByOperationSeq = async (operation_seq) => {
    const result = await this.findOne({ operation_seq })
    return new OperationDataInfo(result)
  }

  updateThumbnailImage = async (operation_data_seq, thumbnail_path) => {
    const filter = {
      seq: operation_data_seq
    }
    const update_params = {
      thumbnail: thumbnail_path,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }
}
