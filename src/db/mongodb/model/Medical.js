import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    codes: { type: Object, index: true, require: false, unique: true }
  };
};

const schema_field_infos = getFieldInfos();

const medical_schema = new Schema(schema_field_infos, { strict: false });

medical_schema.statics.findAll = function () {
  return this.find({});
};

const medical_model = mongoose.model( 'medical', medical_schema );

export const MedicalModel = medical_model;
export const MedicalField = getFieldInfos;
