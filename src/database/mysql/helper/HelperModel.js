import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class HelperModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'service_tutorial'
    this.selectable_fields = ['*']
    this.log_prefix = '[HelperModel]'
  }

  getHelperList = async () => {
    return this.find();
  };

  getHelperInfo = async code => {
    return this.findOne({ code });
  };

  getHelperInfo2 = async code => {
    return this.find(code);
  };

  createHelper = async saveData => {
    return this.create(saveData, 'seq');
  };

  updateHelper = async (param, saveData) => {
    return this.update(param, saveData);
  };
}