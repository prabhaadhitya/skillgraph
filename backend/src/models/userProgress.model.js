import { Schema, model } from 'mongoose';

const userProgressSchema = new Schema(
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
    previousLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    currentLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

userProgressSchema.index({ userId: 1, createdAt: -1 });

export const UserProgress = model('UserProgress', userProgressSchema);
export default UserProgress;
