import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import { MedicalModel } from '../../database/mongodb/Medical'
import { InterestModel } from '../../database/mongodb/Interest'
import log from '../../libs/logger'

const MongoDataServiceClass = class {
  constructor () {
    this.log_prefix = 'MongoDataService'
    this.MEDICAL = 'medical'
    this.INTEREST = 'interrest'

    this.medial_info = null
    this.interest_info = null
  }

  init = async () => {
    const medical_result = await MedicalModel.findAll()
    if (medical_result && medical_result[0]) {
      this.medial_info = medical_result[0].toJSON ? medical_result[0].toJSON() : medical_result[0]._doc
    } else {
      this.medial_info = {}
    }
    const interest_result = await InterestModel.findAll()
    if (interest_result && interest_result[0]) {
      this.interest_info = interest_result[0].toJSON ? interest_result[0].toJSON() : interest_result[0]._doc
    } else {
      this.interest_info = {}
    }
  }

  getMedicalInfo = (lang = 'kor') => {
    return _.sortBy(this.medial_info[lang], 'text')
  }

  getInterestInfo = (lang = 'kor') => {
    return _.sortBy(this.interest_info[lang], 'text')
  }

  getData = (data_type = null, lang= 'kor') => {
    let output = new StdObject();
    switch (data_type) {
      case this.MEDICAL:
        output.add(this.MEDICAL, this.getMedicalInfo(lang))
        break;
      case this.INTEREST:
        output.add(this.INTEREST, this.getInterestInfo(lang))
        break;
      default:
        output.add(this.MEDICAL, this.getMedicalInfo(lang))
        output.add(this.INTEREST, this.getInterestInfo(lang))
        break;
    }
    return output;
  }
}

const mongo_data_service = new MongoDataServiceClass()

export default mongo_data_service
