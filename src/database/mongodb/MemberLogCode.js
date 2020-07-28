import mongoose from 'mongoose';
import LogCode_BasicData from '../../data/Mongo_MemberLogCodes_Data';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    version: { type: Number, index: true, require: false, unique: true },
    codes: { type: Object, index: true, require: false, unique: true }
  };
};

const schema_field_infos = getFieldInfos();

const logcode_schema = new Schema(schema_field_infos, { strict: false });

logcode_schema.statics.InsertDefaultData = function (log_code) {
  const model = LogCode_BasicData;

  if (log_code.length === 0 || log_code.version < model.version) {
    return this.updateOne({ id: log_code._id }, model);
  }
};

logcode_schema.statics.findAll = function () {
  return this.find({});
};

const logcode_model = mongoose.model( 'memberlogcode', logcode_schema );

export const LogCodeModel = logcode_model;
export const LogCodeField = getFieldInfos;
