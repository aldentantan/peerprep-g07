export function mapUserToView(user) {
  return {
    email: user.email,
    username: user.username,
    access_role: user.access_role,
    profile_image_url: user.profile_image_url,
    created_at: user.created_at,
  };
}
