import ServiceConfig from '../../service/service-config'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import CloudFileService from '../cloud/CloudFileService'
import { VideoProjectField, VideoProjectModel } from '../../database/mongodb/VideoProject'
import StdObject from '../../wrapper/std-object'
import SequenceModel from '../../models/sequence/SequenceModel'
import Constants from '../../constants/constants'
import NaverObjectStorageService from '../storage/naver-object-storage-service'
import GroupService from '../group/GroupService'
import DBMySQL from '../../database/knex-mysql'
import VacsService from '../vacs/VacsService'
import MemberService from "../member/MemberService"
import OperationService from '../operation/OperationService'
import OperationFileService from '../operation/OperationFileService'
import TranscoderSyncService from '../sync/TranscoderSyncService'
import GroupSocketService from "../socket/GroupSocketService"
import AdminSocketService from "../socket/AdminSocketService"
import OperationModel from '../../database/mysql/operation/OperationModel'

const StudioServiceClass = class {
  constructor () {
    this.log_prefix = '[StudioService]'
    this.DOWNLOAD_SUFFIX = 'download/'
    this.TEMP_SUFFIX = 'temp/'
  }

  getVideoProjectList = async (group_seq) => {
    return await VideoProjectModel.findByGroupSeq(group_seq, '-sequence_list')
  }

  getVideoProjectInfo = async (project_seq) => {
    return await VideoProjectModel.findOneById(project_seq)
  }

  createVideoProject = async (group_member_info, member_info, request) => {
    const data = request.body

    const content_id = Util.getContentId()
    const media_root = ServiceConfig.getMediaRoot()
    const project_path = `${group_member_info.media_path}/studio/${content_id}`

    await Util.createDirectory(media_root + project_path)
    data.group_seq = group_member_info.group_seq
    data.member_seq = member_info.seq
    data.user_name = member_info.user_name
    data.user_nickname = member_info.user_nickname
    data.content_id = content_id
    data.project_path = project_path
    data.parent_directory = data.parent_directory || ''

    const fields = VideoProjectField()
    fields.group_seq.require = true
    fields.member_seq.require = true
    fields.content_id.require = true
    fields.project_name.require = true
    fields.project_path.require = true
    fields.total_time.require = true
    fields.sequence_list.require = true
    fields.operation_history_list.require = true
    fields.subtitle_list.require = true

    const payload = Util.getPayload(data, fields)

    return await VideoProjectModel.createVideoProject(payload)
  }

  modifyVideoProject = async (project_seq, request) => {
    const data = request.body
    data.sequence_count = data.sequence_list ? data.sequence_list.length : 0

    const fields = VideoProjectField()
    fields.project_name.require = true
    fields.sequence_list.require = true
    fields.operation_seq_list.require = true
    fields.sequence_list.require = true
    fields.operation_history_list.require = true
    fields.subtitle_list.require = true

    const payload = Util.getPayload(data, fields)

    return await VideoProjectModel.updateFromEditor(project_seq, payload)
  }

  updateFavorite = async (project_seq, is_favorite) => {
    return await VideoProjectModel.updateFavorite(project_seq, is_favorite)
  }

  updateStatus = async (request_body, group_seq, status) => {
    const project_seq_list = request_body.id_list
    return await VideoProjectModel.updateStatus(group_seq, project_seq_list, status)
  }

  updateStatusTrash = async (request_body, group_seq, is_trash) => {
    const project_seq_list = request_body.id_list
    return await VideoProjectModel.updateStatusTrash(group_seq, project_seq_list, is_trash ? 'T' : 'Y')
  }

  deleteVideoProject = async (group_seq, project_seq) => {
    const project_info = await VideoProjectModel.deleteById(group_seq, project_seq)
    this.deleteProjectFiles(project_info)
    return project_info
  }

  deleteProjectFiles = (project_info) => {
    (
      async (project_info) => {
        const media_root = ServiceConfig.getMediaRoot()
        const project_path = project_info.project_path
        try {
          await Util.deleteDirectory(media_root + project_path)
        } catch (error) {
          log.error(this.log_prefix, '[deleteProjectFiles]', 'Util.deleteDirectory', media_root + project_path, error)
        }

        if (ServiceConfig.isVacs() === false) {
          try {
            await CloudFileService.requestDeleteObjectFile(project_path, true)
          } catch (error) {
            log.error(this.log_prefix, '[deleteProjectFiles]', 'CloudFileService.requestDeleteObjectFile', project_path, error)
          }
        }
        if (ServiceConfig.isVacs()) {
          VacsService.updateStorageInfo()
        }
      }
    )(project_info)
  }

  uploadImage = async (project_seq, request, response) => {
    const video_project_info = await this.getVideoProjectInfo(project_seq)
    const media_root = ServiceConfig.getMediaRoot()
    const upload_path = video_project_info.project_path + '/image/'
    const upload_full_path = media_root + upload_path
    if (!(await Util.fileExists(upload_full_path))) {
      await Util.createDirectory(upload_full_path)
    }

    const image_file_name = Util.getRandomId()
    await Util.uploadByRequest(request, response, 'image', upload_full_path, image_file_name, true)
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
    }
    return ServiceConfig.get('static_storage_prefix') + upload_path + image_file_name
  }

  makeProjectVideo = async (group_member_info, member_info, project_seq, extra_data = null) => {
    const video_project_info = await this.getVideoProjectInfo(project_seq)
    if (!video_project_info || !video_project_info.sequence_list || video_project_info.sequence_list.length <= 0) {
      throw new StdObject(901, '등록된 동영상 정보가 없습니다.', 400)
    }
    if (video_project_info.request_status !== 'N' && video_project_info.request_status !== 'Y') {
      throw new StdObject(902, '이전 편집영상의 내보내기가 진행중입니다.\n완료후 다음 내보내기를 진행할 수 있습니다.', 400)
    }
    if (extra_data && extra_data.export_to_drive === true) {
      const operation_info = await this.createOperationInfo(video_project_info, member_info, group_member_info, extra_data)
      extra_data.operation_seq = operation_info.seq
      extra_data.operation_name = operation_info.operation_name
    }
    if (ServiceConfig.isVacs()) {
      this.requestMakeProject(video_project_info, extra_data)
    } else {
      this.requestDownloadVideoFiles(group_member_info, video_project_info, extra_data)
    }
    const update_result = await VideoProjectModel.updateRequestStatus(project_seq, 'R')
    return update_result && update_result._id && update_result._id > 0
  }

  requestDownloadVideoFiles = (group_member_info, video_project_info, extra_data = null) => {
    (
      async () => {
        const project_seq = video_project_info._id
        try {
          const media_root = ServiceConfig.getMediaRoot()
          const operation_origin_path = video_project_info.project_path + '/' + this.DOWNLOAD_SUFFIX
          const download_directory = media_root + operation_origin_path
          if (!(await Util.fileExists(download_directory))) {
            await Util.createDirectory(download_directory)
          }

          log.debug(this.log_prefix, '[requestDownloadVideoFiles]', project_seq)
          const sequence_list = video_project_info.sequence_list
          const download_file_info_list = []
          const operation_model = new OperationModel(DBMySQL)
          for (let i = 0; i < sequence_list.length; i++) {
            const sequence_model = new SequenceModel().init(sequence_list[i])
            if (sequence_model.type === Constants.VIDEO) {
              const operation_seq = sequence_model.getOperationSeq()
              const operation_info = await operation_model.getOperationInfo(operation_seq, true)
              // log.debug(this.log_prefix, operation_info.toJ)
              const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
              const video_file_name = operation_info.media_info.video_file_name
              let origin_file_name
              if (operation_info.origin_seq) {
                origin_file_name = directory_info.media_video_origin + video_file_name
              } else {
                origin_file_name = directory_info.media_video + video_file_name
              }
              // const video_name = sequence_model.getVideoName()
              // log.debug(this.log_prefix, '[requestDownloadVideoFiles]', `video_name: ${video_name}`)
              // const content_directory = Util.getDirectoryName(video_name)
              // const video_file_name = Util.getFileName(video_name)
              log.debug(this.log_prefix, '[requestDownloadVideoFiles]', `origin_file_name: ${origin_file_name}, download_file_name: ${video_file_name}, directory: ${download_directory + video_file_name}`)
              download_file_info_list.push(
                {
                  'origin_file_name': origin_file_name,
                  'remote_file_name': video_file_name,
                }
              )
            }
          }
          log.debug(this.log_prefix, '[requestDownloadVideoFiles]', project_seq, 'download_file_info_list', download_file_info_list)
          const response_url = '/api/storage/studio/download/complete'
          const response_data = {
            project_seq: video_project_info._id,
            extra_data
          }
          if (download_file_info_list.length > 0) {
            await CloudFileService.requestDownloadObjectByList(operation_origin_path, '', download_file_info_list, false, video_project_info.content_id, response_url, response_data)
          } else {
            response_data.is_success = true
            await this.onDownloadComplete(response_data)
          }
        } catch (error) {
          log.error(this.log_prefix, '[requestDownloadVideoFiles]', project_seq, error)
        }
      }
    )()
  }

  onDownloadComplete = async (response_data) => {
    log.debug(this.log_prefix, '[onDownloadComplete]', response_data)
    if (!response_data || !response_data.project_seq) {
      throw new StdObject(911, '잘못된 요청입니다.', 400, { response_data })
    }
    if (!response_data.is_success) {
      await VideoProjectModel.updateRequestStatus(response_data.project_seq, 'E', 0)
      throw new StdObject(912, '원본 동영상파일 다운로드에 실패하였습니다.', 400, { response_data })
    }
    const video_project_info = await this.getVideoProjectInfo(response_data.project_seq)
    if (!video_project_info || !video_project_info.sequence_list || video_project_info.sequence_list.length <= 0) {
      throw new StdObject(913, '등록된 동영상 정보가 없습니다.', 400)
    }
    this.requestMakeProject(video_project_info, response_data.extra_data)
    return true
  }

  requestMakeProject = (video_project_info, extra_data = null) => {
    (
      async () => {
        try {
          if (!video_project_info || !video_project_info._id) {
            log.error(this.log_prefix, '[requestMakeProject]', 'video_project_info is empty', video_project_info)
            return false
          }
          const project_path = video_project_info.project_path + '/'
          const directory = ServiceConfig.getMediaRoot() + project_path
          const editor_server_directory = ServiceConfig.get('auto_editor_file_root') + project_path
          const editor_server_download_directory = editor_server_directory + this.DOWNLOAD_SUFFIX
          let editor_server_group_video_directory = null
          if (ServiceConfig.isVacs()) {
            const group_info = await GroupService.getGroupInfo(DBMySQL, video_project_info.group_seq)
            editor_server_group_video_directory = ServiceConfig.get('auto_editor_file_root') + group_info.media_path + '/operation/'
          }
          const temp_directory = directory + this.TEMP_SUFFIX
          await Util.deleteDirectory(temp_directory)
          await Util.createDirectory(temp_directory)
          log.debug(this.log_prefix, '[requestMakeProject]', `directory: ${directory}, editor_server_directory: ${editor_server_directory}, editor_server_download_directory: ${editor_server_download_directory}`)

          const scale = 1
          const sequence_list = video_project_info.sequence_list
          const sequence_model_list = []
          const options = {
            file_path: directory,
            editor_server_directory: editor_server_directory,
            editor_server_download_directory: editor_server_download_directory,
            editor_server_group_video_directory: editor_server_group_video_directory,
            temp_suffix: this.TEMP_SUFFIX,
            is_vacs: ServiceConfig.isVacs()
          }
          for (let i = 0; i < sequence_list.length; i++) {
            const sequence_model = new SequenceModel().init(sequence_list[i])
            if (sequence_model.type) {
              sequence_model_list.push(await sequence_model.getXmlJson(i, scale, options))
            }
          }
          const subtitle_sequence_list = video_project_info.subtitle_list
          const subtitle_sequence_model_list = []
          for (let i = 0; i < subtitle_sequence_list.length; i++) {
            const sequence_model = new SequenceModel().init(subtitle_sequence_list[i])
            if (sequence_model.type) {
              subtitle_sequence_model_list.push(await sequence_model.getXmlJson(i, scale, options))
            }
          }

          const video_xml_json = {
            'VideoInfo': {
              'MediaInfo': {
                'ContentId': video_project_info.content_id,
                'Width': 1920 * scale,
                'Height': 1080 * scale,
              },
              'SequenceList': {
                'Sequence': sequence_model_list
              },
              'SubtitleList': {
                'Sequence': subtitle_sequence_model_list
              }
            }
          }
          const file_name = 'video_project.xml'
          await Util.writeXmlFile(directory, file_name, video_xml_json)

          const group_info = await GroupService.getGroupInfo(DBMySQL, video_project_info.group_seq)
          const member_info = await MemberService.getMemberInfo(DBMySQL, video_project_info.member_seq)

          const query_data = {
            project_seq: video_project_info._id,
            ContentID: video_project_info.content_id,
            project_name: video_project_info.project_name,
            group_seq: video_project_info.group_seq,
            group_name: group_info.group_name,
            member_seq: video_project_info.member_seq,
            user_name: video_project_info.user_name,
            user_id: member_info.user_id,
            create_date: Util.dateFormat(video_project_info.created_date),
            OutputPath: editor_server_directory,
            XmlFilePath: editor_server_directory + file_name,
            host_data: {
              host: ServiceConfig.get('api_server_domain'),
              port: ServiceConfig.get('api_server_port'),
              path: '/api/v1/project/video/make/process'
            },
            extra_data
          }

          const request_options = {
            hostname: ServiceConfig.get('auto_editor_server_domain'),
            port: ServiceConfig.get('auto_editor_server_port'),
            path: ServiceConfig.get('auto_editor_merge_api'),
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          }

          const api_url = 'http://' + ServiceConfig.get('auto_editor_server_domain') + ':' + ServiceConfig.get('auto_editor_server_port') + ServiceConfig.get('auto_editor_merge_api')
          log.debug(this.log_prefix, '[requestMakeProject]', 'request - start', api_url, query_data)

          let api_request_result = null
          let is_request_success = false
          try {
            api_request_result = await Util.httpRequest(request_options, JSON.stringify(query_data), false)
            try {
              api_request_result = JSON.parse(api_request_result)
              is_request_success = api_request_result && api_request_result.error === 0
              log.debug(this.log_prefix, '[requestMakeProject]', 'request - result', is_request_success, api_url, api_request_result)
            } catch (error) {
              is_request_success = false
              log.error(this.log_prefix, '[requestMakeProject]', 'request error', api_request_result)
            }
          } catch (error) {
            log.error(this.log_prefix, '[requestMakeProject]', 'request error', error)
          }
          return is_request_success
        } catch (error) {
          log.error(this.log_prefix, '[requestMakeProject]', 'video_project_info', video_project_info)
          return false
        }
      }
    )()
  }

  updateMakeProcess = async (request) => {
    const request_body = request ? request.body : null
    if (!request_body) {
      throw new StdObject(921, '잘못된 접근입니다', 400)
    }
    log.debug('updateMakeProcess', request_body.Status)
    const content_id = request_body.ContentID
    const process_info = {
      status: request_body.Status,
      video_file_name: request_body.VideoFileName,
      smil_file_name: request_body.SmilFileName,
      progress: request_body.Progress,
      extra_data: request_body.extra_data
    }
    if (Util.isEmpty(process_info.status)) {
      throw new StdObject(922, '잘못된 파라미터', 400)
    }
    const is_admin_page = request_body.extra_data && request_body.extra_data.is_admin_page === true
    let video_project = null
    let is_success = false

    video_project = await VideoProjectModel.findOneByContentId(content_id)
    if (Util.isEmpty(video_project)) {
      throw new StdObject(923, '프로젝트 정보를 찾을 수 없습니다.', 400)
    }

    if (process_info.status === 'start') {
      return this.onMakeStart(video_project, content_id, process_info, is_admin_page)
    } else if (process_info.status === 'process') {
      return this.onMakeProgress(video_project, process_info, is_admin_page)
    } else if (process_info.status === 'complete') {
      this.onMakeComplete(video_project, content_id, process_info, is_admin_page)
      return 'ok'
    } else if (process_info.status === 'error') {
      log.debug('project error')
      const result = await VideoProjectModel.updateRequestStatusByContentId(content_id, 'E')

      if (result && result.ok === 1) {
        log.debug('project error', result.ok)
        const message_info = {
          message: `'${video_project.project_name}' 비디오 제작중 오류가 발생하였습니다.`
        }
        const socket_extra_data = {
          project_seq: video_project._id,
          reload_studio_page: true,
        }
        log.debug('project error', message_info, socket_extra_data)
        if (is_admin_page) {
          await AdminSocketService.onGeneralAdminNotice('studioInfoChange', null, 'videoMakeError', message_info, socket_extra_data)
        } else {
          await GroupSocketService.onGeneralGroupNotice(video_project.group_seq, 'studioInfoChange', null, 'videoMakeError', message_info, socket_extra_data)
        }
      }
      is_success = false
    } else {
      throw new StdObject(925, '잘못된 상태 값', 400)
    }
    return is_success
  }

  onMakeStart = async (video_project, content_id, process_info, is_admin_page) => {
    let update_result = false
    log.debug('[onMakeStart]', video_project._id)
    try {
      const result = await VideoProjectModel.updateRequestStatusByContentId(content_id, 'S', 0)
      if (result && result.ok === 1) {
        const extra_data = process_info.extra_data ? process_info.extra_data : {}
        const operation_seq = Util.parseInt(extra_data.operation_seq, 0)
        const export_to_drive = extra_data.export_to_drive === true && operation_seq !== 0
        const video_name = export_to_drive && Util.trim(extra_data.operation_name) ? Util.trim(extra_data.operation_name) : video_project.project_name;
        const message_info = {
          message: `'${video_name}'비디오 제작이 시작되었습니다.`,
        }
        if (export_to_drive) {
          message_info.message = `드라이브로 내보내기가 시작되었습니다.<br/>제목: '${video_name}'`
        }
        const socket_extra_data = {
          project_seq: video_project._id,
          reload_studio_page: true,
        }
        if (is_admin_page) {
          await AdminSocketService.onGeneralAdminNotice('studioInfoChange', null, 'videoMakeStart', message_info, socket_extra_data)
        } else {
          await GroupSocketService.onGeneralGroupNotice(video_project.group_seq, 'studioInfoChange', null, 'videoMakeStart', message_info, socket_extra_data)
        }
        update_result = true
      } else {
        log.error(this.log_prefix, '[onMakeStart]', 'VideoProjectModel.updateRequestStatusByContentId', `status: ${process_info.status}`, result)
      }
    } catch (error) {
      log.error('[onMakeStart]', video_project._id, process_info.status)
    }

    return update_result
  }

  onMakeProgress = async (video_project, process_info, is_admin_page) => {
    log.debug('[onMakeProgress]', video_project._id, process_info.progress)
    let update_result = false
    try {
      const extra_data = {
        project_seq: video_project._id,
        reload_studio_page: false,
        progress: process_info.progress
      }
      if (is_admin_page) {
        await AdminSocketService.onGeneralAdminNotice(video_project.group_seq, 'studioInfoChange', null, 'videoMakeProcess', null, extra_data)
      } else {
        await GroupSocketService.onGeneralGroupNotice(video_project.group_seq, 'studioInfoChange', null, 'videoMakeProcess', null, extra_data)
      }
      update_result = true
    } catch (error) {
      log.error('[onMakeProgress]', video_project._id, process_info.status, process_info.progress)
    }

    return update_result
  }

  onMakeComplete = (video_project, content_id, process_info, is_admin_page) => {
    const project_seq = video_project._id;
    (
      async () => {
        try {
          log.debug(this.log_prefix, '[onMakeComplete]', 'project complete', project_seq)
          let update_result = false
          if (Util.isEmpty(process_info.video_file_name) || Util.isEmpty(process_info.smil_file_name)) {
            throw new StdObject(931, '결과파일 이름 누락', 400)
          }
          const project_path = video_project.project_path + '/'
          const video_directory = ServiceConfig.getMediaRoot() + project_path
          const video_file_path = video_directory + process_info.video_file_name
          const extra_data = process_info.extra_data
          const operation_seq = extra_data ? Util.parseInt(extra_data.operation_seq, 0) : 0
          const export_to_drive = extra_data && extra_data.export_to_drive === true && operation_seq !== 0

          if (!(await Util.fileExists(video_file_path))) {
            await VideoProjectModel.updateRequestStatus(project_seq, 'E', 100)
            throw new StdObject(932, '동영상 파일이 없습니다.', 400)
          }
          video_project.video_file_name = process_info.video_file_name

          const video_file_size = await Util.getFileSize(video_file_path)
          if (export_to_drive) {
            const operation_info = (await OperationService.getOperationInfoNoAuth(DBMySQL, operation_seq, false)).operation_info
            const operation_origin_path = OperationService.getOperationDirectoryInfo(operation_info).origin
            const video_file_name = 'Trans_studio.mp4'
            await this.exportVideoLocal(video_project, operation_info, operation_origin_path, video_file_name)
          } else {
            if (ServiceConfig.isVacs() === false) {
              await NaverObjectStorageService.moveFile(video_file_path, video_project.project_path, process_info.video_file_name)
            }
          }

          await Util.deleteFile(video_directory + process_info.smil_file_name)
          await Util.deleteFile(video_directory + process_info.video_file_name + '.flt')
          await Util.deleteFile(video_directory + process_info.video_file_name + '_audio.flt')
          await Util.deleteFile(video_directory + 'video_project.xml')
          await Util.deleteDirectory(video_directory + this.TEMP_SUFFIX)
          await Util.deleteDirectory(video_directory + this.DOWNLOAD_SUFFIX)

          let request_status = 'Y'
          if (export_to_drive) {
            await Util.deleteFile(video_directory + process_info.video_file_name)
            process_info.download_url = null
            process_info.stream_url = null
            process_info.total_size = 0
            process_info.video_file_size = 0
            request_status = 'N'
          } else {
            const directory_file_size = await Util.getDirectoryFileSize(video_directory)
            if (ServiceConfig.isVacs()) {
              process_info.download_url = ServiceConfig.get('static_storage_prefix') + project_path + process_info.video_file_name
              process_info.stream_url = ServiceConfig.get('static_storage_prefix') + project_path + process_info.video_file_name
              process_info.total_size = directory_file_size
            } else {
              process_info.download_url = ServiceConfig.get('static_cloud_prefix') + project_path + process_info.video_file_name
              process_info.stream_url = ServiceConfig.get('hls_streaming_url') + project_path + process_info.video_file_name + '/master.m3u8'
              process_info.total_size = directory_file_size + video_file_size
            }
            process_info.video_file_size = video_file_size
          }

          const result = await VideoProjectModel.updateRequestStatusByContentId(content_id, request_status, 100, process_info)
          if (result && result.ok === 1) {
            update_result = true
          } else {
            log.error(this.log_prefix, '[updateMakeProcess]', 'update final', project_seq, process_info, result)
          }

          if (update_result) {
            const message_info = {}
            if (!export_to_drive) {
              message_info.message = `'${video_project.project_name}'비디오 제작이 완료되었습니다.<br/>결과를 확인하려면 클릭하세요.`
            }
            const extra_data = {
              project_seq: video_project._id,
              reload_studio_page: true
            }
            if (is_admin_page) {
              await AdminSocketService.onGeneralAdminNotice('studioInfoChange', 'moveVideoEditor', 'videoMakeComplete', message_info, extra_data)
            } else {
              await GroupSocketService.onGeneralGroupNotice(video_project.group_seq, 'studioInfoChange', 'moveVideoEditor', 'videoMakeComplete', message_info, extra_data)
            }
            if (ServiceConfig.isVacs()) {
              VacsService.updateStorageInfo()
            }
          }
        } catch (error) {
          log.error(this.log_prefix, '[updateMakeProcess]', project_seq, process_info, error)
        }
      }
    )()
  }

  migrationGroupSeq = async (member_seq, group_seq) => {
    await VideoProjectModel.migrationGroupSeq(member_seq, group_seq)
  }

  getProjectList = async (page_navigation, field_order, search_keyword, search_option) => {
    const video_project_count = await VideoProjectModel.getProjectTotalCount(search_keyword, search_option)
    page_navigation.list_count = Util.parseInt(page_navigation.list_count)
    page_navigation.cur_page = Util.parseInt(page_navigation.cur_page)
    page_navigation.total_count = video_project_count;
    const sort = JSON.parse(`{ "${field_order.name}": ${field_order.direction === 'desc' ? -1 : 1} }`)
    const video_project_list = await VideoProjectModel.getAdmin_projectList(page_navigation, sort, search_keyword, search_option)

    for (let cnt = 0; cnt < video_project_list.length; cnt++) {
      try {
        const group_info = await GroupService.getGroupInfo(DBMySQL, video_project_list[cnt].group_seq)
        video_project_list[cnt]._doc.group_name = group_info.group_name
      } catch (e) {
        video_project_list[cnt]._doc.group_name = '알수없는 그룹'
      }

      try {
        const member_info = await MemberService.getMemberInfo(DBMySQL, video_project_list[cnt].member_seq)
        video_project_list[cnt]._doc.user_id = member_info.user_id
      } catch (e) {
        video_project_list[cnt]._doc.user_id = '알수없는 멤버'
      }
    }

    return { video_project_list, page_navigation }
  }

  exportToDrive = async (project_seq, member_info, group_member_info) => {
    const video_project_info = await this.getVideoProjectInfo(project_seq)
    if (!video_project_info) {
      throw new StdObject(941, '프로젝트 정보를 찾을 수 없습니다.', 400)
    }
    if (video_project_info.request_status !== 'Y') {
      throw new StdObject(942, '제작이 완료된 동영상만 내보낼 수 있습니다.', 400)
    }

    const operation_info = await this.createOperationInfo(video_project_info, member_info, group_member_info)
    const operation_seq = operation_info.seq
    const operation_origin_path = OperationService.getOperationDirectoryInfo(operation_info).origin
    const video_file_name = 'Trans_studio.mp4'

    log.debug(this.log_prefix, '[exportToDrive]', 'operation_seq:', operation_seq, 'operation_info:', operation_info.toJSON())
    this.onStartExportVideo(video_project_info, operation_info, operation_origin_path, video_file_name)
  }

  onStartExportVideo = (video_project_info, operation_info, operation_origin_path, video_file_name) => {
    (
      async () => {
        try {
          if (ServiceConfig.isVacs()) {
            await this.exportVideoLocal(video_project_info, operation_info, operation_origin_path, video_file_name)
          } else {
            await this.exportVideoCloud(video_project_info, operation_info, operation_origin_path, video_file_name)
          }
        } catch (error) {

        }
      }
    )()
  }

  createOperationInfo = async (video_project_info, member_info, group_member_info, extra_data) => {
    const current_date = Util.currentFormattedDate('yyyy-mm-dd HH:MM:ss')
    const operation_name = extra_data && Util.trim(extra_data.operation_name) ? Util.trim(extra_data.operation_name) : video_project_info.project_name
    const operation_code = 'export_' + video_project_info._id + '_' + Util.currentFormattedDate('yyyymmddHHMMss')
    const operation_date = current_date.substr(0, 10)
    const hour = current_date.substr(11, 2)
    const minute = current_date.substr(14, 2)
    const create_operation_info = {
      operation_code: operation_code,
      operation_name: operation_name,
      operation_date: operation_date,
      hour: hour,
      minute: minute,
      folder_seq: null,
      analysis_status: 'R'
    }
    if (extra_data) {
      if (Util.trim(extra_data.operation_name)) {
        create_operation_info.operation_name = Util.trim(extra_data.operation_name)
      }
      if (Util.parseInt(extra_data.folder_seq, 0) > 0) {
        create_operation_info.folder_seq = Util.parseInt(extra_data.folder_seq, 0)
      }
    }

    const operation_body = {
      operation_info: create_operation_info,
      meta_data: {}
    }

    let operation_info = null
    try {
      const create_operation_result = await OperationService.createOperation(DBMySQL, member_info, group_member_info, operation_body, 'Y', true)
      const operation_seq = create_operation_result.get('operation_seq')
      operation_info = (await OperationService.getOperationInfoNoAuth(DBMySQL, operation_seq, false)).operation_info
    } catch (error) {
      log.error(this.log_prefix, '[exportToDrive]', 'create operation error', operation_body, error)
      throw new StdObject(943, '수술정보를 생성할 수 없습니다.', 400)
    }
    return operation_info
  }

  exportVideoLocal = async (video_project_info, operation_info, operation_origin_path, video_file_name) => {
    const project_path = video_project_info.project_path + '/'
    const video_directory = ServiceConfig.getMediaRoot() + project_path
    const video_file_path = video_directory + video_project_info.video_file_name
    const down_video_file_path = operation_origin_path + video_file_name
    await Util.copyFile(video_file_path, down_video_file_path)
    await this.onExportVideoDownloadComplete(operation_info, down_video_file_path, operation_origin_path, video_file_name)
  }

  exportVideoCloud = async (video_project_info, operation_info, operation_origin_path, video_file_name) => {
    const project_path = video_project_info.project_path
    const down_video_file_path = operation_origin_path + video_file_name
    await NaverObjectStorageService.downloadFile(project_path, video_project_info.video_file_name, operation_origin_path, video_file_name)
    await this.onExportVideoDownloadComplete(operation_info, down_video_file_path, operation_origin_path, video_file_name)
  }

  onExportVideoDownloadComplete = async (operation_info, down_video_file_path, operation_origin_path, file_name) => {
    const video_file_stat = await Util.getFileStat(down_video_file_path)
    const video_file_info = {
      size: video_file_stat.size,
      new_file_name: file_name,
      originalname: file_name,
      path: down_video_file_path
    }
    await OperationFileService.createVideoFileInfo(DBMySQL, operation_info, video_file_info)
    await TranscoderSyncService.updateTranscodingComplete(operation_info, Util.getRandomId(), file_name, null, null)
  }
}

const studio_service = new StudioServiceClass()
export default studio_service
