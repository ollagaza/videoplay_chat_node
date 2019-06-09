import util from '@/utils/baseutil';
import EmbedModel from './EmbedModel';
import EmbedBackgroundColorModel from './EmbedBackgroundColorModel';
import logger from "@/classes/Logger";

export default class SequenceModel {
  constructor(type = null) {
    this._id = util.getRandomId();
    this._type = type;
    this._duration = 0;
    this._virtualStartTime = 0;
    this._virtualEndTime = 0;
    this._embeddings = [];
    this._backGroundColor = new EmbedBackgroundColorModel();
    this._backGroundColor.isUse = true;
    this._templateName = null;
    this._operation_seq_list = [];
  }

  get id() {
    return this._id;
  }

  init = (json) => {
    if (util.isEmpty(json)) {
      return this;
    }
    this._type = json.type;
    this._duration = parseFloat(json.duration || 3);
    this._virtualStartTime = parseFloat(json.virtualStartTime || 0);
    this._virtualEndTime = parseFloat(json.virtualEndTime || 0);
    this._templateName = json.templateName;
    this._operation_seq_list = json.operation_seq_list || [];

    if (json.embeddings && json.embeddings.length) {
      for (let i = 0; i < json.embeddings.length; i++) {
        const data = json.embeddings[i];
        const embed_model = new EmbedModel(data.type);
        embed_model.init(data);
        this._embeddings.push(embed_model);
      }
    }
    this._backGroundColor.init(json.backGroundColor);

    return this;
  };

  get type() {
    return this._type;
  }

  get backGroundColor() {
    return this._backGroundColor;
  }
  set backGroundColor(value) {
    this._backGroundColor = value;
  }

  get duration() {
    return this._duration;
  }
  set duration(value) {
    this._duration = value;
  }

  get virtualStartTime() {
    return this._virtualStartTime;
  }
  set virtualStartTime(value) {
    this._virtualStartTime = value;
  }

  get virtualEndTime() {
    return this._virtualEndTime;
  }
  set virtualEndTime(value) {
    this._virtualEndTime = value;
  }

  get embeddings() {
    return this._embeddings;
  }
  set embeddings(value) {
    this._embeddings = value;
  }

  get templateName() {
    return this._templateName;
  }
  set templateName(value) {
    this._templateName = value;
  }

  get operation_seq_list() {
    return this._operation_seq_list;
  }

  set operation_seq_list(value) {
    this._operation_seq_list = value;
  }

  getEmbedding = index => this._embeddings[index];

  addEmbedding = (embedding) => {
    this._embeddings.push(embedding);
  };

  removeEmbedding = (index) => {
    this._embeddings.splice(index, 1);
  };

  toJSON = () => {
    const json = {};
    json.type = this._type;
    json.duration = this._duration;
    json.virtualStartTime = this._virtualStartTime;
    json.virtualEndTime = this._virtualEndTime;
    if (this._backGroundColor.isUse) {
      json.backGroundColor = this._backGroundColor.toJSON();
    }
    const embeddings = [];
    for (let i = 0; i < this._embeddings.length; i++) {
      const embed = this._embeddings[i];
      if (embed.isUse && !util.isEmpty(embed.src)) {
        embeddings.push(embed.toJSON());
      }
    }
    json.embeddings = embeddings;
    json.templateName = this._templateName;
    json.operation_seq_list = this._operation_seq_list;
    json.id = this._id;
    return json;
  };

  getXmlJson = async (index, scale = 1, file_path) => {
    const json = {
      "Index": index,
      "Type": this._type,
      "Duration": this._duration,
      "VirtualStartTime": this._virtualStartTime,
      "VirtualEndTime": this._virtualEndTime
    };
    if (this._backGroundColor.isUse) json.BackGround = this._backGroundColor.getXmlJson();

    const embeddings = [];
    for (let i = 0; i < this._embeddings.length; i++) {
      const embed = this._embeddings[i];
      if (embed.isUse && !util.isEmpty(embed.src)) {
        embeddings.push(await embed.getXmlJson(scale, file_path));
      } else {
        logger.debug('embed empty', embed.toJSON());
      }
    }
    json.Embedding = embeddings;

    return json;
  };
}