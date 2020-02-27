import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import JsonWrapper from '../../../wrapper/json-wrapper'
import StdObject from '../../../wrapper/std-object'

export default class OperationLinkModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'operation_link'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationLinkModel]'
    this.default_private_key = ['operation_seq', 'random_key', 'password', 'reg_date']
  }

  createOperationLink = async (operation_seq, is_link) => {
    const create_params = {
      operation_seq: operation_seq,
      is_link: is_link ? 1 : 0
    }
    return await this.create(create_params, 'seq')
  }

  setOperationLinkBySeq = async (link_seq, random_key, link_code) => {
    await this.update({ seq: link_seq }, { random_key, link_code })
  }

  getLinkInfoByOperation = async (operation_seq) => {
    const find_result = await this.findOne( { operation_seq: operation_seq, is_link: true } )
    return new JsonWrapper(find_result, this.default_private_key)
  }

  getLinkInfoBySeq = async (link_seq) => {
    const find_result = await this.findOne( { seq: link_seq } )
    return new JsonWrapper(find_result, this.default_private_key)
  }

  deleteBySeq = async (link_seq) => {
    return await this.delete( { seq: link_seq } )
  }

  setLinkOptionBySeq = async (operation_seq, link_type, password, expire_date) => {
    const update_params = {
      link_type,
      password,
      expire_date: expire_date ? expire_date : null,
      modify_date: this.database.raw('NOW()')
    }
    return await this.delete( { operation_seq: operation_seq }, update_params )
  }
}
