import ModelObject from '@/classes/ModelObject';
import HospitalInfo from "@/classes/surgbook/HospitalInfo";

let hospital_map = null;
let hospital_list = null;

export default class HospitalModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'hospital';
    this.selectable_fields = ['*'];
  }

  getHospitalList = async () => {
    if (hospital_list) {
      return hospital_list;
    }

    hospital_map = {};
    const result_list = await this.find(null, null, {name: "name", order: "asc"});
    if (!result_list || result_list.length <= 0) {
      return [];
    }

    const custom = [];
    const list = [];
    result_list.forEach((hospital) => {
      const hospital_info = new HospitalInfo(hospital);
      if (hospital_info.isCustom()) {
        custom.push(hospital_info);
      } else {
        list.push(hospital_info);
      }
      hospital_map[hospital_info.code] = hospital_info;
    });

    if (custom) {
      hospital_list = custom.concat(list);
    }
    else {
      hospital_list = list;
    }

    return hospital_list;
  };

  getHospitalNameByMemberInfo = async (member_info) => {
    await this.getHospitalList();
    const hospital_info = hospital_map[member_info.hospital_code];
    if (hospital_info) {
      if (hospital_info.isCustom()) {
        return member_info.custom_hospital;
      } else {
        return hospital_info.name;
      }
    }
  };
}
