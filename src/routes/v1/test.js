import { Router } from 'express';
import _ from 'lodash';
import Promise from 'promise'
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import log from "../../libs/logger";
import querystring from 'querystring'
import Config from "../../config/config";

import IndexInfo from "../../wrapper/xml/IndexInfo";
import VideoInfo from "../../wrapper/xml/VideoInfo";

import DBMySQL from '../../database/knex-mysql'
import SequenceModel from '../../models/sequence/SequenceModel';
import OperationModel from '../../database/mysql/operation/OperationModel';
import { VideoProjectModel } from '../../database/mongodb/VideoProject';
import OperationService from '../../service/operation/OperationService'
import OperationClipService from '../../service/operation/OperationClipService'
import OperationExpansionDataService from "../../service/operation/OperationExpansionDataService"
import OperationAnalysisService from "../../service/operation/OperationAnalysisService"
import { VideoIndexInfoModel } from '../../database/mongodb/VideoIndex'
import MemberService from '../../service/member/MemberService'
import { OperationClipModel } from '../../database/mongodb/OperationClip'
import group_template from '../../template/mail/group.template'
import SendMail from '../../libs/send-mail-new'

import SSH from 'ssh-exec'

const routes = Router();


const IS_DEV = Config.isDev();

if (IS_DEV) {
  routes.get('/video/:project_seq(\\d+)/:scale', Wrap(async(req, res) => {
    const project_seq = req.params.project_seq;
    const scale = Util.parseFloat(req.params.scale, 1);
    const video_project = await VideoProjectModel.findOneById(project_seq);
    const sequence_list = video_project.sequence_list;
    const sequence_model_list = [];
    for (let i = 0; i < sequence_list.length; i++) {
      const sequence_model = new SequenceModel().init(sequence_list[i]);
      if (sequence_model.type) {
        sequence_model_list.push(sequence_model.getXmlJson(i, scale));
      }
    }

    const video_xml_json = {
      "VideoInfo": {
        "MediaInfo": {
          "ContentId": video_project.content_id,
          "Width": 1920 * scale,
          "Height": 1080 * scale,
        },
        "SequenceList": {
          "Sequence": sequence_model_list
        }
      }
    };

    await Util.writeXmlFile(ServiceConfig.get('media_root') + video_project.project_path, 'video_project.xml', video_xml_json);

    res.json(video_xml_json);
  }));

  routes.get('/media', Wrap(async (req, res) => {
    const file_name = 'birdman.mkv';
    const url = 'd:\\\\movie\\마녀.mkv';
    const media_info = await Util.getMediaInfo(url);
    const type = await Util.getFileType(url, file_name);
    const result = new StdObject();
    result.add('media_info', media_info);
    result.add('type', type);
    res.json(result);
  }));

  routes.get('/co/:code', Wrap(async (req, res) => {
    const code = req.params.code;
    res.send(Util.colorCodeToHex(code));
  }));

  routes.get('/crypto', Wrap(async (req, res) => {
    const data = {
      r: Util.getRandomString(5),
      s: 155
    };

    const enc_text = Util.encrypt(data);
    const dec = JSON.parse(Util.decrypt(enc_text));

    const output = new StdObject();
    output.add("enc", enc_text);
    output.add("dec", dec);

    res.json(output);
  }));

  routes.get('/token', Wrap(async (req, res) => {
    const result = await Auth.verifyToken(req);
    res.json(result);
  }));

  routes.get('/uuid', Wrap(async (req, res) => {
    const uuid = await Util.getUuid();
    const output = new StdObject();
    output.add('uuid', uuid);

    res.json(output);
  }));

  routes.get('/forward', Wrap(async (req, res, next) => {
    const url = 'http://localhost:3000/api/v1/operations/9/request/analysis';
    const admin_member_info = {
      seq: 0,
      role: Role.ADMIN
    };
    const token_result = Auth.generateTokenByMemberInfo(admin_member_info);
    const forward_result = await Util.forward(url, 'POST', token_result.token);
    res.json(forward_result);
  }));

  routes.post('/burning', Wrap(async (req, res, next) => {
    req.accepts('application/json');
    req.setTimeout(0);
    log.d(req, req.body);
    const root_dir = req.body.root;
    const user_id = req.body.user_id;
    const url_prefix = req.body.url_prefix;
    const random_key = req.body.random_key === true;
    const file_list = await Util.getDirectoryFileList(root_dir);
    res.json(file_list);

    try {
      const auth_url = url_prefix + '/api/demon/auth';
      const batch_url = url_prefix + '/api/demon/batch/operation';
      log.d(req, 'urls', auth_url, batch_url);
      const auth_params = {
        "user_id": user_id
      };
      const auth_result = await Util.forward(auth_url, 'POST', null, auth_params);
      if (!auth_result || auth_result.error !== 0) {
        log.e(req, 'request auth error', auth_result);
        return;
      }
      const auth_token = auth_result.variables.token;
      const trans_reg = /^(Proxy|Trans)_/i;
      for (let i = 0; i < file_list.length; i++) {
        const file = file_list[i];
        if (file.isDirectory()) {
          const directory_name = file.name;
          const target_dir = root_dir + '/' + directory_name;
          const seq_dir = target_dir + '/' + 'SEQ';
          const seq_file_list = await Util.getDirectoryFileList(seq_dir);
          log.d(req, i, seq_dir);
          if (seq_file_list) {
            const seq_list = [];
            for (let j = 0; j < seq_file_list.length; j++) {
              const seq_file = seq_file_list[j];
              if (!seq_file.isFile()) {
                continue;
              }
              const file_ext = Util.getFileExt(seq_file.name);
              if (file_ext === 'smil') {
                continue;
              }
              const seq_path = seq_dir + '/' + seq_file.name;
              const file_info = await Util.getFileStat(seq_path);
              if (file_info.size <= 0) {
                continue;
              }
              if (trans_reg.test(seq_file.name)) {
                continue;
              }
              const media_info = await Util.getMediaInfo(seq_path);
              if (media_info.media_type === Constants.VIDEO) {
                seq_list.push(seq_path);
              }
            }
            if (seq_list.length <= 0) {
              await Util.deleteDirectory(target_dir);
              log.d(req, 'delete dir', target_dir);
            } else {
              const request_data = {
                "data": seq_list
              };
              if (random_key) {
                request_data.key = Util.getContentId();
              } else {
                request_data.key = directory_name;
              }
              const batch_result = await Util.forward(batch_url, 'POST', auth_token, request_data);
              log.d(req, 'batch_result', request_data, batch_result);
            }
          }
        }
      }
    } catch (error) {
      log.e(req, error);
    }
  }));

  routes.delete('/dir', Wrap(async (req, res, next) => {
    req.accepts('application/json');
    req.setTimeout(0);
    log.d(req, req.body);
    const root_dir = req.body.root;
    await Util.deleteDirectory(root_dir);
    log.d(req, 'delete dir', root_dir);

    res.send(true);
  }));

  routes.get('/err', Wrap(async (req, res, next) => {

    const result1 = await Util.fileExists("\\\\192.168.0.112\\data_trans\\dev\\media\\test\\operation\\6227f7a0-d923-11e9-bcaf-81e66f898cf9\\SEQ\\PlayList.smi");
    const result2 = await Util.fileExists("\\\\192.168.0.112\\data_trans\\dev\\media\\test\\operation\\6227f7a0-d923-11e9-bcaf-81e66f898cf9\\SEQ\\PlayList.smil");
    const result3 = await Util.fileExists("\\\\192.168.0.112\\data_trans\\dev\\media\\test\\operation\\6227f7a0-d923-11e9-bcaf-81e66f898cf9\\SEQ\\Trans_6227f7a0-d923-11e9-bcaf-81e66f898cf9.mp4");
    log.d(req, "\\\\192.168.0.112\\data_trans\\dev\\media\\test\\operation\\6227f7a0-d923-11e9-bcaf-81e66f898cf9\\SEQ\\Trans_6227f7a0-d923-11e9-bcaf-81e66f898cf9.mp4");
    res.send({
      result1,
      result2,
      result3
    });
  }));

  const getHawkeyeMediaInfo = async (req, log_prefix, media_id) => {
    const media_info_data = {
      "MediaID": media_id
    };
    const media_info_api_params = querystring.stringify(media_info_data);
    const media_info_api_options = {
      hostname: '192.168.0.58',
      port: 8080,
      path: '/VCSAdminServer/ErrorReportMediaInfo.jsp?' + media_info_api_params,
      method: 'GET'
    };
    const media_info_api_url = 'http://192.168.0.58:8080/VCSAdminServer/ErrorReportMediaInfo.jsp?' + media_info_api_params;
    log.d(req, `${log_prefix} hawkeye media info api url: ${media_info_api_url}`);

    const media_info_request_result = await Util.httpRequest(media_info_api_options, false);
    return new VideoInfo().getFromHawkEyeXML(await Util.loadXmlString(media_info_request_result));
  };

  const getHawkeyeIndexInfo = async (req, log_prefix, media_id, media_info) => {
    const total_frame = media_info.total_frame;
    const total_time = media_info.total_time;
    const fps = media_info.fps;
    log.d(req, media_info.toJSON());
    const fps_sec = 1 / fps;
    const index_list_data = {
      "MediaID": media_id,
      "CountOfPage": 2000
    };
    const index_list_api_params = querystring.stringify(index_list_data);
    const index_list_api_options = {
      hostname: '192.168.0.58',
      port: 8080,
      path: '/VCSAdminServer/ErrorReportImage.jsp?' + index_list_api_params,
      method: 'GET'
    };
    const index_list_api_url = 'http://192.168.0.58:8080/VCSAdminServer/ErrorReportImage.jsp?' + index_list_api_params;
    log.d(req, `${log_prefix} hawkeye index list api url: ${index_list_api_url}`);

    const index_list_request_result = await Util.httpRequest(index_list_api_options, false);
    const index_list_xml_info = await Util.loadXmlString(index_list_request_result);
    if (!index_list_xml_info || index_list_xml_info.errorcode || Util.isEmpty(index_list_xml_info.errorreport) || Util.isEmpty(index_list_xml_info.errorreport.frameinfo)) {
      if (index_list_xml_info && index_list_xml_info.errorcode && index_list_xml_info.errorcode.state) {
        throw new StdObject(3, Util.getXmlText(index_list_xml_info.errorcode.state), 500);
      } else {
        throw new StdObject(3, "XML 파싱 오류", 500);
      }
    }

    let index_info_list = [];
    const index_info_map = {};
    const range_index_list = [];
    const tag_map = {};
    const type_analysis_map = {};
    let total_action_count = 0;
    let frame_info = index_list_xml_info.errorreport.frameinfo;
    if (frame_info) {
      if (_.isArray(frame_info)) {
        frame_info = frame_info[0];
      }
      const index_xml_list = frame_info.item;
      if (index_xml_list) {
        for (let i = 0; i < index_xml_list.length; i++) {
          const index_info = await new IndexInfo().getFromHawkeyeXML(index_xml_list[i], false);
          if (!index_info.isEmpty()) {
            const type_code = index_info.code;
            if (index_info.start_frame > 1 && index_info.start_time <= 0) {
              index_info.start_time = index_info.start_frame * fps_sec;
            }
            if (index_info.is_range) {
              range_index_list.push(index_info);
            } else {
              const saved_index_info = index_info_map[index_info.start_frame];
              if (saved_index_info) {
                saved_index_info.tag_map[type_code] = true;
              } else {
                index_info_map[index_info.start_frame] = index_info;
              }
            }
            if (!type_analysis_map[type_code]) {
              type_analysis_map[type_code] = {
                code: type_code,
                name: index_info.state,
                total_frame: 0,
                last_end_frame: 0,
                uptime: 0,
                uptime_rate: 0,
                action_count: 0,
                timeline: [],
              };
            }
          }
        }
      }
      index_info_list = _.orderBy(index_info_map, ['start_frame'], ['asc']);
      let prev_info = index_info_list[0];
      for (let i = 1; i < index_info_list.length; i++) {
        const current_info = index_info_list[i];
        prev_info.end_frame = current_info.start_frame - 1;
        prev_info.end_time = current_info.start_time;
        set_range_tags(range_index_list, current_info);
        current_info.tags = _.keys(current_info.tag_map);
        prev_info = current_info;
      }
      prev_info.end_frame = total_frame;
      prev_info.end_time = total_time;
      for (let i = 1; i < index_info_list.length; i++) {
        const index_info = index_info_list[i];
        if (index_info.end_frame <= 0) break;
        for (let j = 0; j < index_info.tags.length; j++) {
          const tag_info = type_analysis_map[index_info.tags[j]];
          tag_info.total_frame += index_info.end_frame - index_info.start_frame;
          tag_info.uptime += index_info.end_time - index_info.start_time;
          tag_info.uptime_rate = tag_info.uptime / total_time;
          if (tag_info.last_end_frame !== index_info.start_frame) {
            tag_info.timeline.push({ start_time: index_info.start_time, end_time: index_info.end_time });
            tag_info.action_count++;
            tag_map[tag_info.code] = tag_info.action_count;
            total_action_count++;
          } else {
            tag_info.timeline[tag_info.timeline.length - 1].end_time = index_info.end_time;
          }
          tag_info.last_end_frame = index_info.end_frame + 1;
        }
      }
    }
    const result = {};
    result.summary = {};
    result.summary.tag_list = _.keys(tag_map);
    result.summary.tag_count_map = tag_map;
    result.summary.total_time = total_time;
    result.summary.total_frame = total_frame;
    result.summary.total_action_count = total_action_count;
    result.summary.total_index_count = index_info_list.length;
    result.summary.fps = fps;
    result.index_info_list = index_info_list;
    result.analysis_data = type_analysis_map;
    return result;
  };

  const set_range_tags = (range_index_list, index_info) => {
    const start_frame = index_info.start_frame;
    range_index_list.forEach((range_info) => {
      if (range_info.start_frame <= start_frame && range_info.end_frame >= start_frame) {
        index_info.tag_map[range_info.code] = true;
      }
    });
  };

  routes.post('/wiki', Wrap(async (req, res, next) => {
    const media_id_list = req.body.media_id_list
    const query_result = {};
    for (let i = 0; i < media_id_list.length; i++) {
      try {
        const { operation_info } = await OperationService.getOperationInfo(DBMySQL, media_id_list[i].operation_seq, null, false, false)
        const media_info = await getHawkeyeMediaInfo(req, '[test]', media_id_list[i].media_id);
        const index_info = await getHawkeyeIndexInfo(req, '[test]', media_id_list[i].media_id, media_info);
        const delete_expansion_result = await OperationExpansionDataService.deleteOperationExpansionDataByOperationSeq(DBMySQL, operation_info.seq)
        const delete_analysis_result = await OperationAnalysisService.deleteOperationAnalysisOperationSeq(operation_info.seq);
        const delete_video_index_result = await VideoIndexInfoModel.deleteByOperation(operation_info.seq)
        const analysis_result = await OperationAnalysisService.createOperationAnalysis(operation_info, index_info.summary, index_info.analysis_data);
        const expansion_result = await OperationExpansionDataService.createOperationExpansionData(DBMySQL, operation_info, index_info.summary);
        const video_index_result = await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info, index_info.index_info_list, index_info.summary.tag_list)
        query_result[media_id_list[i].media_id] = {
          delete_expansion_result: !Util.isEmpty(delete_expansion_result),
          delete_analysis_result: !Util.isEmpty(delete_analysis_result),
          delete_video_index_result: !Util.isEmpty(delete_video_index_result),
          analysis_result: !Util.isEmpty(analysis_result),
          expansion_result: !Util.isEmpty(expansion_result),
          video_index_result: !Util.isEmpty(video_index_result)
        };
      } catch (error) {
        log.error(req, '[test]', error.stack)
        res.send(error.message);
        return
      }
    }

    const result = new StdObject();
    // result.add('index_info_list', index_info_list);
    result.adds(query_result);
    res.json(result);
  }));

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
        continue;
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
      });
      operation_info.clip_list = clip_result_list
      result.operation_list.push(operation_info)
    }

    return result;
  }

  routes.post('/clip_list', Wrap(async (req, res) => {
    req.accepts('application/json');

    const result = []
    const member_seq_list = req.body.member_seq_list;
    for (let i = 0; i < member_seq_list.length; i++) {
      const clip_list = await getClipListByMemberSeq(member_seq_list[i])
      result.push(clip_list)
    }
    res.json(result);
  }));

  routes.get('/clip_list/:member_seq', Wrap(async (req, res) => {
    const member_seq = req.params.member_seq;
    res.json(await getClipListByMemberSeq(member_seq));
  }));

  routes.get('/t', Wrap(async (req, res) => {
    res.json(ServiceConfig.supporterEmailList());
  }));

  routes.get('/ssh', Wrap(async (req, res) => {
    const cmd = 'sh /volume1/datas/storage_json.sh'
    const host = '192.168.0.26'

    const ssh_result = await Util.sshExec(cmd, host, 20322);
    if (ssh_result.success && ssh_result.result) {
      res.json(JSON.parse(ssh_result.result));
    } else {
      res.json(ssh_result);
    }
  }));

  routes.get('/mail', Wrap(async (req, res) => {
    const mail_to = ['황우중 <hwj@mteg.co.kr>', 'weather8128@naver.com']
    const title = '이메일 발송 테스트'
    const body = group_template.inviteGroupMember()
    const send_result = await new SendMail().sendMailHtml(mail_to, title, body, '황우중')
    res.json(send_result)
  }));
}

export default routes;
