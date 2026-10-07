import { Schema, model } from 'mongoose';
import { ROLES } from '../config/constants.js';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'student',
    },
    college: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    degree: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    branch: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    targetCareerId: {
      type: Schema.Types.ObjectId,
      ref: 'Career',
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    llmSettings: {
      provider: {
        type: String,
        enum: ['openrouter'],
        default: 'openrouter',
      },
      model: {
        type: String,
        maxlength: 120,
      },
      apiKeyEnc: {
        type: {
          iv: String,
          tag: String,
          ciphertext: String,
        },
        select: false,
        _id: false,
      },
      apiKeyLast4: {
        type: String,
        maxlength: 4,
      },
    },
    serverKeyUsage: {
      date: {
        type: String,
      },
      count: {
        type: Number,
        default: 0,
      },
      _id: false,
    },
    lastLoginAt: {
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
        delete ret.passwordHash;
        if (ret.llmSettings) {
          delete ret.llmSettings.apiKeyEnc;
        }
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1 });
userSchema.index({ targetCareerId: 1 });

export const User = model('User', userSchema);
export default User;
