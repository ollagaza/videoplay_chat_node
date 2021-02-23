import logger from '../../libs/logger'
import Util from '../../utils/Util'
import DBMySQL from '../../database/knex-mysql'
import GroupAlarmModel from '../../database/mysql/group/GroupAlarmModel'
import OperationService from '../operation/OperationService'
import formatter from 'string-template'
import _ from 'lodash'

const GroupAlarmServiceClass = class {
  constructor () {
    this.log_prefix = '[GroupAlarmService]'
    this.ALARM_TYPE_OPERATION = 'operation'
    this.ALARM_TYPE_CLIP = 'clip'
    this.ALARM_TYPE_COMMENT = 'comment'
  }

  getGroupAlarmModel = (database) => {
    if (!database) {
      return new GroupAlarmModel(DBMySQL)
    }
    return new GroupAlarmModel(database)
  }

  createOperationGroupAlarm = (group_member_info, type, message, operation_info, member_info, data) => {
    (
      async (group_member_info, type, message, operation_info, member_info, data) => {
        let alarm_data = null;
        try {
          const group_seq = group_member_info.group_seq
          const operation_seq = operation_info.seq
          const folder_grade = await this.getFolderGrade(operation_seq)
          alarm_data = {
            message,
            group_seq,
            grade: folder_grade,
            type,
            data: JSON.stringify(data),
            user_name: member_info.user_name,
            user_nickname: member_info.user_nickname,
            member_state: JSON.stringify({})
          }
          const message_option = {
            name: group_member_info.member_name_used === 0 ? member_info.user_nickname : member_info.user_name
          }
          const socket_message = formatter(message, message_option)
          await this.createGroupAlarm(alarm_data, true, socket_message)
        } catch (error) {
          logger.error(this.log_prefix, '[createOperationCommentAlarm]', alarm_data, data, error)
        }
      }
    )(group_member_info, type, message, operation_info, member_info, data)
  }

  createGroupAlarm = async (alarm_data, send_socket = true, socket_message = null) => {
    const group_alarm_model = this.getGroupAlarmModel()
    const alarm_seq = await group_alarm_model.createGroupAlarm(alarm_data)

    if (send_socket) {

    }
    return alarm_seq
  }

  getFolderGrade = async (operation_seq) => {
    return await OperationService.getFolderGrade(operation_seq)
  }
}

const GroupAlarmService = new GroupAlarmServiceClass()
export default GroupAlarmService
