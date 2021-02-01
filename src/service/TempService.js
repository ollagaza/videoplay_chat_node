import _ from 'lodash'
import StdObject from "../wrapper/std-object";
import baseutil from "../utils/baseutil";
import log from '../libs/logger'
import { MedicalModel } from '../database/mongodb/Medical'
import OperationFolderService from "./operation/OperationFolderService";
import GroupBoardListService from "./board/GroupBoardListService";

const TempServiceClass = class {
  constructor () {
    this.log_prefix = '[TempService]'
  }

  updateBoardLinkCodeSync = async (database) => {
    const result = await database.select('*').from('board_data').whereNull('link_code')

    for (let cnt = 0; cnt < result.length; cnt++) {
      const board_data = result[cnt]
      const link_code = baseutil.getRandomString()

      await database.update({ link_code }).from('board_data').where({ seq: board_data.seq })
    }
    return true;
  }

  updateMemberTreatCodeSync = async (database) => {
    const medical_result = await MedicalModel.findAll()
    const medial_info = medical_result[0].toJSON ? medical_result[0].toJSON() : medical_result[0]._doc
    const members = await database.select('*').from('member').whereNotNull('treatcode').andWhere('treatcode', '!=', '[]')

    for (let cnt = 0; cnt < members.length; cnt++) {
      const member = members[cnt]
      const treatcode = JSON.parse(member.treatcode)
      if (treatcode) {
        const treat_input = []
        for (let treat_cnt = 0; treat_cnt < treatcode.length; treat_cnt++) {
          const treat = treatcode[treat_cnt]
          if (_.find(medial_info.kor, { code: treat.code }) && !treat.icon) {
            const find_result = _.find(medial_info.kor, { code: treat.code })
            treat_input.push(find_result)
          } else {
            treat_input.push(treat)
          }
        }
        if (treat_input.length > 0) {
          await database.update({treatcode: JSON.stringify(treat_input)}).from('member').where({seq: member.seq})
        }
      }
    }
  }

  defaultFolderAndBoardMake = async (database) => {
    const noFolder_GroupList = await database.select(['group_info.seq as group_seq', 'group_info.member_seq'])
      .from('group_info')
      .leftOuterJoin('operation_folder', 'operation_folder.group_seq', 'group_info.seq')
      .whereNull('operation_folder.seq')
      .andWhere('group_info.group_type', 'G')

    for (let cnt = 0; cnt < noFolder_GroupList.length; cnt++) {
      const group_info = noFolder_GroupList[cnt]
      await OperationFolderService.createDefaultOperationFolder(database, group_info.group_seq, group_info.member_seq)
      await GroupBoardListService.createDefaultGroupBoard(database, group_info.group_seq)
    }
  }
}

const TempService = new TempServiceClass()
export default TempService
