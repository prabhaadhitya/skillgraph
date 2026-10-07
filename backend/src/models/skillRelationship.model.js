import { Schema, model } from 'mongoose';
import { RELATIONSHIP_TYPES } from '../config/constants.js';

const skillRelationshipSchema = new Schema(
  {
    sourceSkillId: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    targetSkillId: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    relationshipType: {
      type: String,
      required: true,
      enum: RELATIONSHIP_TYPES,
    },
    strength: {
      type: Number,
      default: 1,
      min: 0,
      max: 1,
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

skillRelationshipSchema.index(
  { sourceSkillId: 1, targetSkillId: 1, relationshipType: 1 },
  { unique: true },
);
skillRelationshipSchema.index({ targetSkillId: 1 });

export const SkillRelationship = model('SkillRelationship', skillRelationshipSchema);
export default SkillRelationship;
