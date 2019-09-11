import {Router} from 'express';
import _ from 'lodash';
import querystring from 'querystring';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import FileInfo from '@/classes/surgbook/FileInfo';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import log from "@/classes/Logger";
import roles from "@/config/roles";
import mime from "mime-types";
import service_config from "@/config/service.config";
import config from "@/config/config";
import ContentIdManager from '@/classes/ContentIdManager'
import {VideoProjectModel} from '@/db/mongodb/model/VideoProject';
import SequenceModel from '@/models/sequence/SequenceModel';
import text2png from "../../utils/textToImage";
import Constants from '@/config/constants';

const IS_DEV = config.isDev();

const routes = Router();

if (IS_DEV) {
  routes.get('/video/:project_seq(\\d+)/:scale', wrap(async(req, res) => {
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

    await Util.writeXmlFile(service_config.get('media_root') + video_project.project_path, 'video_project.xml', video_xml_json);

    res.json(video_xml_json);
  }));

  routes.get('/media', wrap(async (req, res) => {
    const file_name = 'birdman.mkv';
    const url = 'd:\\\\movie\\마녀.mkv';
    const media_info = await Util.getMediaInfo(url);
    const type = await Util.getFileType(url, file_name);
    const result = new StdObject();
    result.add('media_info', media_info);
    result.add('type', type);
    res.json(result);
  }));

  routes.get('/co/:code', wrap(async (req, res) => {
    const code = req.params.code;
    res.send(Util.colorCodeToHex(code));
  }));

  routes.get('/crypto', wrap(async (req, res) => {
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

  routes.get('/token', wrap(async (req, res) => {
    const result = await Auth.verifyToken(req);
    res.json(result);
  }));

  routes.get('/uuid', wrap(async (req, res) => {
    const uuid = await Util.getUuid();
    const output = new StdObject();
    output.add('uuid', uuid);

    res.json(output);
  }));

  routes.get('/forward', wrap(async (req, res, next) => {
    const url = 'http://localhost:3000/api/v1/operations/9/request/analysis';
    const admin_member_info = {
      seq: 0,
      role: roles.ADMIN
    };
    const token_result = Auth.generateTokenByMemberInfo(admin_member_info);
    const forward_result = await Util.forward(url, 'POST', token_result.token);
    res.json(forward_result);
  }));

  routes.post('/burning', wrap(async (req, res, next) => {
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
                request_data.key = await ContentIdManager.getContentId();
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

  routes.delete('/dir', wrap(async (req, res, next) => {
    req.accepts('application/json');
    req.setTimeout(0);
    log.d(req, req.body);
    const root_dir = req.body.root;
    await Util.deleteDirectory(root_dir);
    log.d(req, 'delete dir', root_dir);

    res.send(true);
  }));

  routes.get('/err', wrap(async (req, res, next) => {
    throw new StdObject(-1, 'test', 400);

    res.send(true);
  }));
}

export default routes;
