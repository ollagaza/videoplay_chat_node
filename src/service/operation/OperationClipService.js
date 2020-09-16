import DBMySQL from '../../database/knex-mysql'
import Util from '../../utils/baseutil'
import log from '../../libs/logger'

import { OperationClipModel } from '../../database/mongodb/OperationClip'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'

const OperationClipServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationClipService]'
  }

  updateClipCount = async (operation_info, clip_count) => {
    try {
      clip_count = Util.parseInt(clip_count, 0)
      await new OperationStorageModel(DBMySQL).updateClipCount(operation_info.storage_seq, clip_count)
    } catch (error) {
      log.error(this.log_prefix, '[updateClipCount]', error)
    }
  }

  createClip = async (operation_info, request_body) => {
    const clip_info = request_body.clip_info
    const clip_count = request_body.clip_count
    const create_result = await OperationClipModel.createOperationClip(operation_info, clip_info)

    await this.updateClipCount(operation_info, clip_count)

    return create_result
  }

  updateClip = async (clip_id, clip_info, tag_list = null) => {
    return await OperationClipModel.updateOperationClip(clip_id, clip_info, tag_list)
  }

  deleteById = async (clip_id, operation_info, request_body) => {
    const delete_result = await OperationClipModel.deleteById(clip_id)

    const clip_count = request_body.clip_count
    await this.updateClipCount(operation_info, clip_count)

    if (request_body.remove_phase === true) {
      await this.deletePhase(operation_info.seq, request_body.phase_id)
    }

    return delete_result
  }

  findByOperationSeq = async (operation_seq) => {
    return await OperationClipModel.findByOperationSeq(operation_seq, '-member_seq -content_id -operation_seq')
  }

  findByMemberSeq = async (member_seq) => {
    return await OperationClipModel.findByMemberSeq(member_seq)
  }

  findByGroupSeq = async (group_seq) => {
    return await OperationClipModel.findByGroupSeq(group_seq)
  }

  createPhase = async (operation_info, request_body) => {
    const phase_info = await OperationClipModel.createPhase(operation_info, request_body.phase_desc)
    const phase_id = phase_info._id
    await this.setPhase(phase_id, request_body)
    return {
      phase_info,
      phase_id
    }
  }

  updatePhase = async (phase_id, phase_desc) => {
    return await OperationClipModel.updatePhase(phase_id, phase_desc)
  }

  deletePhase = async (operation_seq, phase_id) => {
    const delete_result = await OperationClipModel.deletePhase(operation_seq, phase_id)
    await this.unsetPhase(operation_seq, phase_id)
    return delete_result
  }

  setPhase = async (phase_id, request_body) => {
    const clip_id_list = request_body.clip_id_list
    return await OperationClipModel.setPhase(phase_id, clip_id_list)
  }

  unsetPhase = async (operation_seq, phase_id) => {
    return await OperationClipModel.unsetPhase(operation_seq, phase_id)
  }

  unsetPhaseOne = async (operation_seq, phase_id, request_body) => {
    const clip_id = request_body.clip_id

    const result = await OperationClipModel.unsetPhaseOne(clip_id, operation_seq, phase_id)

    if (request_body.remove_phase === true) {
      await this.deletePhase(operation_seq, phase_id)
    }
    return result
  }

  migrationGroupSeq = async (member_seq, group_seq) => {
    await OperationClipModel.migrationGroupSeq(member_seq, group_seq)
  }

  migrationGroupSeqByOperation = async (operation_seq, group_seq) => {
    await OperationClipModel.migrationGroupSeqByOperation(operation_seq, group_seq)
  }
}

const operation_clip_service = new OperationClipServiceClass()
export default operation_clip_service
