import { Router } from 'express'
import log from '../../libs/logger'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import Role from '../../constants/roles'
import Util from '../../utils/Util'
import GroupService from '../../service/group/GroupService'
import ProFileService from '../../service/mypage/ProFileService'
import ServiceConfig from '../../service/service-config'
import FollowService from '../../service/follow/FollowService'
import MemberLogService from '../../service/member/MemberLogService'
import OperationDataService from '../../service/operation/OperationDataService'

const routes = Router()

routes.post('/notice', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const group_seq = token_info.getGroupSeq()
  const member_seq = token_info.getId()
  const output = new StdObject()

  const lang = Auth.getLanguage(req)
  const result = await MemberLogService.getNoticePageMemberLog(DBMySQL, group_seq, member_seq, lang)
  output.add('notices', result)
  res.json(output)
}))

routes.post('/managechannel', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const group_seq = token_info.getGroupSeq()
  const output = new StdObject()

  output.add('group_counts', await GroupService.getGroupCountsInfo(DBMySQL, group_seq))
  output.add('profile_info', await ProFileService.getProFileInfo(DBMySQL, group_seq))

  res.json(output)
}))

routes.post('/getuserchannel', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const user_group_seq = token_info.getGroupSeq()
  const mento_group_seq = req.body.group_seq
  let output = new StdObject()

  if (mento_group_seq !== undefined) {
    output.add('group_counts', await GroupService.getGroupCountsInfo(DBMySQL, mento_group_seq))
    const profile_info = await ProFileService.getProFileInfo(DBMySQL, mento_group_seq)
    output.add('profile_info', profile_info)
    output.add('member_info', await GroupService.getGroupInfoWithGroupCounts(DBMySQL, mento_group_seq))
    output.add('followbutton', (await FollowService.getFollowing(DBMySQL, user_group_seq, mento_group_seq))[0])
  } else {
    throw new StdObject(-1, '잘못된 접근입니다', 400)
  }

  res.json(output)
}))

routes.put('/profile',
  Auth.isAuthenticated(Role.LOGIN_USER),
  Util.common_path_upload.fields([{ name: 'profile_image' }]), Wrap(async (req, res) => {
    const { group_seq, is_group_admin, group_member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
    if (!is_group_admin) {
      throw new StdObject(100, '권한이 없습니다.', 403)
    }
    const upload_type = req.body.upload_type
    let input_data = req.body.input_data
    const output = new StdObject()

    try {
      const media_path = group_member_info.media_path
      if (upload_type === 'image') {
        const profile_dir = ServiceConfig.get('media_root') + media_path + '/profile'
        const directory_exits = await Util.createDirectory(profile_dir)
        const save_file_name = `${req.files.profile_image[0].filename}.jpg`
        const rename_path = `${profile_dir}/${save_file_name}`
        const dimensions = await Util.getVideoDimension(req.files.profile_image[0].path)

        if (directory_exits && req.files.profile_image !== undefined) {
          await Util.renameFile(req.files.profile_image[0].path, rename_path)

          if (dimensions.width > 1380) {
            await Util.getImageScaling(rename_path)
          }
        }

        if (req.files.profile_image !== undefined) {
          input_data = `${media_path}/profile/${save_file_name}`
        } else {
          input_data = ''
        }
      }

      const prev_profile = group_member_info.profile
      const result = await ProFileService.updateProFileInfo(DBMySQL, group_seq, upload_type, input_data)
      output.add('result', result)
      res.json(output)
      addProfileHistory(req, group_member_info, upload_type, input_data, prev_profile)
    } catch (e) {
      throw new StdObject(-1, e, 400)
    }
  }))

const addProfileHistory = (req, group_member_info, upload_type, input_data, prev_profile) => {
  (
    async () => {
      try {
        await ProFileService.writeProfileHistory(DBMySQL, group_member_info.group_seq, group_member_info.member_seq, upload_type, prev_profile ? JSON.parse(prev_profile) : {}, input_data)
      } catch (e) {
        log.e(req, '[ProFileService.writeProfileHistory]', e)
      }
      try {
        await MemberLogService.createMemberLog(DBMySQL, group_member_info.group_seq, null, null, '1004', null, null, 1)
      } catch (e) {
        log.e(req, '[MemberLogService.createMemberLog]', e)
      }
    }
  )()
}

routes.delete('/profile/image', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, is_group_admin, group_member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  if (!is_group_admin) {
    throw new StdObject(-1, '권한이 없습니다.', 403)
  }

  const prev_profile = group_member_info.profile

  const result = await ProFileService.updateProFileInfo(DBMySQL, group_seq, 'image', '')
  const output = new StdObject()
  output.add('result', result)
  res.json(output)

  addProfileHistory(req, group_member_info, 'image', '', prev_profile)
}))

routes.post('/changeGroupCMFlag', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const group_seq = token_info.getGroupSeq()
  const json_flag = req.body.data
  const output = new StdObject()

  try {
    await DBMySQL.transaction(async (transaction) => {
      const result = await ProFileService.changeCMFlag(transaction, group_seq, json_flag)
      output.add('result', result)
      output.add('send_flag', json_flag)
    })
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/open/video/:group_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_seq = req.params.group_seq
  const limit = Util.parseInt(req.query.limit, null)
  const open_video_list = await OperationDataService.getCompleteIsOpenVideoDataLists(group_seq, limit)

  const output = new StdObject()
  output.add('open_video_list', open_video_list)
  res.json(output)
}))

export default routes
