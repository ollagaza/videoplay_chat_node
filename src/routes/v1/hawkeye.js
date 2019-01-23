import { Router } from 'express';
import _ from 'lodash';
import path from 'path';
import querystring from 'querystring';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import Util from '@/utils/baseutil';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import OperationModel from '@/models/OperationModel';
import SendMail from '@/classes/SendMail';
import {sync_one} from '@/routes/v1/sync';
import service_config from '@/config/service.config';
import VideoInfo from "@/classes/surgbook/VideoInfo";
import log from "@/classes/Logger";

const routes = Router();

/**
 * @swagger
 * tags:
 *  name: Hawkeye
 *  description: 호크아이 연동
 *
 */

/**
 * @swagger
 * /hawkeye/complete:
 *  get:
 *    summary: "호크아이 분석 완료 상태 업데이트"
 *    tags: [Hawkeye]
 *    produces:
 *    - "application/json"
 *    parameters:
 *    - name: "content_id"
 *      in: "query"
 *      description: "콘텐츠ID"
 *      required: true
 *      type: "string"
 *    - name: success
 *      in: "query"
 *      type: "string"
 *      description: "처리 결과. 성공: true or 1. 그 외 실패"
 *      required: true
 *    - name: error
 *      in: "query"
 *      type: "string"
 *      description: "에러 정보"
 *    responses:
 *      200:
 *        description: "성공여부"
 *        schema:
 *           $ref: "#/definitions/DefaultResponse"
 *
 */

