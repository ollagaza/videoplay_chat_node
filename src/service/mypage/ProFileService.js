import _ from 'lodash'
import ServiceConfig from '../service-config'
import Util from '../../utils/baseutil'
import Auth from '../../middlewares/auth.middleware'
import Role from "../../constants/roles"
import Constants from '../../constants/constants'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from "../../libs/logger"
import ProFileModel from "../../database/mysql/mypage/ProFileModel"

const ProFileServiceClass = class {
  constructor () {
    this.log_prefix = '[HelperServiceClass]'
  }

  getProFileModel = (database = null) => {
    if (database) {
      return new ProFileModel(database)
    }
    return new ProFileModel(DBMySQL)
  }

  getProFileInfo = async (database, group_seq) => {
    try {
      const profile_model = this.getProFileModel(database)
      const profileinfo = await profile_model.getProFileInfo(group_seq)
      const json_profileinfo = JSON.parse(profileinfo.profile);
      if (json_profileinfo !== null && json_profileinfo.image !== undefined) {
        json_profileinfo.image = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), json_profileinfo.image)
      }
      profileinfo.profile = json_profileinfo
      return profileinfo
    } catch (e) {
      throw e
    }
  }

  updateProFileInfo = async (database, group_seq, profile) => {
    try {
      const profile_model = this.getProFileModel(database)
      const result = await profile_model.updateProFileInfo(group_seq, profile)
      return result
    } catch (e) {
      throw e
    }
  }

  changeCMFlag = async (database, group_seq, json_flag) => {
    try {
      const profile_model = this.getProFileModel(database)
      let result = null
      if (json_flag.type === 'channel') {
        result = await profile_model.updateChannelFlag(group_seq, json_flag.flag)
      } else {
        result = await profile_model.updateMentoFlag(group_seq, json_flag.flag)
      }
      return result
    } catch (e) {
      throw e
    }
  }
}

const profile_service = new ProFileServiceClass()

export default profile_service
