import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import log from "../../libs/logger"
import OperationDataModel from '../../database/mysql/operation/OperationDataModel'
import OperationDataInfo from '../../wrapper/operation/OperationDataInfo'
import GroupService from '../member/GroupService'
import MemberService from '../member/MemberService'
import ContentCountService from '../member/ContentCountService'
import DBMySQL from '../../database/knex-mysql'
import OperationService from './OperationService'
import OperationMediaService from './OperationMediaService'
import striptags from 'striptags'
import HashtagService from './HashtagService'

const OperationDataServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationDataService]'
    this.TYPE_COMMUNITY = 'C'
    this.TYPE_MENTORING = 'M'
  }

  getOperationDataModel = (database = null) => {
    if (database) {
      return new OperationDataModel(database)
    }
    return new OperationDataModel(DBMySQL)
  }

  getOperationData = async (database, operation_seq) => {
    const operation_data_model = this.getOperationDataModel()
    return await operation_data_model.getOperationData(operation_seq)
  }

  getOperationDataByOperationSeq = async (database, operation_seq) => {
    const operation_data_model = this.getOperationDataModel()
    return await operation_data_model.getOperationDataByOperationSeq(operation_seq)
  }

  createOperationDataByOperationSeq = async (operation_seq) => {
    const operation_info = await OperationService.getOperationInfoNoJoin(DBMySQL, operation_seq)
    if (!operation_info) {
      return null
    }
    const group_seq = operation_info.group_seq
    const member_seq = operation_info.member_seq
    const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
    const group_member_info = await GroupService.getGroupMemberInfo(DBMySQL, group_seq, member_seq)
    return await this.createOperationDataByRequest(operation_info, member_info, group_member_info, { operation_data: {} })
  }

  createOperationDataByRequest = async (operation_info, member_info, group_member_info, request_body) => {
    if (!operation_info) {
      return null
    }
    const operation_seq = operation_info.seq
    const hashtag = request_body.operation_data ? request_body.operation_data.hashtag : null
    const operation_data_info = new OperationDataInfo(request_body.operation_data).setIgnoreEmpty(true).toJSON()
    operation_data_info.operation_seq = operation_seq
    operation_data_info.group_seq = group_member_info.group_seq
    operation_data_info.group_name = group_member_info.group_name
    if (group_member_info.group_type === GroupService.GROUP_TYPE_PERSONAL) {
      operation_data_info.hospital = member_info.hospname
    }
    operation_data_info.title = operation_info.operation_name
    operation_data_info.status = operation_info.status
    operation_data_info.is_complete = operation_info.analysis_status === 'Y'
    if (operation_data_info.doc_html) {
      operation_data_info.doc_text = striptags(operation_data_info.doc_html)
    }

    const operation_data_model = this.getOperationDataModel()
    const operation_data_seq = await operation_data_model.createOperationData(operation_data_info)

    if (operation_data_seq && hashtag) {
      (
        async () => {
          try {
            await HashtagService.updateOperationHashtag(group_member_info.group_seq, hashtag, operation_data_seq)
          } catch (error) {
            log.error(this.log_prefix, '[createOperationDataByRequest]', error)
          }
        }
      )()
    }

    return operation_data_seq
  }

  updateOperationDataByRequest = async (database, operation_seq, request_body) => {
    const operation_info = await OperationService.getOperationInfoNoJoin(database, operation_seq)
    if (!operation_info) {
      return null
    }
    const hashtag = request_body.operation_data ? request_body.operation_data.hashtag : null
    const operation_data_info = new OperationDataInfo(request_body.operation_data).setIgnoreEmpty(true).toJSON()
    operation_data_info.title = operation_info.operation_name
    if (operation_data_info.doc_html) {
      operation_data_info.doc_text = striptags(operation_data_info.doc_html)
    }

    const operation_data_model = this.getOperationDataModel(database)
    const operation_data_seq = await operation_data_model.updateOperationData(operation_seq, operation_data_info)

    if (operation_data_seq && hashtag) {
      (
        async () => {
          try {
            await HashtagService.updateOperationHashtag(operation_info.group_seq, hashtag, operation_data_seq)
          } catch (error) {
            log.error(this.log_prefix, '[updateOperationDataByRequest]', error)
          }
        }
      )()
    }

    return operation_data_seq
  }

  setThumbnailImage = async (operation_seq, request, response) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data = await operation_data_model.getOperationDataByOperationSeq(operation_seq)
    if (!operation_data || operation_data.isEmpty()) {
      return null
    }
    const { operation_info } = await OperationService.getOperationInfoNoAuth(DBMySQL, operation_seq)
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const media_directory = directory_info.image
    if ( !( await Util.fileExists(media_directory) ) ) {
      await Util.createDirectory(media_directory)
    }
    const thumbnail_file_name = 'thumbnail'
    await Util.uploadByRequest(request, response, 'thumbnail', media_directory, thumbnail_file_name, true)

    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
    }

    const thumbnail_path = directory_info.media_image + thumbnail_file_name
    const update_result = await operation_data_model.updateThumbnailImage(operation_data.seq, thumbnail_path)
    log.debug(this.log_prefix, '[setThumbnailImage]', update_result)
    return directory_info.url_image + thumbnail_file_name
  }

  setThumbnailAuto = async (operation_seq, thumbnail_path) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data = await operation_data_model.getOperationDataByOperationSeq(operation_seq)
    if (!operation_data || operation_data.isEmpty()) {
      return null
    }
    await operation_data_model.updateThumbnailImageNotExists(operation_data.seq, thumbnail_path)
  }

  onUpdateComplete = async (operation_seq) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data = await operation_data_model.getOperationDataByOperationSeq(operation_seq)
    if (!operation_data || operation_data.isEmpty()) {
      return null
    }
    const operation_data_seq = operation_data.seq
    const group_seq = operation_data.group_seq

    const media_info = await OperationMediaService.getOperationMediaInfoByOperationSeq(DBMySQL, operation_seq)

    await operation_data_model.updateComplete(operation_data_seq, media_info ? media_info.total_time : null)
    // const operation_info = await OperationService.getOperationInfoNoAuth(null, operation_seq)

    const group_count_field_name = ['video_count']
    const content_count_field_name = [ContentCountService.VIDEO_COUNT]
    if (operation_data.type === 'M') {
      group_count_field_name.push('mentoring')
      content_count_field_name.push(ContentCountService.MENTORING_COUNT)
    } else if (operation_data.type === 'C') {
      group_count_field_name.push('community')
      content_count_field_name.push(ContentCountService.COMMUNITY_COUNT)
    }
    await GroupService.UpdateGroupInfoAddCnt(null, group_seq, group_count_field_name)

    if (operation_data.category_list) {
      for (let i = 0; i < operation_data.category_list.length; i++) {
        const category_code = operation_data.category_list[i]
        await ContentCountService.addContentCount(null, category_code, group_seq, content_count_field_name)
      }
      await ContentCountService.updateAllCount(null, group_seq)
    }
  }

  setRejectMentoring = async (operation_seq) => {
    try {
      const operation_data_model = this.getOperationDataModel()
      return await operation_data_model.setRejectMentoring(operation_seq);
    } catch (e) {
      throw e;
    }
  }

  changeDocument = async (operation_data_seq, request_body) => {
    const operation_data_model = this.getOperationDataModel()
    const doc_html = request_body.doc
    const doc_text = doc_html ? striptags(doc_html) : null
    log.debug(this.log_prefix, '[changeDocument]', operation_data_seq, doc_html, doc_text)
    return await operation_data_model.updateDoc(operation_data_seq, doc_html, doc_text)
  }

  getCompleteIsOpenVideoDataLists = async (group_seq, limit = null) => {
    const operation_data_model = this.getOperationDataModel()
    return await operation_data_model.getCompleteIsOpenVideoDataLists(group_seq, limit)
  }

  changeStatus = async (operation_seq, status) => {
    const operation_data_info = { status }
    const operation_data_model = this.getOperationDataModel()
    await operation_data_model.updateOperationData(operation_seq, operation_data_info)
  }

  updateOperationDataByOperationSeqList = async (operation_seq_list, status) => {
    const operation_data_info = { status }
    const operation_data_model = this.getOperationDataModel()
    await operation_data_model.updateOperationDataByOperationSeqList(operation_seq_list, operation_data_info)
  }
}

const operation_data_service = new OperationDataServiceClass()
export default operation_data_service
