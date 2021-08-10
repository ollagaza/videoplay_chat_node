import _ from 'lodash'
import querystring from 'querystring'
import ServiceConfig from '../../service/service-config'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import OperationService from '../operation/OperationService'
import OperationMediaService from '../operation/OperationMediaService'
import GroupService from '../group/GroupService'
import { VideoIndexInfoModel } from '../../database/mongodb/VideoIndex'
import Constants from '../../constants/constants'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import IndexInfo from '../../wrapper/xml/IndexInfo'
import CloudFileService from '../cloud/CloudFileService'
import OperationFolderService from "../operation/OperationFolderService";
import GroupAlarmService from '../group/GroupAlarmService'

const SyncServiceClass = class {
  constructor () {
    this.log_prefix = '[SyncService]'
  }

  getOperationInfoBySeq = async (operation_seq) => {
    const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(1, '수술정보가 존재하지 않습니다.', 400)
    }
    return operation_info
  }

  onAnalysisCompleteBySeq = async (operation_seq) => {
    const operation_info = this.getOperationInfoBySeq(operation_seq)
    await this.onAnalysisComplete(operation_info)
  }

  onAnalysisComplete = async (operation_info, log_id) => {
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(1, '수술정보가 존재하지 않습니다.', 400, { log_id })
    }
    const operation_seq = operation_info.seq
    const group_seq = operation_info.group_seq
    const member_seq = operation_info.member_seq
    const content_id = operation_info.content_id
    const log_info = `[log_id: ${log_id}, operation_seq: ${operation_seq}, content_id: ${content_id}, is_vacs: ${ServiceConfig.isVacs()}]`
    log.debug(this.log_prefix, '[onAnalysisComplete]', log_info, `start`)

    const operation_media_info = await OperationMediaService.getOperationMediaInfo(DBMySQL, operation_info)
    const is_sync_complete = operation_media_info.is_trans_complete

    if (!is_sync_complete) {
      log.debug(this.log_prefix, '[onAnalysisComplete]', log_info, `sync is not complete [analysis: ${operation_info.is_analysis_complete}, trans: ${operation_media_info.is_trans_complete}]. process end`)
      return
    }

    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    await Util.createDirectory(directory_info.video)
    const trans_video_file_path = directory_info.origin + operation_media_info.video_file_name
    const media_result = await Util.getMediaInfo(trans_video_file_path)
    if (!media_result.success || media_result.media_type !== Constants.VIDEO) {
      throw new StdObject(-1, '동영상 파일이 아닙니다.', 400)
    }
    const media_info = media_result.media_info
    let index_info_list = []
    index_info_list = await this.getIndexInfoByMedia(trans_video_file_path, operation_info, media_info, log_info)
    log.debug(this.log_prefix, '[onAnalysisComplete]', log_info, 'getIndexInfoByMedia complete', index_info_list.length)

    const video_index_info = await VideoIndexInfoModel.findOneByOperation(operation_seq)
    if (video_index_info) {
      await VideoIndexInfoModel.updateIndexListByOperation(operation_seq, index_info_list)
    } else {
      await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info, index_info_list)
    }
    log.debug(this.log_prefix, '[onAnalysisComplete]', log_info, 'createVideoIndexInfoByOperation complete')

    const trans_file_regex = /^trans_([\w_-]+)\.mp4$/i
    let origin_video_size = 0
    let origin_video_count = 0
    let trans_video_size = 0
    let trans_video_count = 0
    let stream_url = null
    const move_file_list = []
    const adaptive_list = []
    const video_file_list = await Util.getDirectoryFileList(directory_info.origin)
    for (let i = 0; i < video_file_list.length; i++) {
      const video_file = video_file_list[i]
      if (video_file.isFile()) {
        const file_name = video_file.name
        const file_size = await Util.getFileSize(directory_info.origin + file_name)
        const matches = file_name.match(trans_file_regex)
        if (matches) {
          if (file_name === operation_media_info.video_file_name) {
            origin_video_size += file_size
            origin_video_count++
          } else {
            trans_video_size += file_size
            trans_video_count++
          }
          adaptive_list.push(matches[1])
          move_file_list.push({
            target: directory_info.origin + file_name,
            dest: directory_info.video + file_name,
          })
        } else if (file_name === operation_media_info.smil_file_name) {
          move_file_list.push({
            target: directory_info.origin + file_name,
            dest: directory_info.video + file_name,
          })
        }
      }
    }
    if (adaptive_list.length > 0) {
      if (adaptive_list.length === 1) {
        stream_url = `Trans_${adaptive_list[0]}.mp4`
      } else {
        stream_url = `Trans_,${adaptive_list.join(',')},.mp4.smil`
      }
    }
    log.debug(this.log_prefix, '[onAnalysisComplete]', log_info, 'check and mode video files', `origin_video_size: ${origin_video_size}, origin_video_count: ${origin_video_count}, trans_video_size: ${trans_video_size}, trans_video_count: ${trans_video_count}`)

    let operation_storage_model = new OperationStorageModel(DBMySQL)
    const operation_storage_info = await operation_storage_model.getOperationStorageInfo(operation_info)
    const storage_seq = operation_storage_info.seq

    let is_complete = false
    let analysis_status = null
    await DBMySQL.transaction(async (transaction) => {
      if (stream_url) {
        await OperationMediaService.updateStreamUrl(transaction, operation_info, stream_url)
      }
      operation_info.storage_seq = storage_seq

      const update_storage_info = {}
      update_storage_info.origin_video_size = origin_video_size
      update_storage_info.origin_video_count = origin_video_count
      update_storage_info.trans_video_size = trans_video_size
      update_storage_info.trans_video_count = trans_video_count
      update_storage_info.index2_file_size = 0
      update_storage_info.index2_file_count = index_info_list.length

      operation_storage_model = new OperationStorageModel(DBMySQL)
      await operation_storage_model.updateStorageInfo(storage_seq, update_storage_info)
      await operation_storage_model.updateStorageSummary(storage_seq)

      analysis_status = ServiceConfig.isVacs() ? 'Y' : 'M'
      await OperationService.updateAnalysisStatus(transaction, operation_info, analysis_status)
      log.debug(this.log_prefix, '[onAnalysisComplete]', log_info, `sync complete`)

      await GroupService.updateMemberUsedStorage(transaction, group_seq, member_seq)
      await OperationFolderService.onChangeFolderSize(operation_info.group_seq, operation_info.folder_seq)

      is_complete = true
    })

    if (is_sync_complete) {
      // await new BatchOperationQueueModel(DBMySQL).onJobComplete(operation_seq);
    }

    if (is_complete) {
      for (let i = 0; i < move_file_list.length; i++) {
        const move_file_info = move_file_list[i]
        await Util.renameFile(move_file_info.target, move_file_info.dest)
      }
      if (ServiceConfig.isVacs()) {
        // vacs에서는 원본 보존
        // await Util.deleteDirectory(directory_info.origin)
        await OperationService.updateStatus(null, [operation_seq], 'Y')
      } else {
        try {
          const request_result = await CloudFileService.requestMoveToObject(directory_info.media_video, true, operation_info.content_id, '/api/storage/operation/analysis/complete', { operation_seq, log_info })
          log.debug(this.log_prefix, '[onAnalysisComplete]', log_info, '[CloudFileService.requestMoveToObject] - video', `file_path: ${directory_info.media_video}`, request_result)
        } catch (error) {
          log.error(this.log_prefix, '[onAnalysisComplete]', log_info, '[CloudFileService.requestMoveToObject]', error)
        }
        this.moveOriginFileToArchive(directory_info.media_origin, operation_info.content_id, log_info)
      }
    }
    if (analysis_status === 'Y') {
      this.sendAnalysisCompleteMessage(operation_info)
    }

    log.debug(this.log_prefix, '[onAnalysisComplete]', log_info, `end`)
  }

  onOperationVideoFileCopyCompeteByRequest = async (response_data) => {
    if (!response_data || !response_data.operation_seq) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }
    const operation_seq = response_data.operation_seq
    const log_info = response_data.log_info
    const operation_info = await this.getOperationInfoBySeq(operation_seq)
    const status = response_data.is_success ? 'Y' : 'E'
    if (!response_data.is_success) {
      log.error(this.log_prefix, '[onOperationVideoFileCopyCompeteByRequest]', log_info, response_data)
    }
    await OperationService.updateAnalysisStatus(DBMySQL, operation_info, status)
    await OperationService.updateStatus(DBMySQL, [operation_seq], 'Y')

    if (status === 'Y') {
      await OperationService.updateOperationDataFileThumbnail(operation_info)
      this.sendAnalysisCompleteMessage(operation_info)
    }

    return true
  }

  moveOriginFileToArchive = (origin_directory, content_id, log_info) => {
    (
      async (origin_directory, content_id) => {
        try {
          const request_result = await CloudFileService.requestMoveToArchive(origin_directory, true, content_id)
          log.debug(this.log_prefix, '[moveOriginFileToArchive]', log_info, '[CloudFileService.moveOriginFileToArchive] - archive', `file_path: ${origin_directory}`, request_result)
        } catch (error) {
          log.error(this.log_prefix, '[moveOriginFileToArchive]', log_info, '[CloudFileService.moveOriginFileToArchive] - archive', `file_path: ${origin_directory}`, error)
        }
      }
    )(origin_directory, content_id, '[moveOriginFileToArchive]', log_info)
  }

  sendAnalysisCompleteMessage = (operation_info) => {
    if (!operation_info || !operation_info.user_id) return
    log.error(this.log_prefix, '[sendAnalysisCompleteMessage]', operation_info.toJSON());
    (
      async (operation_info) => {
        try {
          await this.sendMessageToSocket(operation_info)
        } catch (error) {
          log.error(this.log_prefix, '[sendAnalysisCompleteMessage]', error)
        }
      }
    )(operation_info)
  }

  sendMessageToSocket = async (operation_info) => {
    const socket_message = {}
    let alarm_message = null
    if (operation_info.mode === OperationService.MODE_FILE) {
      alarm_message = `'${operation_info.operation_name}'수술 이미지 업로드가 완료되었습니다.`;
      socket_message.title = '이미지 업로드가 완료되었습니다.';
      socket_message.message = `'${operation_info.operation_name}' 이미지 업로드가 완료되었습니다.<br/>결과를 확인하려면 클릭하세요.`;
    } else {
      if (operation_info.export_from_project) {
        alarm_message = `'${operation_info.operation_name}' 드라이브로 내보내기가 완료되었습니다.`;
        socket_message.title = '드라이브로 내보내기가 완료되었습니다.';
        socket_message.message = `'${operation_info.operation_name}' 드라이브로 내보내기가 완료되었습니다.<br/>결과를 확인하려면 클릭하세요.`;
      } else {
        alarm_message = `'${operation_info.operation_name}'수술 동영상 인코딩이 완료되었습니다.`;
        socket_message.title = '동영상 인코딩이 완료되었습니다.';
        socket_message.message = `'${operation_info.operation_name}' 동영상 인코딩이 완료되었습니다.<br/>결과를 확인하려면 클릭하세요.`;
      }
    }
    const alarm_data = {
      operation_seq: operation_info.seq
    }
    const socket_data = {
      operation_seq: operation_info.seq,
      folder_seq: operation_info.folder_seq,
      member_seq: operation_info.member_seq,
      message: socket_message.title,
      analysis_complete: true,
      reload_operation_list: true
    }
    GroupAlarmService.createOperationGroupAlarm(operation_info.group_seq, GroupAlarmService.ALARM_TYPE_OPERATION, alarm_message, operation_info, null, alarm_data, socket_message, socket_data, true)
  }

  getIndexInfoByMedia = async (video_file_path, operation_info, media_info, log_info) => {
    const total_frame = media_info.frame_count
    let total_second = media_info.duration
    if (ServiceConfig.get('use_media_info_millisecond') === 'Y') {
      total_second /= 1000
    }
    log.debug(this.log_prefix, '[getIndexInfoByMedia]', log_info, total_frame, ServiceConfig.get('use_media_info_millisecond'), media_info.duration, total_second, media_info)
    const fps = media_info.fps
    const step_second = Util.parseInt(ServiceConfig.get('index_thumbnail_delay'), 60)
    const index_file_list = []
    const url_prefix = ServiceConfig.get('static_storage_prefix')
    for (let second = 0; second < total_second; second += step_second) {
      const thumbnail_result = await OperationService.createOperationVideoThumbnail(video_file_path, operation_info, second, media_info)
      if (thumbnail_result) {
        let end_time = second + step_second
        let end_frame = end_time * fps
        if (end_frame >= total_frame) {
          end_time = total_second
          end_frame = total_frame
        }
        const index_info = {
          'thumbnail_url': url_prefix + thumbnail_result.path,
          'start_time': second,
          'end_time': end_time,
          'start_frame': second * fps,
          'end_frame': end_frame,
          'unique_id': thumbnail_result.file_id,
          'creator': 'system',
          'tags': []
        }
        index_file_list.push(new IndexInfo(index_info))
      }
    }

    return index_file_list
  }
}

const sync_service = new SyncServiceClass()
export default sync_service
