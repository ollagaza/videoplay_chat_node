import { Router } from 'express'
import _ from 'lodash'
import ServiceConfig from '../../service/service-config'
import Wrap from '../../utils/express-async'
import Util from '../../utils/Util'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import Constants from '../../constants/constants'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import querystring from 'querystring'
import Config from '../../config/config'

import IndexInfo from '../../wrapper/xml/IndexInfo'
import VideoInfo from '../../wrapper/xml/VideoInfo'

import DBMySQL from '../../database/knex-mysql'
import SequenceModel from '../../models/sequence/SequenceModel'
import OperationModel from '../../database/mysql/operation/OperationModel'
import { VideoProjectModel } from '../../database/mongodb/VideoProject'
import OperationClipService from '../../service/operation/OperationClipService'
import MemberService from '../../service/member/MemberService'
import group_template from '../../template/mail/group.template'
import SendMail from '../../libs/send-mail'
import MongoDataService from '../../service/common/MongoDataService'
import HashtagModel from '../../database/mysql/operation/HashtagModel'
import HashtagUseModel from '../../database/mysql/operation/HashtagUseModel'
import socketManager from '../../service/socket-manager'
import NotifyInfo from '../../wrapper/common/NotifyInfo'
import FTP from '../../libs/ftp'
import OperationFolderService from '../../service/operation/OperationFolderService'
import group_service from "../../service/group/GroupService";
import sendmail from '../../libs/send-mail'
import SendMailService from "../../service/etc/SendMailService";
import TempService from "../../service/TempService";
import ExifReader from 'exifreader'
import fs from 'fs'

const routes = Router()

const IS_DEV = Config.isDev()

