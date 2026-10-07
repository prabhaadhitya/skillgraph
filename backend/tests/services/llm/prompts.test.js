import { describe, it, expect } from 'vitest';
import {
  buildIntentMessages,
  buildComposeMessages,
} from '../../../src/services/llm/prompts.js';

describe('services/llm/prompts', () => {
  const catalog = {
    skills: [{ slug: 'sql' }, { slug: 'python' }],
    careers: [{ slug: 'data-scientist' }],
  };

  describe('buildIntentMessages', () => {
    it('wraps student message in <student_message> tags and enforces 500 character limit', () => {
      const longMessage = 'A'.repeat(700);
      const messages = buildIntentMessages({ message: longMessage, catalog });

      expect(messages).toHaveLength(2); // system + user
      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage).toBeDefined();
      expect(userMessage.content).toMatch(/^<student_message>A{500}<\/student_message>$/);
      expect(userMessage.content.length).toBe(500 + '<student_message></student_message>'.length);
    });

    it('does not leak facts into intent prompt', () => {
      const messages = buildIntentMessages({
        message: 'Why SQL?',
        catalog,
      });

      const systemMessage = messages.find((m) => m.role === 'system');
      expect(systemMessage.content).not.toContain('FACTS:');
      expect(systemMessage.content).toContain('untrusted data');
      expect(systemMessage.content).toContain('sql');
      expect(systemMessage.content).toContain('data-scientist');
    });

    it('limits history to last 4 messages, each trimmed to 200 characters', () => {
      const history = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Reply 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Reply 2' },
        { role: 'user', content: 'B'.repeat(350) },
        { role: 'assistant', content: 'Reply 3' },
      ];

      const messages = buildIntentMessages({
        message: 'Current question',
        history,
        catalog,
      });

      // System + 4 history + 1 user = 6 messages
      expect(messages).toHaveLength(6);
      expect(messages[1].content).toBe('Message 2');
      expect(messages[3].content).toBe('B'.repeat(200));
      expect(messages[5].role).toBe('user');
      expect(messages[5].content).toBe('<student_message>Current question</student_message>');
    });
  });

  describe('buildComposeMessages', () => {
    it('includes facts JSON and system constraints in system message', () => {
      const facts = {
        career: { name: 'ML Engineer' },
        fit: { score: 72 },
      };

      const messages = buildComposeMessages({
        intent: 'explain_recommendation',
        facts,
        message: 'How is my alignment?',
      });

      const systemMessage = messages.find((m) => m.role === 'system');
      expect(systemMessage.content).toContain('ML Engineer');
      expect(systemMessage.content).toContain('"score": 72');
      expect(systemMessage.content).toContain('estimated career alignment');
      expect(systemMessage.content).toContain('180 words');

      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage.content).toBe('<student_message>How is my alignment?</student_message>');
    });

    it('enforces 500 character limit on student message', () => {
      const longMessage = 'Z'.repeat(600);
      const messages = buildComposeMessages({
        intent: 'explain_skill',
        facts: {},
        message: longMessage,
      });

      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage.content).toBe(`<student_message>${'Z'.repeat(500)}</student_message>`);
    });
  });
});
