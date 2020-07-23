import MySQLModel from '../../mysql-model'
import OperationDataInfo from '../../../wrapper/operation/OperationDataInfo'

export default class OperationDataModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'operation_data'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationDataModel]'
  }

  getOperationDataPrams = (operation_data, set_reg_date = false) => {
    if (set_reg_date) operation_data.reg_date = this.database.raw('NOW()')
    operation_data.modify_date = this.database.raw('NOW()')
    if (operation_data.hashtag_list) {
      operation_data.hashtag_list = JSON.stringify(operation_data.hashtag_list)
    } else {
      operation_data.hashtag_list = JSON.stringify([])
    }
    if (operation_data.category_list) {
      operation_data.category_list = JSON.stringify(operation_data.category_list)
    } else {
      operation_data.category_list = JSON.stringify([])
    }
    return operation_data
  }

  createOperationData = async (operation_data) => {
    return await this.create(this.getOperationDataPrams(operation_data, true), 'seq')
  }

  updateOperationData = async (operation_seq, operation_data) => {
    return await this.update({ operation_seq }, this.getOperationDataPrams(operation_data))
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

  updateThumbnailImageNotExists = async (operation_data_seq, thumbnail_path) => {
    const filter = {
      seq: operation_data_seq
    }
    const update_params = {
      thumbnail: this.database.raw(`IF(\`thumbnail\` IS NULL, '${thumbnail_path}', \`thumbnail\`)`),
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }

  updateComplete = async (operation_data_seq) => {
    const filter = {
      seq: operation_data_seq
    }
    const update_params = {
      is_complete: 1,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }

  setRejectMentoring = async (operation_data_seq) => {
    try {
      const filter = {
        seq: operation_data_seq
      }
      const update_params = {
        is_mento_complete: 'R'
      }
      return await this.update(filter, update_params)
    } catch (e) {
      throw e;
    }
  }

  updateDoc = async (operation_data_seq, doc_html, doc_text) => {
    const filter = {
      seq: operation_data_seq
    }
    const update_params = {
      doc_html,
      doc_text,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }
}
