import { Schema, model } from 'mongoose';

const chatMessageSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant'],
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    intent: {
      type: String,
    },
    meta: {
      model: {
        type: String,
      },
      keySource: {
        type: String,
        enum: ['user', 'server', 'none'],
      },
      degraded: {
        type: Boolean,
        default: false,
      },
      _id: false,
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

// TTL index on createdAt: automatically expires after 30 days (2,592,000 seconds)
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });

export const ChatMessage = model('ChatMessage', chatMessageSchema);
export default ChatMessage;
