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
import TestModel from '@/db/mongodb/model/test';
import ContentIdManager from '@/classes/ContentIdManager'
import {VideoProjectModel} from '@/db/mongodb/model/VideoProject';
import SequenceModel from '@/models/sequence/SequenceModel';
import text2png from "../../utils/textToImage";

const IS_DEV = config.isDev();

const routes = Router();

if (IS_DEV) {
  routes.post('/image', wrap(async(req, res) => {
    req.accepts('application/json');

    const options = {
      fontSize: 36,
      fontName: 'NanumBarunGothic',
      textAlign: 'right',
      textColor: 'rgba(255, 255, 255, 1)',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      lineSpacing: 14,
      padding: 18,
      maxWidth: 1200,
      multiLine: true,
      localFontName: 'NanumBarunGothic',
      localFontPath: process.cwd() + '\\font\\NanumBarunGothic.ttf',
      startX: 1000,
      startY: 900
    };

    const text = req.body.text;
    const image_data = await text2png(text, options);
    res.send(await Util.writeFile('d:\\out.png', image_data.data));
  }));

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

  routes.get('/reg', wrap(async (req, res) => {
    const check_regex = /^\/static\/(index|storage)\/(.+)$/g;
    const url = '/static/storage/EHMD/OBG/강소라/180504_000167275_W_385/SEQ/Trans_180504_000167275_W_385_SEQ.mp4';
    log.d(req, url.match(check_regex));

    res.send(Util.urlToPath(url));
  }));

  routes.get('/co/:code', wrap(async (req, res) => {
    const code = req.params.code;
    res.send(Util.colorCodeToHex(code));
  }));

  routes.post('/mon', wrap(async (req, res) => {
    const sequence = req.body;
    const result = await TestModel.findBySequence(sequence);
    res.json(result);
  }));

  routes.get('/mon/:id', wrap(async (req, res) => {
    const id = req.params.id;
    const result = await TestModel.findOneById(id);
    res.json(result);
  }));

  routes.get('/mon', wrap(async (req, res) => {
    const content_id = await ContentIdManager.getContentId();
    const result = await TestModel.create(content_id, [1, 5, 10]);
    res.json(result);
  }));

  routes.get('/t/:id', wrap(async (req, res) => {
    console.log(req.params.id);
    res.send("" + Util.getRandomNumber(parseInt(req.params.id)));
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

  routes.get('/xml/:xml_name', wrap(async (req, res) => {
    const xml_name = req.params.xml_name;
    const media_path = "\\\\192.168.1.54\\dev\\data\\EHMD\\OBG\\강소라\\180504_000167275_W_385\\";

    const json = await Util.loadXmlFile(media_path, xml_name + '.xml');
    const output = new StdObject();
    output.add('xml', json);

    await Util.writeXmlFile(media_path, xml_name + '2.xml', json);

    res.json(output);
  }));

  routes.get('/replace', wrap(async (req, res) => {
    const source = "SEQ\\Trans_180510_000167418_M_s001.mp4";
    const dest_rename_regex = /^[\w]+\\([\w]+)\.([\w]+)$/i;
    const start_frame = 12456;
    const end_frame = 35717;
    res.send(source.replace(dest_rename_regex, 'Clip\\$1_' + start_frame + '_' + end_frame + '.$2'));
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

  routes.get('/deletedir', wrap(async (req, res) => {
    let result = null;
    try{
      result = await Util.deleteDirectory("C:\\trash\\1547023141_1032_39_test2");
    } catch (e) {
      result = e;
      log.e(req, e);
    }

    const output = new StdObject();
    output.add('result', result);

    res.json(output);
  }));

  routes.get('/meta', wrap(async (req, res) => {
    const dir = "\\\\192.168.0.54\\surgbook\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\SEQ";
    const file_list = Util.getDirectoryFileList(dir);
    for (let i = 0; i < file_list.length; i++) {
      const file = file_list[i];
      if (file.isFile()) {
        const file_path = dir + "\\" + file.name;
        const file_info = (await new FileInfo().getByFilePath(file_path, "\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\", file.name));
        log.d(file_info.toJSON());
      }

    }
    const output = new StdObject();
    output.add('size', await Util.getDirectoryFileSize(dir));
    res.json(output);
  }));

  routes.get('/request', wrap(async (req, res) => {
    const service_info = service_config.getServiceInfo();
    const dir = "\\\\192.168.0.54\\surgbook\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\SEQ";
    const query_data = {
      "DirPath": dir,
      "ContentID": "b50d2f70-1c37-11e9-b69d-b94419138e86"
    };
    const query_str = querystring.stringify(query_data);

    const request_options = {
      hostname: service_info.trans_server_domain,
      port: service_info.trans_server_port,
      path: service_info.hawkeye_index_list_api + '?' + query_str,
      method: 'GET'
    };
    const api_url = 'http://' + service_info.trans_server_domain + ':' + service_info.trans_server_port + service_info.hawkeye_index_list_api + '?' + query_str;
    log.d(api_url);

    let api_request_result = null;
    let is_execute_success = false;
    try {
      api_request_result = await Util.httpRequest(request_options, false);
      is_execute_success = api_request_result && api_request_result.toLowerCase() === 'done';
    } catch (e) {
      log.e(e);
      api_request_result = e.message;
    }
    const output = new StdObject();
    output.add('api_request_result', api_request_result);
    output.add('is_execute_success', is_execute_success);
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

  routes.get('/dimension/:name', wrap(async (req, res, next) => {
    const name = req.params.name;
    const origin_video_path = '\\\\192.168.1.54\\dev\\data\\' + name;
    const thumbnail_full_path = '\\\\192.168.1.54\\dev\\data\\' + Date.now() + '.png';
    res.json(await Util.getThumbnail(origin_video_path, thumbnail_full_path, 0, 300, 400));
  }));

  routes.get('/mail', wrap(async (req, res, next) => {
    const send_mail = new SendMail();
    // const mail_to = ["hwj@mteg.co.kr", "ytcho@mteg.co.kr"];
    const mail_to = ["hwj@mteg.co.kr", "weather8128@gmail.com"];
    const subject = "[MTEG ERROR] 트랜스코딩 에러";
    let context = `요청 일자: 2019-04-07 13:06:06<br/>
content_id: 46cb86b9-5774-11e9-bb8e-e0d55ee22ea6<br/>
operation_seq : 336<br/>
error_seq: 19<br/>
에러: make Mergelist [empty directory]<br/>`;
    const send_mail_result = await send_mail.sendMailHtml(mail_to, subject, context);

    res.send(send_mail_result);
  }));

  routes.get('/filetype', wrap(async (req, res, next) => {
    let file_path = 'D:\\temp\\허주연-CCSVI (동영상)\\SEQ\\00381.MTS';
    // file_path = '\\\\192.168.1.54\\dev\\data\\EHMD\\OBG\\강소라\\180504_000150818_W_386\\SEQ\\180504_000150818_W_s001.mp4';
    // file_path = '\\\\192.168.1.54\\dev\\data\\1552025121549.png';
    file_path = '\\\\192.168.1.54\\dev\\data\\StreamingTest\\PlayList.smil';
    // file_path = 'D:\\11. A Winter Story.m4a';
    // file_path = '\\\\192.168.1.54\\dev\\data\\b.jpg';
    log.d(req, mime.lookup(file_path));
    const file_info = (await new FileInfo().getByFilePath(file_path, 'D:\\temp\\허주연-CCSVI (동영상)', '00381.MTS')).toJSON();
    const media_info = await Util.getMediaInfo(file_path);
    // const streams = JsonPath.value(video_info, '$..streams');
    log.d(req, media_info);

    res.json(file_info);
  }));
}

export default routes;
