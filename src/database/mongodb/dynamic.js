import mongoose from 'mongoose'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    codes: { type: Object, index: false, require: false, unique: false },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}

const schema_field_infos = getFieldInfos()

const dynamic_schema = new Schema(schema_field_infos, { strict: false })

dynamic_schema.statics.findData = function (data_type) {
  return this.findOne({ data_type }, '-_id -member_seq -created_date -modify_date')
}

dynamic_schema.statics.findAll = function () {
  return this.find({})
}

dynamic_schema.statics.createDynamic = function (data) {
  const model = new this(data)
  return model.save()
}

dynamic_schema.statics.updateById = function (id, data) {
  data.modify_date = Date.now()
  return this.findOneAndUpdate({ _id: id }, data, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  })
}

dynamic_schema.statics.deleteById = function (id) {
  return this.findByIdAndDelete(id)
}

const dynamic_model = mongoose.model('dynamic', dynamic_schema)

export const DynamicModel = dynamic_model
