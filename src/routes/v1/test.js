import { Router } from 'express';
import _ from 'lodash';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import log from "../../libs/logger";

const routes = Router();

import Config from "../../config/config";
import SequenceModel from '../../models/sequence/SequenceModel';
import { VideoProjectModel } from '../../database/mongodb/VideoProject';

import IndexInfo from "../../wrapper/xml/IndexInfo";

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
          const target_dir = root_dir + Constants.SEP + directory_name;
          const seq_dir = target_dir + Constants.SEP + 'SEQ';
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
              const seq_path = seq_dir + Constants.SEP + seq_file.name;
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

  const getHawkeyeXmlInfo = async (req, log_prefix) => {
    const index_list_api_options = {
      hostname: 'localhost',
      port: 80,
      path: '/test/ErrorReportImage.xml',
      method: 'GET'
    };
    const index_list_api_url = 'http://localhost/test/ErrorReportImage.xml';
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
    const tag_info_map = {};
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
            tag_map[type_code] = true;
            if (!tag_info_map[type_code]) {
              tag_info_map[type_code] = {
                code: type_code,
                name: index_info.state,
                total_frame: 0,
                last_end_frame: 0,
                uptime: 0,
                uptime_list: [],
              };
            }
          }
        }
      }
      const set_range_tags = (index_info) => {
        const start_frame = index_info.start_frame;
        range_index_list.forEach((range_info) => {
          if (range_info.start_frame <= start_frame && range_info.end_frame >= start_frame) {
            index_info.tag_map[range_info.code] = true;
          }
        });
      };
      index_info_list = _.orderBy(index_info_map, ['start_frame'], ['asc']);
      let prev_info = index_info_list[0];
      for (let i = 1; i < index_info_list.length; i++) {
        const current_info = index_info_list[i];
        prev_info.end_frame = current_info.start_frame - 1;
        prev_info.end_time = current_info.start_time;
        set_range_tags(current_info);
        current_info.tags = _.keys(current_info.tag_map);
        prev_info = current_info;
      }
      for (let i = 1; i < index_info_list.length; i++) {
        const index_info = index_info_list[i];
        if (index_info.end_frame <= 0) break;
        for (let j = 0; j < index_info.tags.length; j++) {
          const tag_info = tag_info_map[index_info.tags[j]];
          tag_info.total_frame += index_info.end_frame - index_info.start_frame;
          tag_info.uptime += index_info.end_time - index_info.start_time;
          if (tag_info.last_end_frame !== index_info.start_frame) {
            tag_info.uptime_list.push({ start_time: index_info.start_time, end_time: index_info.end_time });
          } else {
            tag_info.uptime_list[tag_info.uptime_list.length - 1].end_time = index_info.end_time;
          }
          tag_info.last_end_frame = index_info.end_frame + 1;
        }
      }
    }
    const result = {};
    result.tags = _.keys(tag_map);
    result.index_info_list = index_info_list;
    result.tag_info_map = tag_info_map;
    return result;
  };

  routes.get('/idx', Wrap(async (req, res, next) => {
    const index_info_list = await getHawkeyeXmlInfo(req, '[test]');
    const result = new StdObject();
    result.add('index_info_list', index_info_list);
    res.json(result);
  }));
}

export default routes;
