import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    codes: { type: Object, index: true, require: false, unique: true }
  };
};

const schema_field_infos = getFieldInfos();

const interrest_schema = new Schema(schema_field_infos, { strict: false });

interrest_schema.statics.findAll = function () {
  return this.find({});
};

const interrest_model = mongoose.model( 'interrest', interrest_schema );

export const InterrestModel = interrest_model;
export const InterrestField = getFieldInfos;
