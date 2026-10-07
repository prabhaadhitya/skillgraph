import { Schema, model } from 'mongoose';
import { CATEGORY_SLUGS } from '../config/constants.js';

const skillSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-z0-9]+(-[a-z0-9]+)*$/,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 300,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORY_SLUGS,
    },
    difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

skillSchema.index({ category: 1 });
skillSchema.index({ name: 'text', description: 'text' });

export const Skill = model('Skill', skillSchema);
export default Skill;
