import DBMySQL from '../../database/knex-mysql'
import GroupSurgboxModel from '../../database/mysql/surgbox/GroupSurgboxModel'
import GroupService from '../group/GroupService'

const GroupSurgboxServiceClass = class {
  constructor () {
    this.log_prefix = '[GroupSurgboxService]'
  }

  getModel = (database) => {
    if (database) {
      return new GroupSurgboxModel(database)
    }
    return new GroupSurgboxModel(DBMySQL)
  }

  checkDuplicate = async (group_seq, machine_id) => {
    const model = this.getModel()
    return model.checkDuplicate(group_seq, machine_id)
  }

  createGroupSurgboxInfo = async (group_seq, member_seq, machine_id) => {
    const group_box_info = {
      group_seq,
      member_seq,
      machine_id
    }
    const model = this.getModel()
    group_box_info.seq = await model.createGroupSurgboxInfo(group_box_info)

    return group_box_info
  }

  getGroupSurgboxInfoList = async (group_seq) => {
    const model = this.getModel()
    return model.getGroupSurgboxInfoList(group_seq)
  }

  deleteGroupSurgboxInfo = async (seq) => {
    const model = this.getModel()
    return model.deleteGroupSurgboxInfo(seq)
  }

  getGroupBoxUserList = async (machine_id) => {
    const model = this.getModel()
    const box_group_list = await model.getBoxGroupList(machine_id)
    const group_seq_list = []
    if (box_group_list) {
      for (let i = 0; i < box_group_list.length; i++) {
        group_seq_list.push(box_group_list[i].group_seq)
      }
    }
    return GroupService.getGroupListForBox(DBMySQL, group_seq_list)
  }
}

const GroupSurgboxService = new GroupSurgboxServiceClass()
export default GroupSurgboxService
