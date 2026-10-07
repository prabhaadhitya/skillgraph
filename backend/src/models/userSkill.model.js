import { Schema, model } from 'mongoose';

const userSkillSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skillId: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    proficiency: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    source: {
      type: String,
      enum: ['self', 'assessment'],
      default: 'self',
    },
    lastAssessedAt: {
      type: Date,
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

userSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });
userSkillSchema.index({ skillId: 1 });

export const UserSkill = model('UserSkill', userSkillSchema);
export default UserSkill;
