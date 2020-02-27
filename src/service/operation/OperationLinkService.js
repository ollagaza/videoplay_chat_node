import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import OperationLinkModel from '../../database/mysql/operation/OperationLinkModel'
import OperationService from './OperationService'
import GroupService from '../member/GroupService'

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
    let link_info = Util.decrypt(link_code)
    if (!link_info) {
      throw new StdObject(-1, '사용할 수 없는 링크입니다.', 400)
    }
    link_info = JSON.parse(link_info)
    if (!link_info || !link_info.seq || !link_info.key) {
      throw new StdObject(-2, '사용할 수 없는 링크입니다.', 400)
    }

    const operation_link_info = await this.getOperationLinkBySeq(database, link_info.seq)
    log.debug(this.log_prefix, '[getOperationLinkByCode]', operation_link_info.random_key, link_info.key)
    if (!operation_link_info || operation_link_info.isEmpty() || operation_link_info.random_key !== link_info.key) {
      throw new StdObject(-3, '사용할 수 없는 링크입니다.', 400)
    }

    if (operation_link_info.expire_date) {
      if (operation_link_info.expire_date < Util.today('yyyy-mm-dd')) {
        throw new StdObject(-4, '만료된 링크입니다.', 400)
      }
    }

    return operation_link_info
  }

  checkOperationLinkByCode = async (database, link_code) => {
    const operation_link_info = await this.getOperationLinkByCode(database, link_code)
    const { operation_info } = await OperationService.getOperationInfo(database, operation_link_info.operation_seq, null, false, false)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(-5, '공유된 수술/시술이 없습니다.', 400)
    }
    if (operation_info.status !== 'Y') {
      throw new StdObject(-6, '삭제된 수술/시술 입니다.', 400)
    }
    const group_info = await GroupService.getGroupInfo(database, operation_info.group_seq)
    if (group_info.status !== 'Y' && group_info.status !== 'F') {
      throw new StdObject(-7, '사용이 중지된 사용자입니다.', 400)
    }

    return {
      use_password: !Util.isEmpty(operation_link_info.password),
      link_seq: operation_link_info.seq,
      group_name: group_info.group_name,
      operation_name: operation_info.operation_name
    }
  }

  checkLinkPassword = async (database, link_seq, password) => {
    const operation_link_info = await this.getOperationLinkBySeq(link_seq)
    return operation_link_info.password === Util.hash(password)
  }

  createOperationLink = async (operation_seq, is_link) => {
    let operation_link_info = null;
    if (is_link) {
      operation_link_info = await this.getOperationLink(DBMySQL, operation_seq)
      if (operation_link_info && !operation_link_info.isEmpty()) {
        return operation_link_info
      }
    }

    await DBMySQL.transaction(async(transaction) => {
      const operation_link_model = this.getOperationLinkModel(transaction)
      const link_seq = await operation_link_model.createOperationLink(operation_seq, is_link)

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

  deleteOperationLinkBySeq = async (link_seq) => {
    const operation_link_model = this.getOperationLinkModel()
    return await operation_link_model.deleteBySeq(link_seq)
  }

  setLinkOptionBySeq = async (link_seq, request_body) => {
    const link_type = request_body.link_type
    const password = request_body.password
    const expire_date = request_body.expire_date
    const hash_password = password ? Util.hash(password) : null
    const operation_link_model = this.getOperationLinkModel()
    return await operation_link_model.setLinkOptionBySeq(link_seq, link_type, hash_password, expire_date)
  }
}

const operation_link_service = new OperationLinkServiceClass()
export default operation_link_service
