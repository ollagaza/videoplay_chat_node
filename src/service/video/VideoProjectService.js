import DBMySQL from '../../database/knex-mysql'
import ServiceConfig from '../../service/service-config';
import Role from '../../constants/roles'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'

import { VideoProjectModel } from '../../database/mongodb/VideoProject';

const VideoProjectServiceClass = class {
  constructor () {
    this.log_prefix = '[VideoProjectServiceClass]'
  }

  migrationGroupSeq = async (member_seq, group_seq) => {
    await VideoProjectModel.migrationGroupSeq(member_seq, group_seq)
  }
}

const video_project_service = new VideoProjectServiceClass()
export default video_project_service
