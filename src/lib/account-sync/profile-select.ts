/** Columns loaded for the signed-in user's own `profiles` row (includes email). */
export const OWN_PROFILE_SELECT =
  "id, email, public_handle, full_name, avatar_text, avatar_image_url, bio, city, profile_style, favorite_movie_id, favorite_movie_title, favorite_movie_year, favorite_movie_poster_url, favorite_movie_media_type, profile_header_movie_id, profile_header_movie_title, profile_header_movie_year, profile_header_poster_url, profile_header_media_type";

/** Peer / linked profile fields — never includes email. */
export const PEER_PROFILE_SELECT =
  "id, public_handle, full_name, avatar_text, avatar_image_url, bio, city, profile_style, favorite_movie_id, favorite_movie_title, favorite_movie_year, favorite_movie_poster_url, favorite_movie_media_type, profile_header_movie_id, profile_header_movie_title, profile_header_movie_year, profile_header_poster_url, profile_header_media_type";
