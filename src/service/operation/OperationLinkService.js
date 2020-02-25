import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import OperationLinkModel from '../../database/mysql/operation/OperationLinkModel'
import OperationService from './OperationService'

const OperationLinkServiceClass = class {
  constructor () {
    this.log_prefix = '[]'
  }

  getOperationLinkModel = (database = null) => {
    if (database) {
      return new OperationLinkModel(database)
    }
    return new OperationLinkModel(DBMySQL)
  }

  getOperationLink = async (database, operation_seq) => {
    const operation_link_model = this.getOperationLinkModel(database)
    return await operation_link_model.getLinkInfoByOperation(operation_seq)
  }

  getOperationLinkBySeq = async (database, link_seq) => {
    const operation_link_model = this.getOperationLinkModel(database)
    return await operation_link_model.getLinkInfoBySeq(link_seq)
  }

  getOperationLinkByCode = async (database, link_code) => {
    const link_info = Util.decrypt(link_code)
    if (!link_info || !link_info.seq || !link_info.key) {
      throw new StdObject(-1, '사용할 수 없는 링크입니다.', 400)
    }

    const operation_link_info = await this.getOperationLinkBySeq(link_info.seq)
    log.debug(this.log_prefix, '', operation_link_info.random_key, link_info.key)
    if (!operation_link_info || operation_link_info.isEmpty() || operation_link_info.random_key !== link_info.key) {
      throw new StdObject(-2, '사용할 수 없는 링크입니다.', 400)
    }

    if (operation_link_info.expire_date) {
      if (operation_link_info.expire_date < Util.today('yyyy-mm-dd')) {
        throw new StdObject(-3, '만료된 링크입니다.', 400)
      }
    }

    return operation_link_info
  }

  checkOperationLinkByCode = async (database, link_code) => {
    const operation_link_info = await this.getOperationLinkByCode(database, link_code)

    const output = new StdObject()
    output.add('use_password', !Util.isEmpty(operation_link_info.password))
    output.add('link_seq', operation_link_info.seq)

    return output
  }

  checkLinkPassword = async (database, link_seq, password) => {
    const operation_link_info = await this.getOperationLinkBySeq(link_seq)
    return operation_link_info.password === Util.hash(password)
  }

  createOperationLink = async (operation_seq) => {
    let operation_link_info = await this.getOperationLink(DBMySQL, operation_seq)
    if (operation_link_info && !operation_link_info.isEmpty()) {

      return operation_link_info
    }

    await DBMySQL.transaction(async(transaction) => {
      const operation_link_model = this.getOperationLinkModel(transaction)
      const link_seq = await operation_link_model.createOperationLink(operation_seq)

      const random_key = Util.getRandomString()
      const link_code_params = {
        key: random_key,
        seq: link_seq,
      }
      const link_code = Util.encrypt(link_code_params)
      await operation_link_model.setOperationLinkBySeq(link_seq, random_key, link_code)
    });

    return await this.getOperationLink(DBMySQL, operation_seq)
  }

  deleteOperationLink = async (operation_seq) => {
    const operation_link_model = this.getOperationLinkModel()
    return await operation_link_model.deleteByOperation(operation_seq)
  }

  setLinkOptionByOperation = async (operation_seq, request_body) => {
    const link_type = request_body.link_type
    const password = request_body.password
    const expire_date = request_body.expire_date
    const hash_password = password ? Util.hash(password) : null
    const operation_link_model = this.getOperationLinkModel()
    return await operation_link_model.setLinkOptionByOperation(operation_seq, link_type, hash_password, expire_date)
  }
}

const operation_link_service = new OperationLinkServiceClass()
export default operation_link_service
