/**
 * Produces standard response envelopes matching docs/API.md section 1.1.
 */
export const respond = {
  /**
   * Produce a 200 OK success response envelope.
   * @param {import('express').Response} res
   * @param {any} [data={}]
   * @param {any} [meta]
   */
  ok(res, data = {}, meta = undefined) {
    const payload = { success: true, data };
    if (meta !== undefined) {
      payload.meta = meta;
    }
    return res.status(200).json(payload);
  },

  /**
   * Produce a 201 Created success response envelope.
   * @param {import('express').Response} res
   * @param {any} [data={}]
   */
  created(res, data = {}) {
    return res.status(201).json({ success: true, data });
  },
};

export default respond;
