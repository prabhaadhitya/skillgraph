/**
 * Formats a user document into the public user shape defined in docs/API.md §1.4.
 * TargetCareer is formatted as { id, slug, name } or null.
 *
 * @param {Object} userDoc - Mongoose document or plain object
 * @returns {Object} Clean user object
 */
export const formatUser = (userDoc) => {
  if (!userDoc) return null;

  const user = typeof userDoc.toJSON === 'function' ? userDoc.toJSON() : { ...userDoc };

  let targetCareer = null;
  const careerRef = userDoc.targetCareerId;

  if (careerRef && typeof careerRef === 'object' && careerRef.slug) {
    targetCareer = {
      id: (careerRef._id || careerRef.id || '').toString(),
      slug: careerRef.slug,
      name: careerRef.name,
    };
  }

  // Ensure internal targetCareerId is replaced with targetCareer object or null
  delete user.targetCareerId;
  user.targetCareer = targetCareer;

  return user;
};

export default formatUser;
