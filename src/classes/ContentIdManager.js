import _ from 'lodash';
import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';
import log from "@/classes/Logger";

const service_info = service_config.getServiceInfo();
const getContentId = async () => {
  const request_options = {
    hostname: service_info.cms_server_domain,
    port: service_info.cms_server_port,
    path: service_info.cms_get_key_api,
    method: 'GET'
  };

  const api_url = 'http://' + service_info.cms_server_domain + ':' + service_info.cms_server_port + service_info.cms_get_key_api;
  log.d(null, 'ContentIdManager.getContentId - call getContentId', api_url);
  try {
    const api_request_result = await Util.httpRequest(request_options, false);
    log.d(null, 'ContentIdManager.getContentId - result', api_url, api_request_result);
    if (Util.isEmpty(api_request_result)) {
      return null;
    } else {
      return _.trim(api_request_result);
    }
  } catch (e) {
    log.e(null, 'ContentIdManager.getContentId', api_url, e);
    return null;
  }
};

export default {
  "getContentId": getContentId
}