const on_complete = Wrap(async(req, res) => {
  const token_info = req.token_info;
  const query_str = querystring.stringify(req.query);
  log.d(req, 'api 호출', query_str);

  const content_id = req.query.content_id;
  const success = ("" + req.query.success).toLowerCase();
  const is_success = success === 'true' || success === '1';
  let is_update_progress = false;
  let progress = req.query.progress;
  let state = req.query.State;
  if (_.isInteger(state) && _.isInteger(progress)) {
    if (parseInt(state) <= 6) {
      is_update_progress = true;
      progress = parseInt(progress, 10);
    }
  }


  let is_complete = false;
  let message = '';
  let result = null;
  let media_info_api_url = null;
  let media_info_api_result = null;
  let index_list_api_url = null;
  let index_list_api_result = null;
  try {
    const operation_model = new OperationModel({ database });
    const operation_info = await operation_model.getOperationInfoByContentId(content_id);
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2, '등록된 컨텐츠가 없습니다.', 400);
    }
    const operation_seq = operation_info.seq;

    if (is_success) {
      if (Util.isEmpty(content_id)) {
        throw new StdObject(1, '잘못된 파라미터', 400);
      }

      const service_info = service_config.getServiceInfo();
      const media_info_data = {
        "ContentID": content_id,
        "EndCheck": "false"
      };
      const media_info_api_params = querystring.stringify(media_info_data);

      const media_info_api_options = {
        hostname: service_info.hawkeye_server_domain,
        port: service_info.hawkeye_server_port,
        path: service_info.hawkeye_content_info_api + '?' + media_info_api_params,
        method: 'GET'
      };
      media_info_api_url = 'http://' + service_info.hawkeye_server_domain + ':' + service_info.hawkeye_server_port + service_info.hawkeye_content_info_api + '?' + media_info_api_params;
      log.d(req, 'call hawkeye content info api', media_info_api_url);

      const media_info_request_reuslt = await Util.httpRequest(media_info_api_options, false);
      const video_info = new VideoInfo().getFromHawkEyeXML(await Util.loadXmlString(media_info_request_reuslt));
      if (video_info.isEmpty()) {
        throw new StdObject(video_info.error_code, video_info.message, 500);
      }
      const media_xml_info = {
        "MediaInfo": {
          "Media": video_info.getXmlJson()
        }
      };
      await Util.writeXmlFile(operation_info.media_directory, 'Media.xml', media_xml_info);
      const video_file_name = video_info.video_name;
      media_info_api_result = "video_file_name: " + video_file_name + ", path: " + operation_info.media_directory + 'Media.xml';

      const index_list_data = {
        "ContentID": content_id,
        "PageNum": 1,
        "CountOfPage": 1000,
        "Type": 1,
        "PassItem": "false"
      };
      const index_list_api_params = querystring.stringify(index_list_data);

      const index_list_api_options = {
        hostname: service_info.hawkeye_server_domain,
        port: service_info.hawkeye_server_port,
        path: service_info.hawkeye_index_list_api + '?' + index_list_api_params,
        method: 'GET'
      };
      index_list_api_url = 'http://' + service_info.hawkeye_server_domain + ':' + service_info.hawkeye_server_port + service_info.hawkeye_index_list_api + '?' + index_list_api_params;
      log.d(req, 'call hawkeye index list api', index_list_api_url);

      const index_list_request_result = await Util.httpRequest(index_list_api_options, false);
      const index_list_xml_info = await Util.loadXmlString(index_list_request_result);
      if (!index_list_xml_info || !index_list_xml_info.errorimage || index_list_xml_info.errorimage.error) {
        if (index_list_xml_info.errorimage && index_list_xml_info.errorimage.error) {
          throw new StdObject(Util.getXmlText(index_list_xml_info.errorimage.error), Util.getXmlText(index_list_xml_info.errorimage.msg), 500);
        } else {
          throw new StdObject(3, "XML 파싱 오류", 500);
        }
      }

      const index_file_list = [];
      let frame_info = index_list_xml_info.errorimage.frameinfo;
      if (frame_info) {
        if (_.isArray(frame_info)) {
          frame_info = frame_info[0];
        }
        const index_xml_list = frame_info.item;
        if (index_xml_list) {
          for (let i = 0; i < index_xml_list.length; i++) {
            const index_xml_info = index_xml_list[i];
            const image_path = Util.getXmlText(index_xml_info.orithumb);
            const image_file_name = path.basename(image_path);
            index_file_list.push(video_file_name + "_" + image_file_name);
          }
        }
      }
      const index_xml_info = {
        "IndexInfo": {
          "Index": index_file_list
        }
      };
      await Util.writeXmlFile(operation_info.media_directory, 'Index2.xml', index_xml_info);
      index_list_api_result = "인덱스 개수: " + (index_file_list.length) + "개, path: " + operation_info.media_directory + 'Index2.xml';

      await operation_model.updateAnalysisComplete(operation_seq,true);
      await sync_one(token_info, operation_seq, content_id);

      is_complete = true;
      result = new StdObject();
    } else if (is_update_progress) {
      await operation_model.updateAnalysisProgress(operation_seq, progress);
      message = `호크아이 진행상태 업데이트 : Progress = ${progress}`;
      result = new StdObject();
    } else {
      message = req.query.error ? req.query.error : '호크아이 에러 발생';
      result = new StdObject(4, message, 400);
    }
    log.d(req, message);
  } catch (error) {
    if(error instanceof StdObject) {
      result = error;
      message = error.message;
    } else {
      result = new StdObject(3, error.message, 500);
      message = error.stack;
    }
    log.e(req, error);
  }

  if (req.query.success != null) {
    const send_mail = new SendMail();
    const mail_to = ["hwj@mteg.co.kr"];
    const subject = "호크아이 분석 완료 요청";
    let context = "";
    context += `요청 일자: ${Util.currentFormattedDate()}<br/>\n`;
    context += `content_id: ${content_id}<br/>\n`;
    context += `요청 Params: ${query_str}<br/>\n`;
    context += `동영상 정보 요청: ${media_info_api_url}<br/>\n`;
    context += `동영상 정보 결과: ${media_info_api_result}<br/>\n`;
    context += `인덱스 목록 요청: ${index_list_api_url}<br/>\n`;
    context += `인덱스 목록 결과: ${index_list_api_result}<br/>\n`;
    context += `처리 결과: ${is_complete}<br/>\n`;
    context += `에러: ${Util.nlToBr(message)}<br/>\n`;
    await send_mail.sendMailHtml(mail_to, subject, context);
  }

  res.json(result);
});

routes.get('/complete', Auth.isAuthenticated(), on_complete);
routes.post('/complete', Auth.isAuthenticated(), on_complete);

export default routes;