if (IS_DEV) {

  routes.get('/pdf', Wrap(async (req, res) => {
    const image_list = await Util.pdfToImage('d:/cc.pdf', 'd:/temp/pdf/aa')
    res.json(image_list)
  }))

  routes.get('/exif', Wrap(async (req, res) => {
    const a1 = await Util.isImageRotate('d:/a1.jpg')
    const a2 = await Util.isImageRotate('d:/a2.jpg')
    const a3 = await Util.isImageRotate('d:/a3.jpg')
    const a4 = await Util.isImageRotate('d:/a4.jpg')
    res.json({ a1, a2, a3, a4 })
  }))

  routes.get('/cloud_mail_file_test', Wrap(async (req, res) => {
    const result = await SendMailService.sendMail(DBMySQL, 24, 30)
    res.json(result)
  }))

  routes.get('/socket_test', Wrap(async (req, res) => {
    const member_seq = req.body.member_seq
    const group_seq = req.body.group_seq
    const notifyinfo = new NotifyInfo()
    notifyinfo.seq = 0
    notifyinfo.notify_type = 'message'
    notifyinfo.profile_image = null
    notifyinfo.regist_datetime = new Date()
    notifyinfo.text = 'test'
    const send_socket_message_info = {
      message_info: {
        title: 'test',
        message: 'test',
        notice_type: '',
        type: 'globalNotice',
      },
      notifyinfo: notifyinfo.toJSON(),
      data: {
        type: null,
        action_type: null
      }
    }

    // await socketManager.sendToFrontOne(member_seq, send_socket_message_info);
    await socketManager.sendToFrontAll(send_socket_message_info)
    res.end()
  }))

  routes.get('/video/:project_seq(\\d+)/:scale', Wrap(async (req, res) => {
    const project_seq = req.params.project_seq
    const scale = Util.parseFloat(req.params.scale, 1)
    const video_project = await VideoProjectModel.findOneById(project_seq)
    const sequence_list = video_project.sequence_list
    const sequence_model_list = []
    for (let i = 0; i < sequence_list.length; i++) {
      const sequence_model = new SequenceModel().init(sequence_list[i])
      if (sequence_model.type) {
        sequence_model_list.push(sequence_model.getXmlJson(i, scale))
      }
    }

    const video_xml_json = {
      'VideoInfo': {
        'MediaInfo': {
          'ContentId': video_project.content_id,
          'Width': 1920 * scale,
          'Height': 1080 * scale,
        },
        'SequenceList': {
          'Sequence': sequence_model_list
        }
      }
    }

    await Util.writeXmlFile(ServiceConfig.getMediaRoot() + video_project.project_path, 'video_project.xml', video_xml_json)

    res.json(video_xml_json)
  }))

  routes.get('/media', Wrap(async (req, res) => {
    const file_name = 'birdman.mkv'
    const url = 'd:\\\\movie\\??????.mkv'
    const media_info = await Util.getMediaInfo(url)
    const type = await Util.getFileType(url, file_name)
    const result = new StdObject()
    result.add('media_info', media_info)
    result.add('type', type)
    res.json(result)
  }))

  routes.get('/co/:code', Wrap(async (req, res) => {
    const code = req.params.code
    res.send(Util.colorCodeToHex(code))
  }))

  routes.get('/crypto', Wrap(async (req, res) => {
    const data = {
      r: Util.getRandomString(5),
      s: 155
    }

    const enc_text = Util.encrypt(data)
    const dec = JSON.parse(Util.decrypt(enc_text))

    const output = new StdObject()
    output.add('enc', enc_text)
    output.add('dec', dec)

    res.json(output)
  }))

  routes.get('/token', Wrap(async (req, res) => {
    const result = await Auth.verifyToken(req)
    res.json(result)
  }))

  routes.get('/uuid', Wrap(async (req, res) => {
    const uuid = await Util.getUuid()
    const output = new StdObject()
    output.add('uuid', uuid)

    res.json(output)
  }))

  routes.get('/forward', Wrap(async (req, res, next) => {
    const url = 'http://localhost:3000/api/v1/operations/9/request/analysis'
    const admin_member_info = {
      seq: 0,
      role: Role.ADMIN
    }
    const token_result = Auth.generateTokenByMemberInfo(admin_member_info)
    const forward_result = await Util.forward(url, 'POST', token_result.token)
    res.json(forward_result)
  }))

  routes.post('/burning', Wrap(async (req, res, next) => {
    req.accepts('application/json')
    req.setTimeout(0)
    log.d(req, req.body)
    const root_dir = req.body.root
    const user_id = req.body.user_id
    const url_prefix = req.body.url_prefix
    const random_key = req.body.random_key === true
    const file_list = await Util.getDirectoryFileList(root_dir)
    res.json(file_list)

    try {
      const auth_url = url_prefix + '/api/demon/auth'
      const batch_url = url_prefix + '/api/demon/batch/operation'
      log.d(req, 'urls', auth_url, batch_url)
      const auth_params = {
        'user_id': user_id
      }
      const auth_result = await Util.forward(auth_url, 'POST', null, auth_params)
      if (!auth_result || auth_result.error !== 0) {
        log.e(req, 'request auth error', auth_result)
        return
      }
      const auth_token = auth_result.variables.token
      const trans_reg = /^(Proxy|Trans)_/i
      for (let i = 0; i < file_list.length; i++) {
        const file = file_list[i]
        if (file.isDirectory()) {
          const directory_name = file.name
          const target_dir = root_dir + '/' + directory_name
          const seq_dir = target_dir + '/' + 'SEQ'
          const seq_file_list = await Util.getDirectoryFileList(seq_dir)
          log.d(req, i, seq_dir)
          if (seq_file_list) {
            const seq_list = []
            for (let j = 0; j < seq_file_list.length; j++) {
              const seq_file = seq_file_list[j]
              if (!seq_file.isFile()) {
                continue
              }
              const file_ext = Util.getFileExt(seq_file.name)
              if (file_ext === 'smil') {
                continue
              }
              const seq_path = seq_dir + '/' + seq_file.name
              const file_info = await Util.getFileStat(seq_path)
              if (file_info.size <= 0) {
                continue
              }
              if (trans_reg.test(seq_file.name)) {
                continue
              }
              const media_info = await Util.getMediaInfo(seq_path)
              if (media_info.media_type === Constants.VIDEO) {
                seq_list.push(seq_path)
              }
            }
            if (seq_list.length <= 0) {
              await Util.deleteDirectory(target_dir)
              log.d(req, 'delete dir', target_dir)
            } else {
              const request_data = {
                'data': seq_list
              }
              if (random_key) {
                request_data.key = Util.getContentId()
              } else {
                request_data.key = directory_name
              }
              const batch_result = await Util.forward(batch_url, 'POST', auth_token, request_data)
              log.d(req, 'batch_result', request_data, batch_result)
            }
          }
        }
      }
    } catch (error) {
      log.e(req, error)
    }
  }))

  routes.delete('/dir', Wrap(async (req, res, next) => {
    req.accepts('application/json')
    req.setTimeout(0)
    log.d(req, req.body)
    const root_dir = req.body.root
    await Util.deleteDirectory(root_dir)
    log.d(req, 'delete dir', root_dir)

    res.send(true)
  }))

  routes.get('/err', Wrap(async (req, res, next) => {

    const result1 = await Util.fileExists('\\\\192.168.0.112\\data_trans\\dev\\media\\test\\operation\\6227f7a0-d923-11e9-bcaf-81e66f898cf9\\SEQ\\PlayList.smi')
    const result2 = await Util.fileExists('\\\\192.168.0.112\\data_trans\\dev\\media\\test\\operation\\6227f7a0-d923-11e9-bcaf-81e66f898cf9\\SEQ\\PlayList.smil')
    const result3 = await Util.fileExists('\\\\192.168.0.112\\data_trans\\dev\\media\\test\\operation\\6227f7a0-d923-11e9-bcaf-81e66f898cf9\\SEQ\\Trans_6227f7a0-d923-11e9-bcaf-81e66f898cf9.mp4')
    log.d(req, '\\\\192.168.0.112\\data_trans\\dev\\media\\test\\operation\\6227f7a0-d923-11e9-bcaf-81e66f898cf9\\SEQ\\Trans_6227f7a0-d923-11e9-bcaf-81e66f898cf9.mp4')
    res.send({
      result1,
      result2,
      result3
    })
  }))

  const set_range_tags = (range_index_list, index_info) => {
    const start_frame = index_info.start_frame
    range_index_list.forEach((range_info) => {
      if (range_info.start_frame <= start_frame && range_info.end_frame >= start_frame) {
        index_info.tag_map[range_info.code] = true
      }
    })
  }

  const getClipListByMemberSeq = async (member_seq) => {
    const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
    const operation_model = new OperationModel(DBMySQL)
    const operation_list = await operation_model.getOperationListByMemberSeq(member_seq)
    log.debug('operation_list', operation_list)
    const result = {}
    result.user_id = member_info.user_id
    result.user_name = member_info.user_name
    result.operation_list = []
    for (let i = 0; i < operation_list.length; i++) {
      const operation = operation_list[i]
      const operation_info = {}
      operation_info.operation_id = operation.seq
      operation_info.operation_name = operation.operation_name
      operation_info.operation_code = operation.operation_code

      const clip_list = await OperationClipService.findByOperationSeq(operation.seq)
      if (clip_list.length <= 0) {
        continue
      }

      log.debug(`clip_list ${operation.seq}`, clip_list)
      const sort_list = _.orderBy(clip_list, ['start_time', 'end_time'], ['asc', 'asc'])
      const clip_result_list = []
      sort_list.forEach((clip_info) => {
        if (!clip_info.is_phase) {
          clip_result_list.push({
            start_sec: clip_info.start_time,
            end_sec: clip_info.end_time,
            start_time: Util.secondToTimeStr(clip_info.start_time),
            end_time: Util.secondToTimeStr(clip_info.end_time),
            desc: clip_info.desc,
            thumbnail_url: 'https://nipa.surgstory.com' + clip_info.thumbnail_url.replace('Thumb_', ''),
          })
        }
      })
      operation_info.clip_list = clip_result_list
      result.operation_list.push(operation_info)
    }

    return result
  }

  routes.post('/clip_list', Wrap(async (req, res) => {
    req.accepts('application/json')

    const result = []
    const member_seq_list = req.body.member_seq_list
    for (let i = 0; i < member_seq_list.length; i++) {
      const clip_list = await getClipListByMemberSeq(member_seq_list[i])
      result.push(clip_list)
    }
    res.json(result)
  }))

  routes.get('/clip_list/:member_seq', Wrap(async (req, res) => {
    const member_seq = req.params.member_seq
    res.json(await getClipListByMemberSeq(member_seq))
  }))

  routes.get('/t', Wrap(async (req, res) => {
    res.json(ServiceConfig.supporterEmailList())
  }))

  routes.get('/ssh', Wrap(async (req, res) => {
    const cmd = 'sh /volume1/datas/storage_json.sh'
    const host = '192.168.0.26'

    const ssh_result = await Util.sshExec(cmd, host, 20322)
    if (ssh_result.success && ssh_result.result) {
      res.json(JSON.parse(ssh_result.result))
    } else {
      res.json(ssh_result)
    }
  }))

  routes.get('/mail', Wrap(async (req, res) => {
    const mail_to = ['????????? <hwj@mteg.co.kr>', 'weather8128@naver.com']
    const title = '????????? ?????? ?????????'
    const body = group_template.inviteGroupMember()
    const send_result = await new SendMail().sendMailHtml(mail_to, title, body, '?????????')
    res.json(send_result)
  }))

  routes.get('/data', Wrap(async (req, res) => {
    const output = MongoDataService.getData()
    res.json(output)
  }))

  routes.get('/tag', Wrap(async (req, res) => {
    let result = {}

    const tag_list = []
    const start = Math.round(5 * Math.random())
    const end = 6 + Math.round(15 * Math.random())
    for (let i = start; i <= end; i++) {
      tag_list.push('tag' + i)
    }
    result.tag_list = tag_list
    const seq = 1 + Math.round(10 * Math.random())

    await DBMySQL.transaction(async (transaction) => {
      const model = new HashtagModel(transaction)
      const tag_seq_list = await model.createHashtagList(tag_list)
      const use_model = new HashtagUseModel(transaction)
      await use_model.deleteUnUseTagList(tag_seq_list, seq, use_model.TYPE_OPERATION_DATA)
      const tag_use_list = await use_model.updateHashtagUseList(1, tag_seq_list, seq, use_model.TYPE_OPERATION_DATA)
      const tag_use_count_result = await use_model.updateHashtagCount(tag_seq_list)

      result.tag_seq_list = tag_seq_list
      result.tag_use_list = tag_use_list
      result.tag_use_count_result = tag_use_count_result
    })

    res.json(result)
  }))

  routes.get('/tag2', Wrap(async (req, res) => {
    const model = new HashtagUseModel(DBMySQL)
    const count_result = await model.getGroupHashtagCount(1, 5)
    res.json(count_result)
  }))

  routes.post('/tag3', Wrap(async (req, res) => {
    req.accepts('application/json')
    const tag = req.body.tag
    const hashtag_list = Util.parseHashtag(tag)
    const merge_str = Util.mergeHashtag(hashtag_list)
    const result = {
      tag,
      hashtag_list,
      merge_str
    }
    res.json(result)
  }))

  routes.get('/ftp', Wrap(async (req, res) => {
    const ftp_info = {
      host: '192.168.0.2',
      port: 2101,
      user: 'ai',
      password: 'dpdldkdl!',
      debug: true,
      encoding: 'utf-8'
    }
    const ftp = new FTP(ftp_info)
    await ftp.connect()
    await ftp.uploadFile('d:/temp/Conf.xml', 'Conf.xml', '/ai/bb/cc/dd/??????')
    await ftp.close()
    res.send('aa')
  }))

  routes.get('/exec', Wrap(async (req, res) => {
    const args = ['-y', '-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda', '-report', '-i', 'd:/ss aa/001.mp4', '-c:v', 'h264_nvenc', '-profile:v', 'high', '-level:v', '4.0', '-r', '30', '-b:v', '4500', 'd:/ss aa/__1.mp4']
    const spawn = Util.executeSpawn('ffmpeg', args, { env: { "FFREPORT": `file=logs/ffmpeg/${Util.getRandomString(10)}.log` } })
    // const spawn = Util.executeSpawn('ffmpeg')
    spawn.on('onStart', (cmd) => {
      log.d(req, 'onStart', cmd)
    })
    spawn.on('onData', (data) => {
      log.d(req, 'onData', data)
    })
    spawn.on('onEnd', (data) => {
      log.d(req, 'onEnd', data)
    })
    spawn.on('onError', (data) => {
      log.d(req, 'onError', data)
    })
    spawn.on('onExit', (code) => {
      log.d(req, 'onExit', code)
      spawn.emit('finish')

      res.send('aa')
    })
  }))

}

export default routes
