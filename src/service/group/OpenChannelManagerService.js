import _ from 'lodash'
import log from '../../libs/logger'
import Util from '../../utils/Util'
import DBMySQL from '../../database/knex-mysql'
import OpenChannelModel from '../../database/mysql/open/channel/OpenChannelModel'
import OpenChannelBannerModel from '../../database/mysql/open/channel/OpenChannelBannerModel'
import OpenChannelCategoryModel from '../../database/mysql/open/channel/OpenChannelCategoryModel'
import OpenChannelVideoModel from '../../database/mysql/open/channel/OpenChannelVideoModel'
import GroupModel from '../../database/mysql/group/GroupModel'
import StdObject from '../../wrapper/std-object'
import ServiceConfig from '../service-config'
import Constants from '../../constants/constants'
import path from 'path'
import OpenChannelBannerInfo from '../../wrapper/open/channel/OpenChannelBannerInfo'
import NaverObjectStorageService from '../storage/naver-object-storage-service'
import logger from '../../libs/logger'

const OpenChannelManagerServiceClass = class {
  constructor() {
    this.log_prefix = '[OpenChannelManagerService]'
  }

  getChannelModel = (database) => {
    if (database) {
      return new OpenChannelModel(database)
    }
    return new OpenChannelModel(DBMySQL)
  }

  getBannerModel = (database) => {
    if (database) {
      return new OpenChannelBannerModel(database)
    }
    return new OpenChannelBannerModel(DBMySQL)
  }

  getCategoryModel = (database) => {
    if (database) {
      return new OpenChannelCategoryModel(database)
    }
    return new OpenChannelCategoryModel(DBMySQL)
  }

  getVideoModel = (database) => {
    if (database) {
      return new OpenChannelVideoModel(database)
    }
    return new OpenChannelVideoModel(DBMySQL)
  }

  getGroupModel = (database) => {
    if (database) {
      return new GroupModel(database)
    }
    return new GroupModel(DBMySQL)
  }

  getGroupInfo = async (group_seq) => {
    group_seq = Util.parseInt(group_seq, 0)
    if (group_seq <= 0) {
      throw new StdObject(8701, '채널 정보가 존재하지 않습니다.', 500)
    }
    const group_model = this.getGroupModel()
    const group_info = await group_model.getGroupInfo(group_seq)
    if (!group_info || group_info.seq !== group_seq) {
      throw new StdObject(8702, '채널 정보가 존재하지 않습니다.', 500)
    }
    if (group_info.status !== 'F' && group_info.status !== 'Y') {
      throw new StdObject(8703, '사용이 정지된 채널입니다.', 500)
    }
    return group_info
  }

  getOpenChannelInfo = async (group_seq) => {
    const output = new StdObject()

    const group_info = await this.getGroupInfo(group_seq)
    const banner_model = this.getBannerModel()
    const category_model = this.getCategoryModel()

    const banner_list = await banner_model.getOpenChannelBannerList(group_seq)
    const category_list = await category_model.getOpenChannelCategoryList(group_seq)

    output.add('tag_list', group_info.search_keyword ? JSON.parse(group_info.search_keyword) : {})
    output.add('explain', Util.trim(group_info.group_explain))
    output.add('group_image_url', Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), JSON.parse(group_info.profile).image))
    output.add('profile_image_url', Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_info.profile_image_path))
    output.add('channel_top_img_url', Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_info.channel_top_img_path))
    output.add('banner_list', banner_list)
    output.add('category_list', category_list)

    return output
  }

  getOpenChannelVideoList = async (group_seq, category_seq, request_query) => {
    const page_params = {}
    const order_params = {}
    if (request_query) {
      page_params.page = Util.parseInt(request_query.page, 1)
      page_params.list_count = Util.parseInt(request_query.list_count, 20)
      page_params.page_count = Util.parseInt(request_query.page_count, 10)
      page_params.no_paging = request_query.no_paging === 'n' ? 'n' : 'y'
      order_params.field = request_query.order_fields ? request_query.order_fields : 'operation.seq'
      order_params.type = request_query.order_type ? request_query.order_type : 'desc'
    }
    const output = new StdObject()

    const video_model = this.getVideoModel()
    const video_list = video_model.getOpenChannelVideoList(group_seq, category_seq, page_params, order_params)
    output.adds(video_list)

    return output
  }

  addBanner = async (group_seq, request, response) => {
    const group_info = await this.getGroupInfo(group_seq)
    const group_path = `${group_info.media_path}/open/channel/`
    const upload_directory = ServiceConfig.getMediaRoot() + group_path
    await Util.uploadByRequest(request, response, 'banner', upload_directory, Util.getRandomId())
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(8801, '배너 파일 업로드가 실패하였습니다.', 500)
    }
    let banner_file_path = upload_file_info.path
    const banner_media_info = await Util.getMediaInfo(banner_file_path)
    if (!banner_media_info || !banner_media_info.media_info || !banner_media_info.media_info.width || !banner_media_info.media_info.height || banner_media_info.media_type !== Constants.IMAGE) {
      throw new StdObject(8802, '이미지 파일만 업로드 가능합니다.', 500)
    }
    let banner_file_name = upload_file_info.new_file_name

    const request_body = request.body
    const banner_info = new OpenChannelBannerInfo()
    banner_info.group_seq = group_seq
    banner_info.image_path = group_path + banner_file_name
    if (request_body) {
      banner_info.link = Util.trim(request_body.link)
      banner_info.text = Util.trim(request_body.text)
      banner_info.order = Util.parseInt(request_body.order, 99)
    }
    const path_info = path.parse(banner_file_path)
    const image_ext = `${path_info.ext}`.toLowerCase()
    if (image_ext !== '.png' && image_ext !== '.jpg') {
      const resize_image_name = `${path_info.name}${image_ext}`
      const resize_image_path = `${path_info.dir}/${resize_image_name}`
      const resize_result = await Util.resizeImage(upload_file_info.path, resize_image_path)
      if (resize_result.success && (await Util.fileExists(resize_image_path))) {
        await Util.deleteFile(upload_directory + banner_file_name)
        banner_info.image_path = group_path + resize_image_name
        banner_file_path = resize_image_path
        banner_file_name = resize_image_name
      }
    }

    if (!ServiceConfig.isVacs()) {
      await NaverObjectStorageService.uploadFile(banner_file_path, group_path, banner_file_name)
    }
    const banner_model = this.getBannerModel()
    const created_banner_info = banner_model.createOpenChannelBannerInfo(banner_info)

    const output = new StdObject()
    output.add('banner_info', created_banner_info)
    return output
  }

  deleteBanner = async (group_seq, banner_seq) => {
    const banner_model = this.getBannerModel()
    const banner_info = await banner_model.getOpenChannelBannerInfo(banner_seq)
    await banner_model.deleteOpenChannelBannerInfo(group_seq, banner_seq)
    try {
      if (ServiceConfig.isVacs()) {
        await Util.deleteFile(ServiceConfig.getMediaRoot() + banner_info.image_path)
      } else {
        await NaverObjectStorageService.deleteFile(banner_info.image_path)
      }
    } catch (error) {
      logger.error(this.log_prefix, '[deleteBanner]', error)
    }
  }

  modifyBannerOrder = async (group_seq, request) => {
    if (!request || !request.body || Util.isEmpty(request.body.order_data_list)) {
      return false
    }
    const banner_model = this.getBannerModel()
    await banner_model.modifyBannerOrder(group_seq, request.body.order_data_list)
    return true
  }

  modifyBannerInfo = async (group_seq, banner_seq, request) => {
    if (!request || !request.body || Util.isEmpty(request.body.banner_info)) {
      return false
    }
    const banner_model = this.getBannerModel()
    await banner_model.modifyBannerInfo(group_seq, banner_seq, new OpenChannelBannerInfo(request.body.banner_info))
    return true
  }

  validateChannelDomain = async () => {

  }

  validateCategoryName = async (group_seq, category_name) => {
    const category_model = this.getCategoryModel()
  }
}
const OpenChannelManagerService = new OpenChannelManagerServiceClass()

export default OpenChannelManagerService
