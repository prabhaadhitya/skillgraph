import { Schema, model } from 'mongoose';

const alignmentSnapshotSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    careerId: {
      type: Schema.Types.ObjectId,
      ref: 'Career',
      required: true,
    },
    fitScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    coverage: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    readiness: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    trigger: {
      type: String,
      required: true,
      enum: ['onboarding', 'skills_update', 'target_change'],
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

alignmentSnapshotSchema.index({ userId: 1, careerId: 1, createdAt: -1 });

export const AlignmentSnapshot = model('AlignmentSnapshot', alignmentSnapshotSchema);
export default AlignmentSnapshot;
