import _ from 'lodash'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import service_config from "../service-config";
import {DynamicModel} from '../../database/mongodb/dynamic';

const DynamicAdminServiceClass = class {
  constructor() {
    this.log_prefix = '[DynamicAdminServiceClass]'
  }

  createDynamicTemplate = async (data) => {
    const result = await DynamicModel.createDynamic(data);
    return result;
  }
}


const dynamic_admin_service = new DynamicAdminServiceClass()

export default dynamic_admin_service
