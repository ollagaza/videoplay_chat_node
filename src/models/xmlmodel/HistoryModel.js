import ModelObject from '@/classes/ModelObject';
import Util from '@/utils/baseutil';
import log from "@/classes/Logger";

const MAX_HISTORY_COUNT = 3;

export default class HistoryModel extends ModelObject {
  constructor(...args) {
    super(...args);
  }

  addHistory = async (media_directory, action_type, change_index_list) => {
    if (!change_index_list || change_index_list.length <= 0) {
      return;
    }

    try {
      const history_id = new Date().getTime();
      const index_list_length = change_index_list.length;
      const index_list = new Array();
      for (const key in change_index_list) {
        index_list.push(change_index_list[key].unique_id);
      }
      const new_history = {
        "$": {
          "id": history_id,
          "action": action_type,
          "cursor": "y"
        },
        "firstIndex": [change_index_list[0].unique_id],
        "startFrame": [change_index_list[0].start_frame],
        "endFrame": [change_index_list[index_list_length - 1].end_frame],
        "indexList": [
          {
            "index": index_list
          }
        ]
      };

      let history_xml_info = await Util.loadXmlFile(media_directory, 'History.xml');
      if (history_xml_info && history_xml_info.historyInfo && history_xml_info.historyInfo.history) {
        let history_list = history_xml_info.historyInfo.history;
        if (history_list.length >= MAX_HISTORY_COUNT) {
          history_list = history_list.slice(history_list.length - MAX_HISTORY_COUNT + 1);
        }
        history_list.forEach((history) => {
          history.$.cursor = 'n';
        });
        history_list.push(new_history);

        history_xml_info.historyInfo.history = history_list;
      }
      else {
        history_xml_info = {
          "historyInfo": {
            "history":
              [new_history]
          }
        };
      }

      await Util.writeXmlFile(media_directory, 'History.xml', history_xml_info);
    }
    catch(error) {
      log.e(null, 'HistoryModel.addHistory', error);
    }
  }
}
