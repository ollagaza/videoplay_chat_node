import _ from 'lodash';
import ServiceConfig from '../service-config';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import HelperModel from "../../database/mysql/helper/HelperModel";

const HelperServiceClass = class {
  constructor () {
    this.log_prefix = '[HelperServiceClass]'
  }

  getHelperModel = (database = null) => {
    if (database) {
      return new HelperModel(database)
    }
    return new HelperModel(DBMySQL)
  }

  getHelperList = async (database) => {
    const helpermodel = this.getHelperModel(database);
    const result = await helpermodel.getHelperList();
    return result;
  }

  getHelperInfo = async (database, code) => {
    const helpermodel = this.getHelperModel(database);
    const result = await helpermodel.getHelperInfo(code ? code : 'main');
    return result;
  }

  getHelperInfo2 = async (database, code) => {
    const helpermodel = this.getHelperModel(database);
    const result = await helpermodel.getHelperInfo2(code);
    return result;
  }

  searchhelper = async  (database, keyword) => {
    const helpermodel = this.getHelperModel(database);
    const result = await helpermodel.getSearchResult(keyword);
    return result;
  }

  cudHelper = async (database, param, saveData) => {
    const helpermodel = this.getHelperModel(database);
    let result = null;
    if (param.seq) {
      result = await helpermodel.updateHelper(param, saveData);
    } else {
      result = await helpermodel.createHelper(saveData);
    }
    return result;
  }
}

const helper_service = new HelperServiceClass()

export default helper_service
