import ModelObject from '@/classes/ModelObject';
import HospitalInfo from "@/classes/surgbook/HospitalInfo";

export default class HospitalModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'hospital';
    this.selectable_fields = ['*'];
  }

  getHospitalList = async () => {
    const result_list = await this.find(null, null, {name: "name", order: "asc"});
    if (!result_list || result_list.length <= 0) {
      return new Array();
    }

    const custom = new Array();
    const hospital_list = new Array();
    result_list.forEach((hospital) => {
      const hospital_info = new HospitalInfo(hospital);
      if (hospital_info.isCustom()) {
        custom.push(hospital_info);
      } else {
        hospital_list.push(hospital_info);
      }
    });

    if (custom) {
      return custom.concat(hospital_list);
    }
    else {
      return hospital_list;
    }
  }
}
