import logger from '../../libs/logger'
import DBMySQL from '../../database/knex-mysql'
import GroupAlarmModel from '../../database/mysql/group/GroupAlarmModel'
import OperationService from '../operation/OperationService'
import _ from 'lodash'
import SocketManager from '../socket-manager'
import GroupService from './GroupService'

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

  createOperationGroupAlarm = (group_seq, type, message, operation_info, member_info, data, socket_message = null, socket_extra_data = null, change_storage_size = false) => {
    (
      async (group_seq, type, message, operation_info, member_info, data, socket_message, socket_extra_data) => {
        let alarm_data = null;
        try {
          const operation_seq = operation_info.seq
          const folder_grade = await this.getFolderGrade(operation_seq)
          data.type = type
          alarm_data = {
            message,
            group_seq,
            grade: folder_grade,
            type,
            data: JSON.stringify(data),
            member_state: JSON.stringify({})
          }
          if (member_info) {
            alarm_data.user_name = member_info.user_name
            alarm_data.user_nickname = member_info.user_nickname
          }
          await this.createGroupAlarm(group_seq, alarm_data)
          if (socket_message) {
            this.sendSocket(group_seq, alarm_data, socket_message, 'onChangeOperationState', socket_extra_data, change_storage_size)
          }
        } catch (error) {
          logger.error(this.log_prefix, '[createOperationCommentAlarm]', alarm_data, data, error)
        }
      }
    )(group_seq, type, message, operation_info, member_info, data, socket_message, socket_extra_data)
  }

  createGroupAlarm = async (group_seq, alarm_data) => {
    const group_alarm_model = this.getGroupAlarmModel()
    return group_alarm_model.createGroupAlarm(alarm_data)
  }
  sendSocket = (group_seq, alarm_data, message_info, action_type = null, extra_data = null, change_storage_size = false) => {
    (
      async () => {
        try {

          let data = {}

          if (alarm_data.data) {
            if (typeof alarm_data.data === 'string') data = JSON.parse(alarm_data.data)
            else if (typeof alarm_data.data === 'object') data = alarm_data.data
          }

          data.group_seq = group_seq
          data.grade = alarm_data.grade
          data.type = alarm_data.type
          data.is_alarm = true

          if (action_type) data.action_type = action_type
          if (extra_data) data.extra_data = extra_data

          const socket_data = {
            data
          }
          if (message_info) {
            message_info.type = 'pushNotice'
            socket_data.message_info = message_info
          }
          if (change_storage_size) {
            const storage_status = await GroupService.getGroupStorageStatus(group_seq)
            data.change_storage_size = true
            data.storage_status = storage_status
          }
          await SocketManager.sendToFrontGroup(group_seq, socket_data)
        } catch (error) {
          logger.error(this.log_prefix, '[sendSocket]', group_seq, alarm_data, message_info, action_type, extra_data, error)
        }
      }
    )()
  }

  getFolderGrade = async (operation_seq) => {
    return await OperationService.getFolderGrade(operation_seq)
  }

  onReadAlarm = (group_seq, member_seq, grade_number, request_body) => {
    const group_alarm_model = this.getGroupAlarmModel()
    return group_alarm_model.onGroupAlarmRead(group_seq, member_seq, grade_number, request_body)
  }

  onDeleteAlarm = (group_seq, member_seq, grade_number, request_body) => {
    (
      async (group_seq, member_seq, request_body) => {
        try {
          const group_alarm_model = this.getGroupAlarmModel()
          await group_alarm_model.onGroupAlarmDelete(group_seq, member_seq, grade_number, request_body)
        } catch (error) {
          logger.error(this.log_prefix, '[onDeleteAlarm]', group_seq, member_seq, grade_number, request_body, error)
        }
      }
    )(group_seq, member_seq, request_body)
  }

  getNewGroupAlarmCount = async (group_seq, member_seq, grade_number, request_query) => {
    const group_alarm_model = this.getGroupAlarmModel()
    return group_alarm_model.getNewGroupAlarmCount(group_seq, member_seq, grade_number, request_query)
  }

  getNewGroupAlarmList = async (group_seq, member_seq, grade_number, request_query) => {
    const group_alarm_model = this.getGroupAlarmModel()
    return group_alarm_model.getNewGroupAlarmList(group_seq, member_seq, grade_number, request_query)
  }

  getGroupAlarmList = async (group_seq, member_seq, grade_number, request_query) => {
    const group_alarm_model = this.getGroupAlarmModel()
    return group_alarm_model.getGroupAlarmList(group_seq, member_seq, grade_number, request_query)
  }
}

const GroupAlarmService = new GroupAlarmServiceClass()
export default GroupAlarmService
