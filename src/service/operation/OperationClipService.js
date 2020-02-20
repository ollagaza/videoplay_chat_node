import DBMySQL from '../../database/knex-mysql'
import ServiceConfig from '../../service/service-config';
import Role from '../../constants/roles'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'

import { OperationClipModel } from '../../database/mongodb/OperationClip';

const OperationClipServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationClipServiceClass]'
  }

  createClip = async (operation_info, clip_info) => {
    return await OperationClipModel.createOperationClip(operation_info, clip_info);
  }

  createClipByList = async (operation_info, clip_seq_list) => {
    return await OperationClipModel.createOperationClipByList(operation_info, clip_seq_list);
  }

  updateClip = async (clip_id, clip_info, tag_list = null) => {
    return await OperationClipModel.updateOperationClip(clip_id, clip_info, tag_list);
  }

  deleteById = async (clip_id) => {
    return await OperationClipModel.deleteById(clip_id);
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

  createPhase = async (operation_info, phase_desc) => {
    return await OperationClipModel.createPhase(operation_info, phase_desc)
  }

  updatePhase = async (phase_id, phase_desc) => {
    return await OperationClipModel.updatePhase(phase_id, phase_desc)
  }

  deletePhase = async (operation_seq, phase_id) => {
    return await OperationClipModel.deletePhase(operation_seq, phase_id)
  }

  setPhase = async (phase_id, clip_id_list) => {
    return await OperationClipModel.setPhase(phase_id, clip_id_list)
  }

  unsetPhase = async (operation_seq, phase_id) => {
    return await OperationClipModel.unsetPhase(operation_seq, phase_id)
  }

  unsetPhaseOne = async (clip_id, operation_seq, phase_id) => {
    return await OperationClipModel.unsetPhaseOne(clip_id, operation_seq, phase_id)
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
