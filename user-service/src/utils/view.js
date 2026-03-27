export function mapUserToView(user) {
  return {
    email: user.email,
    username: user.username,
    access_role: user.access_role,
    preferred_language: user.preferred_language,
    topics_of_interest: user.topics_of_interest,
    created_at: user.created_at,
  };
}
