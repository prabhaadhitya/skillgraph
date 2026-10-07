import { Schema, model } from 'mongoose';

const careerSkillSchema = new Schema(
  {
    careerId: {
      type: Schema.Types.ObjectId,
      ref: 'Career',
      required: true,
    },
    skillId: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    importance: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    requiredLevel: {
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

careerSkillSchema.index({ careerId: 1, skillId: 1 }, { unique: true });

export const CareerSkill = model('CareerSkill', careerSkillSchema);
export default CareerSkill;
