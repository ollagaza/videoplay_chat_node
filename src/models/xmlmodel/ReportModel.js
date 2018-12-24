import ModelObject from '@/classes/ModelObject';
import ReportEntryInfo from "@/classes/surgbook/ReportEntryInfo";
import Util from '@/utils/baseutil';

const DOC_VERSION = "1.0";

export default class ReportModel extends ModelObject {
  constructor(...args) {
    super(...args);
  }

  getReportInfo = async (operation_info) => {
    const report_xml_info = await Util.loadXmlFile(operation_info.media_directory, 'Report.xml');
    const entry_list = new Array();

    if (report_xml_info
        && report_xml_info.OperativeReport
        && report_xml_info.OperativeReport.$
        && report_xml_info.OperativeReport.$.doc_version
        && report_xml_info.OperativeReport.Service
        && report_xml_info.OperativeReport.Service[0].Operation
        && report_xml_info.OperativeReport.Service[0].Operation[0].Entry ) {
      const entry_xml_list = report_xml_info.OperativeReport.Service[0].Operation[0].Entry;
      entry_xml_list.forEach((entry_xml_xml) => {
        const entry_info = new ReportEntryInfo().getFromXML(entry_xml_xml, operation_info);
        entry_list.push(entry_info);
      });
    }

    return entry_list;
  }

  saveReportInfo = async (operation_info, report_info) => {
    const entry_list = new Array();
    report_info.sheet_list.forEach((entry) => {
      const entry_info = new ReportEntryInfo(entry);
      entry_info.setExportXml(true);
      entry_list.push(entry_info);
    });

    const report_xml_json = {
      "OperativeReport": {
        "$": {
          "doc_version": DOC_VERSION
        },
        "Date": [ Util.currentFormattedDate('yyyy-mm-dd') ],
        "Patient": [
          {
            "_": "환자명",
            "Id": [ operation_info.patient_id ],
            "Birth": [ "" ],
            "Age": [ operation_info.patient_age ],
            "Sex": [ operation_info.patient_sex ],
            "Race": [ operation_info.patient_race ],
          }
        ],
        "Department": [
          {
            "Surgeon": [ operation_info.doctor_name ],
            "Doctor": [ "" ],
            "Anesthesia": [ "" ],
          }
        ],
        "Service": [
          {
            "_": [ operation_info.operation_name ],
            "PreOperative": [ operation_info.pre_operation ],
            "PostOperative": [ operation_info.post_operation ],
            "Operation": [
              {
                "Entry": entry_list
              }
            ],
            "Header": [ "" ]
          }
        ]
      }
    };

    await Util.writeXmlFile(operation_info.media_directory, 'Report.xml', report_xml_json);

    return entry_list.length;
  }
}
