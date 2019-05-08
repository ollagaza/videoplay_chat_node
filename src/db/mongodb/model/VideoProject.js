import mongoose from 'mongoose';
const Schema = mongoose.Schema;
import { autoIncrement } from 'mongoose-plugin-autoinc';

const VideoProjectSchema = new Schema({
  member_seq: { type: Number, index: true },
  content_id: { type: String, index: true },
  operation_seq_list: Array,
  project_name: String,
  project_path: String,
  video_file_name: String,
  smil_file_name: String,
  total_time: Number,
  total_size: { type: Number, default: 0 },
  status: { type: String, default: 'N' },
  progress: { type: Number, default: 0 },
  created_date: { type: Date, default: Date.now },
  modify_date: { type: Date, default: Date.now },
  sequence_list: Array
});

VideoProjectSchema.plugin( autoIncrement, { model: 'VideoProject', startAt: 1, incrementBy: 1 } );
VideoProjectSchema.indexes();
VideoProjectSchema.index( { member_seq: 1, operation_seq_list: 1 } );
VideoProjectSchema.index( { member_seq: 1, status: 1 } );

VideoProjectSchema.statics.createVideoProject = function( member_seq, operation_seq_list, content_id, project_name, project_path, total_time, sequence_list ) {
  const model = new this();
  model.member_seq = member_seq;
  model.operation_seq_list = operation_seq_list;
  model.content_id = content_id;
  model.project_name = project_name;
  model.project_path = project_path;
  model.total_time = total_time;
  model.sequence_list = sequence_list;

  return model.save();
};

VideoProjectSchema.statics.updateFromEditor = function( id, operation_seq_list, project_name, total_time, sequence_list ) {
  const update = {
    operation_seq_list,
    project_name,
    total_time,
    sequence_list,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

VideoProjectSchema.statics.updateStatus = function( id, status ) {
  const update = {
    status,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

VideoProjectSchema.statics.updateProgress = function( id, progress ) {
  const update = {
    progress,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

VideoProjectSchema.statics.findOneById = function( id ) {
  return this.findById( id );
};

VideoProjectSchema.statics.findOneByContentId = function( content_id ) {
  return this.findOne( { content_id: content_id } );
};

VideoProjectSchema.statics.findByMemberSeq = function( member_seq ) {
  return this.find( { member_seq: member_seq } );
};

VideoProjectSchema.statics.findByOperationSeq = function( member_seq, operation_seq_list ) {
  return this.find( { member_seq: member_seq, operation_seq_list: { "$in": operation_seq_list } } );
};

VideoProjectSchema.statics.deleteById = function( id ) {
  return this.findByIdAndDelete( id );
};

module.exports = mongoose.model( 'VideoProject', VideoProjectSchema );
