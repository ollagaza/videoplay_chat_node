import querystring from 'querystring'
import ServiceConfig from '../../service/service-config'
import Util from '../../utils/baseutil'
import log from '../../libs/logger'
import CloudFileService from '../cloud/CloudFileService'
import { VideoProjectField, VideoProjectModel } from '../../database/mongodb/VideoProject'
import StdObject from '../../wrapper/std-object'
import SequenceModel from '../../models/sequence/SequenceModel'
import Constants from '../../constants/constants'
import NaverObjectStorageService from '../storage/naver-object-storage-service'
import GroupService from '../member/GroupService'
import DBMySQL from '../../database/knex-mysql'
import VacsService from '../vacs/VacsService'

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

  createVideoProject = async (group_member_info, member_seq, request) => {
    const data = request.body

    const content_id = Util.getContentId()
    const media_root = ServiceConfig.get('media_root')
    const project_path = `${group_member_info.media_path}/studio/${content_id}`

    await Util.createDirectory(media_root + project_path)
    data.group_seq = group_member_info.group_seq
    data.member_seq = member_seq
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

    const payload = Util.getPayload(data, fields)

    return await VideoProjectModel.updateFromEditor(project_seq, payload)
  }

  updateFavorite = async (project_seq, is_favorite) => {
    return await VideoProjectModel.updateFavorite(project_seq, is_favorite)
  }

  updateStatus = async (request, group_seq, status) => {
    const project_seq_list = request.id_list
    return await VideoProjectModel.updateStatus(group_seq, project_seq_list, status)
  }

  deleteVideoProject = async (group_seq, project_seq) => {
    const project_info = await VideoProjectModel.deleteById(group_seq, project_seq)
    this.deleteProjectFiles(project_info)
    return project_info
  }

  deleteProjectFiles = (project_info) => {
    (
      async (project_info) => {
        const media_root = ServiceConfig.get('media_root')
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
    const media_root = ServiceConfig.get('media_root')
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

  makeProjectVideo = async (group_member_info, project_seq) => {
    const video_project_info = await this.getVideoProjectInfo(project_seq)
    if (!video_project_info || !video_project_info.sequence_list || video_project_info.sequence_list.length <= 0) {
      throw new StdObject(-1, '등록된 동영상 정보가 없습니다.', 400)
    }
    if (ServiceConfig.isVacs()) {
      if (!await this.requestMakeProject(video_project_info)) {
        throw new StdObject(-2, '동영상 제작요청에 실패하였습니다.', 400)
      }
    } else {
      await this.requestDownloadVideoFiles(group_member_info, video_project_info)
    }
    const update_result = await VideoProjectModel.updateRequestStatus(project_seq, 'R')
    return update_result && update_result._id && update_result._id > 0
  }

  requestDownloadVideoFiles = async (group_member_info, video_project_info) => {
    const media_root = ServiceConfig.get('media_root')
    const download_path = video_project_info.project_path + '/' + this.DOWNLOAD_SUFFIX
    const download_directory = media_root + download_path
    if (!(await Util.fileExists(download_directory))) {
      await Util.createDirectory(download_directory)
    }

    const group_path = `${group_member_info.media_path}/operation/`
    const group_root_directory = media_root + group_path

    log.debug(this.log_prefix, '[requestDownloadVideoFiles]', `group_path: ${group_path}, ${group_root_directory}`)
    const sequence_list = video_project_info.sequence_list
    const download_file_info_list = []
    for (let i = 0; i < sequence_list.length; i++) {
      const sequence_model = new SequenceModel().init(sequence_list[i])
      if (sequence_model.type === Constants.VIDEO) {
        const video_name = sequence_model.getVideoName()
        log.debug(this.log_prefix, '[requestDownloadVideoFiles]', `video_name: ${video_name}`)
        const content_directory = Util.getDirectoryName(video_name)
        const video_file_name = Util.getFileName(video_name)
        log.debug(this.log_prefix, '[requestDownloadVideoFiles]', `video_name: ${video_name}, content_directory: ${content_directory}, directory: ${download_directory + content_directory}`)
        download_file_info_list.push(
          {
            'origin_file_name': video_name,
            'remote_file_name': video_file_name,
          }
        )
      }
    }
    log.debug(this.log_prefix, '[requestDownloadVideoFiles]', 'download_file_info_list', download_file_info_list)
    // requestCopyToLocalByList = async (file_path, file_list = null, is_folder = true, response_url = null, method = 'POST', response_data = null)
    const response_url = '/api/storage/studio/download/complete'
    const response_data = {
      project_seq: video_project_info._id
    }
    await CloudFileService.requestDownloadObjectByList(download_path, group_path, download_file_info_list, false, video_project_info.content_id, response_url, response_data)
  }

  onDownloadComplete = async (response_data) => {
    log.debug(this.log_prefix, '[onDownloadComplete]', response_data)
    if (!response_data || !response_data.project_seq) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400, { response_data })
    }
    if (!response_data.is_success) {
      await VideoProjectModel.updateRequestStatus(response_data.project_seq, 'E', 0)
      throw new StdObject(-2, '원본 동영상파일 다운로드에 실패하였습니다.', 400, { response_data })
    }
    const video_project_info = await this.getVideoProjectInfo(response_data.project_seq)
    if (!video_project_info || !video_project_info.sequence_list || video_project_info.sequence_list.length <= 0) {
      throw new StdObject(-3, '등록된 동영상 정보가 없습니다.', 400)
    }
    await this.requestMakeProject(video_project_info)
    return true
  }

  requestMakeProject = async (video_project_info) => {
    if (!video_project_info || !video_project_info._id) {
      log.error(this.log_prefix, '[requestMakeProject]', 'video_project_info is empty', video_project_info)
      return false
    }
    const project_path = video_project_info.project_path + '/'
    const directory = ServiceConfig.get('media_root') + project_path
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

    const video_xml_json = {
      'VideoInfo': {
        'MediaInfo': {
          'ContentId': video_project_info.content_id,
          'Width': 1920 * scale,
          'Height': 1080 * scale,
        },
        'SequenceList': {
          'Sequence': sequence_model_list
        }
      }
    }

    const file_name = 'video_project.xml'
    await Util.writeXmlFile(directory, file_name, video_xml_json)

    const query_data = {
      'DirPath': editor_server_directory,
      'ContentID': video_project_info.content_id,
      'XmlFilePath': editor_server_directory + file_name
    }
    const query_str = querystring.stringify(query_data)

    const request_options = {
      hostname: ServiceConfig.get('auto_editor_server_domain'),
      port: ServiceConfig.get('auto_editor_server_port'),
      path: ServiceConfig.get('auto_editor_merge_api') + '?' + query_str,
      method: 'GET'
    }

    const api_url = 'http://' + ServiceConfig.get('auto_editor_server_domain') + ':' + ServiceConfig.get('auto_editor_server_port') + ServiceConfig.get('auto_editor_merge_api') + '?' + query_str
    log.debug(this.log_prefix, '[requestMakeProject]', 'request - start', api_url)

    let api_request_result = null
    let is_request_success = false
    try {
      api_request_result = await Util.httpRequest(request_options, false)
      is_request_success = api_request_result && api_request_result.toLowerCase() === 'done'
    } catch (error) {
      log.error(this.log_prefix, '[requestMakeProject]', 'request error', error)
      api_request_result = error.message
    }
    log.debug(this.log_prefix, '[requestMakeProject]', 'request - result', is_request_success, api_url, api_request_result)
    return is_request_success
  }

  updateMakeProcess = async (request) => {
    const query = request ? request.query : null
    if (!query) {
      throw new StdObject(-1, '잘못된 접근입니다', 400)
    }
    const content_id = query.ContentID
    const process_info = {
      status: query.Status,
      video_file_name: query.VideoFileName,
      smil_file_name: query.SmilFileName,
    }
    if (Util.isEmpty(process_info.status)) {
      throw new StdObject(1, '잘못된 파라미터', 400)
    }
    let video_project = null
    let is_success = false
    if (process_info.status === 'start') {
      const result = await VideoProjectModel.updateRequestStatusByContentId(content_id, 'S', 0)
      if (result && result.ok === 1) {
        is_success = true
      } else {
        log.error(this.log_prefix, '[updateMakeProcess]', 'update status', `status: ${process_info.status}`, result)
      }
    } else if (process_info.status === 'complete') {
      if (Util.isEmpty(process_info.video_file_name) || Util.isEmpty(process_info.smil_file_name)) {
        throw new StdObject(2, '결과파일 이름 누락', 400)
      }

      video_project = await VideoProjectModel.findOneByContentId(content_id)
      if (Util.isEmpty(video_project)) {
        throw new StdObject(4, '프로젝트 정보를 찾을 수 없습니다.', 400)
      }
      const project_seq = video_project._id
      const project_path = video_project.project_path + '/'
      const video_directory = ServiceConfig.get('media_root') + project_path
      const video_file_path = video_directory + process_info.video_file_name

      if (!(await Util.fileExists(video_file_path))) {
        await VideoProjectModel.updateRequestStatus(project_seq, 'E', 100)
        throw new StdObject(5, '동영상 파일이 없습니다.', 400)
      }

      const video_file_size = await Util.getFileSize(video_file_path)

      if (ServiceConfig.isVacs() === false) {
        await NaverObjectStorageService.moveFile(video_file_path, video_project.project_path, process_info.video_file_name, ServiceConfig.get('naver_object_storage_bucket_name'))
      }

      await Util.deleteFile(video_directory + process_info.smil_file_name)
      await Util.deleteFile(video_directory + process_info.video_file_name + '.flt')
      await Util.deleteFile(video_directory + 'video_project.xml')
      await Util.deleteDirectory(video_directory + this.TEMP_SUFFIX)
      await Util.deleteDirectory(video_directory + this.DOWNLOAD_SUFFIX)

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

      const result = await VideoProjectModel.updateRequestStatusByContentId(content_id, 'Y', 100, process_info)
      if (result && result.ok === 1) {
        is_success = true
      } else {
        log.error(this.log_prefix, '[updateMakeProcess]', 'update final', process_info, result)
      }
    } else {
      throw new StdObject(3, '잘못된 상태 값', 400)
    }
    if (video_project && is_success) {
      const message_info = {
        message: `'${video_project.project_name}'비디오 제작이 완료되었습니다.<br/>결과를 확인하려면 클릭하세요.`
      }
      const extra_data = {
        project_seq: video_project._id,
        reload_studio_page: true
      }
      await GroupService.onGeneralGroupNotice(video_project.group_seq, 'studioInfoChange', 'moveVideoEditor', 'videoMakeComplete', message_info, extra_data)
      if (ServiceConfig.isVacs()) {
        VacsService.updateStorageInfo()
      }
    }
    return is_success
  }

  migrationGroupSeq = async (member_seq, group_seq) => {
    await VideoProjectModel.migrationGroupSeq(member_seq, group_seq)
  }
}

const studio_service = new StudioServiceClass()
export default studio_service
